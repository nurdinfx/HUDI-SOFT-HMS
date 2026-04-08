const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { authenticate, logAction, authorize } = require('../middleware/auth');
const { recordGranularPayment } = require('../utils/finance');

const router = express.Router();
router.use(authenticate);
router.use(authorize(['receptionist', 'admin', 'doctor']));

// GET /api/pos/pending/:patientId
router.get('/pending/:patientId', async (req, res) => {
    try {
        const patientId = req.params.patientId;

        // 1. Get unpaid invoices
        const unpaidInvoices = await db.prepare(`
            SELECT * FROM invoices 
            WHERE patient_id = ? AND status IN ('unpaid', 'partial')
            ORDER BY date DESC
        `).all(patientId);

        // 2. Get pending prescriptions (that don't have an invoice yet)
        const pendingRxs = await db.prepare(`
            SELECT * FROM prescriptions 
            WHERE patient_id = ? AND status = 'pending'
            ORDER BY date DESC
        `).all(patientId);

        // 3. Get ordered lab tests (that might not be in an invoice yet, though usually are)
        const pendingLabs = await db.prepare(`
            SELECT * FROM lab_tests 
            WHERE patient_id = ? AND status = 'ordered' AND (is_billed = 0 OR is_billed IS NULL)
            ORDER BY ordered_at DESC
        `).all(patientId);

        // 4. Get pending OPD visits (Consultation Fees)
        const pendingVisits = await db.prepare(`
            SELECT v.*, d.consultation_fee 
            FROM opd_visits v
            LEFT JOIN doctors d ON v.doctor_id = d.id
            WHERE v.patient_id = ? AND (v.is_billed = 0 OR v.is_billed IS NULL)
            ORDER BY v.created_at DESC
        `).all(patientId);

        // Fetch current medicine prices for prescriptions
        const allMeds = await db.prepare('SELECT id, name, selling_price FROM medicines').all();
        const medPriceMap = {};
        if (allMeds && Array.isArray(allMeds)) {
            allMeds.forEach(m => {
                // simple name match or exact match if possible
                medPriceMap[m.name.toLowerCase()] = m.selling_price;
            });
        }


        // Format items for POS cart
        const items = [];

        // Process invoices
        unpaidInvoices.forEach(inv => {
            const invItems = JSON.parse(inv.items || '[]');
            invItems.forEach(item => {
                items.push({
                    id: item.id || inv.id,
                    invoiceId: inv.id,
                    invoiceNumber: inv.invoice_id,
                    name: item.description || item.name,
                    type: item.category === 'Pharmacy' ? 'medicine' : item.category === 'Laboratory' ? 'lab' : 'service',
                    category: item.category,
                    unitPrice: item.unitPrice,
                    quantity: item.quantity,
                    total: item.total,
                    isFromInvoice: true,
                    originalInvoiceId: inv.id
                });
            });
        });

        // Process prescriptions
        pendingRxs.forEach(rx => {
            const rxMeds = JSON.parse(rx.medicines || '[]');
            rxMeds.forEach((med, idx) => {
                let unitPrice = med.unitPrice || 0;
                if (!unitPrice && med.medicineName) {
                    unitPrice = medPriceMap[med.medicineName.toLowerCase()] || 0;
                }
                items.push({
                    id: `${rx.id}-${idx}`,
                    prescriptionId: rx.id,
                    name: med.medicineName,
                    type: 'medicine',
                    category: 'Pharmacy',
                    unitPrice: unitPrice,
                    quantity: parseInt(med.quantity) || 1,
                    total: unitPrice * (parseInt(med.quantity) || 1),
                    isFromPrescription: true,
                    dosage: med.dosage,
                    duration: med.duration
                });
            });
        });

        // Process labs
        pendingLabs.forEach(lab => {
            items.push({
                id: lab.id,
                labTestId: lab.id,
                name: lab.test_name,
                type: 'lab',
                category: 'Laboratory',
                unitPrice: lab.cost,
                quantity: 1,
                total: lab.cost,
                isFromLab: true
            });
        });

        // Process visits
        pendingVisits.forEach(visit => {
            const fee = parseFloat(visit.consultation_fee) || 0;
            if (fee > 0) {
                items.push({
                    id: visit.id,
                    visitId: visit.id,
                    name: `Consultation: Dr. ${visit.doctor_name || 'Unknown'} - ${visit.department || 'General'}`,
                    type: 'service',
                    category: 'Consultation',
                    unitPrice: fee,
                    quantity: 1,
                    total: fee,
                    isFromVisit: true
                });
            }
        });

        res.json({ items });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/pos/history/:patientId
router.get('/history/:patientId', async (req, res) => {
    try {
        const patientId = req.params.patientId;
        const invoices = await db.prepare(`
            SELECT * FROM invoices 
            WHERE patient_id = ? 
            ORDER BY date DESC 
            LIMIT 10
        `).all(patientId);

        const prescriptions = await db.prepare(`
            SELECT * FROM prescriptions 
            WHERE patient_id = ? 
            ORDER BY date DESC 
            LIMIT 5
        `).all(patientId);

        const labTests = await db.prepare(`
            SELECT * FROM lab_tests 
            WHERE patient_id = ? 
            ORDER BY ordered_at DESC 
            LIMIT 5
        `).all(patientId);

        res.json({
            invoices: invoices.map(inv => ({ ...inv, items: JSON.parse(inv.items || '[]') })),
            prescriptions: prescriptions.map(rx => ({ ...rx, medicines: JSON.parse(rx.medicines || '[]') })),
            labTests
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/pos/checkout
// Payload: { patientId, patientName, items: [{type, id, name, unitPrice, quantity, ...}], discount, paymentMethod, amountPaid, insuranceInfo, notes }
router.post('/checkout', async (req, res) => {
    const {
        patientId, patientName, items, discount,
        paymentMethod, amountPaid, notes, insuranceInfo
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Cart is empty' });
    }

    console.log("[DEBUG POS CHECKOUT] Payload received:", JSON.stringify({ patientId, items }, null, 2));

    try {
        await db.exec('BEGIN');

        // 1. Calculate totals
        let subtotal = 0;
        for (const item of items) {
            const up = parseFloat(item.unitPrice) || 0;
            const q = parseFloat(item.quantity) || 0;
            subtotal += (up * q);
        }

        const disc = parseFloat(discount) || 0;
        const tax = 0; // Tax removed as requested
        const total = Math.max(0, subtotal + tax - disc);
        
        let paidAmount = 0;
        if (paymentMethod !== 'credit' && paymentMethod !== 'employee_credit') {
            paidAmount = (amountPaid !== undefined && amountPaid !== null && !isNaN(parseFloat(amountPaid)))
                ? parseFloat(amountPaid)
                : total;
        }

        // 2. Resolve Patient Information
        let actualPatientId = patientId || null;
        let actualPatientName = patientName || 'Walk-In Patient';

        if (actualPatientId) {
            const p = await db.prepare('SELECT first_name, last_name FROM patients WHERE id = ?').get(actualPatientId);
            if (p) actualPatientName = `${p.first_name} ${p.last_name}`;
        }

        const invoiceItems = [];
        const today = new Date().toISOString().split('T')[0];

        // Prepare Invoice Record
        // Prepare Invoice Record with random suffix to prevent collisions during high concurrency
        const maxInvData = await db.prepare("SELECT invoice_id FROM invoices WHERE invoice_id LIKE 'INV-POS-%' ORDER BY LENGTH(invoice_id) DESC, invoice_id DESC LIMIT 1").get();
        let nextNumber = 1;
        if (maxInvData && maxInvData.invoice_id) {
            const parts = maxInvData.invoice_id.split('-');
            // Support formats like INV-POS-00001 or INV-POS-00001-ABCD
            const lastPart = parts[parts.length - 1].length === 4 ? parts[parts.length - 2] : parts[parts.length - 1];
            const lastNumber = parseInt(lastPart);
            if (!isNaN(lastNumber)) nextNumber = lastNumber + 1;
        }
        
        // Add a 4-character random suffix to guarantee uniqueness even if two requests hit at once
        const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
        const invoiceUID = `INV-POS-${String(nextNumber).padStart(5, '0')}-${randomSuffix}`;
        const invoiceDbId = uuidv4();

        // 3. Process each item and update linked modules
        for (const item of items) {
            // Update Prescription status if applicable
            if (item.prescriptionId) {
                await db.prepare('UPDATE prescriptions SET status = ?, is_billed = 1, invoice_id = ? WHERE id = ?')
                    .run('dispensed', invoiceDbId, item.prescriptionId);
            }

            // Update Lab Test status if applicable
            if (item.labTestId) {
                await db.prepare('UPDATE lab_tests SET status = ?, is_billed = 1, invoice_id = ? WHERE id = ?')
                    .run('sample-collected', invoiceDbId, item.labTestId);
            }

            // Update OPD Visit status if applicable
            if (item.visitId) {
                await db.prepare('UPDATE opd_visits SET is_billed = 1, invoice_id = ? WHERE id = ?')
                    .run(invoiceDbId, item.visitId);
            }

            // Update existing Invoice if applicable
            if (item.originalInvoiceId) {
                // We'll mark the old invoice as 'transferred' or similar, 
                // but for simplicity here we just proceed to create the new master invoice.
                // In a real system, you'd probably link them.
            }

            // Stock management for medicines (FIFO Batch Deduction)
            if (item.type === 'medicine') {
                const medicineIdToUpdate = item.medicineId ? item.medicineId : (item.isFromPrescription || item.prescriptionId ? null : item.id);
                if (medicineIdToUpdate) {
                    let remainingToDeduct = item.quantity;
                    
                    // 1. Get batches for this medicine, ordered by expiry (FIFO)
                    const batches = await db.prepare('SELECT * FROM pharmacy_batches WHERE medicine_id = ? AND quantity_remaining > 0 AND status != \'expired\' ORDER BY expiry_date ASC').all(medicineIdToUpdate);
                    
                    for (const batch of batches) {
                        if (remainingToDeduct === 0) break;
                        
                        const deduct = Math.min(batch.quantity_remaining, remainingToDeduct);
                        await db.prepare('UPDATE pharmacy_batches SET quantity_remaining = quantity_remaining - ? WHERE id = ?').run(deduct, batch.id);
                        remainingToDeduct -= deduct;
                    }

                    // 2. Update Medicine Total Stock
                    const med = await db.prepare('SELECT quantity, reorder_level FROM medicines WHERE id = ?').get(medicineIdToUpdate);
                    if (med) {
                        const newQty = Math.max(0, med.quantity - item.quantity);
                        const newStatus = newQty === 0 ? 'out-of-stock' : newQty <= med.reorder_level ? 'low-stock' : 'in-stock';
                        await db.prepare('UPDATE medicines SET quantity = ?, status = ? WHERE id = ?')
                            .run(newQty, newStatus, medicineIdToUpdate);
                    }
                }
            }

            invoiceItems.push({
                id: item.id,
                description: item.name,
                category: item.category || 'Service',
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                total: item.unitPrice * item.quantity
            });
        }

        // 4. Create master Invoice
        let invoiceStatus = 'unpaid';
        if (paidAmount >= total) invoiceStatus = 'paid';
        else if (paidAmount > 0) invoiceStatus = 'partial';

        await db.prepare(`INSERT INTO invoices (id, invoice_id, patient_id, patient_name, date, due_date, items, subtotal, tax, discount, total, paid_amount, status, payment_method, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(
                invoiceDbId, invoiceUID, actualPatientId, actualPatientName,
                today, today, JSON.stringify(invoiceItems), subtotal, tax, disc,
                total, paidAmount, invoiceStatus, paymentMethod || 'cash',
                notes || 'POS Transaction'
            );

        // 5. Handle Insurance Claim
        if (insuranceInfo && actualPatientId) {
            const claimId = `CLM-${uuidv4().slice(0, 8).toUpperCase()}`;
            await db.prepare(`INSERT INTO insurance_claims (id, claim_id, patient_id, patient_name, insurance_company, policy_number, invoice_id, claim_amount, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
                .run(
                    uuidv4(), claimId, actualPatientId, actualPatientName,
                    insuranceInfo.company, insuranceInfo.policyNumber, invoiceDbId,
                    insuranceInfo.claimAmount, 'submitted'
                );
        }

        // 6. Account entry for payment (only if not credit or employee_credit)
        if (paidAmount > 0 && paymentMethod !== 'credit' && paymentMethod !== 'employee_credit') {
            await recordGranularPayment({
                invoiceId: invoiceUID,
                dbInvoiceId: invoiceDbId,
                patientName: actualPatientName,
                paymentAmount: paidAmount,
                paymentMethod: paymentMethod || 'cash',
                userId: req.user.id
            });
        }

        // 7. Handle Credit Transaction
        if (paymentMethod === 'credit') {
            const { creditCustomerId } = req.body;
            if (!creditCustomerId) {
                throw new Error('Credit Customer ID is required for credit transactions');
            }

            const customer = await db.prepare('SELECT * FROM credit_customers WHERE id = ?').get(creditCustomerId);
            if (!customer) throw new Error('Credit Customer not found');

            const transactionId = uuidv4();
            const transactionUID = `CR-TXN-${uuidv4().slice(0, 8).toUpperCase()}`;
            const remainingBalance = total - paidAmount;

            // Record Credit Transaction
            await db.prepare(`
                INSERT INTO credit_transactions (id, transaction_id, customer_id, invoice_id, invoice_number, items_summary, total_amount, amount_paid, remaining_balance, status, staff_id, staff_name)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                transactionId, transactionUID, creditCustomerId, invoiceDbId, invoiceUID,
                invoiceItems.map(i => `${i.quantity}x ${i.description}`).join(', '),
                total, paidAmount, remainingBalance, remainingBalance <= 0 ? 'paid' : 'unpaid',
                req.user.id, req.user.name
            );

            // Update Customer Balance
            const newBalance = parseFloat(customer.outstanding_balance) + remainingBalance;
            const newTotalCredit = parseFloat(customer.total_credit_taken) + total;
            
            await db.prepare(`
                UPDATE credit_customers 
                SET outstanding_balance = ?, total_credit_taken = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).run(newBalance, newTotalCredit, creditCustomerId);

            // Add to Ledger
            await db.prepare(`
                INSERT INTO credit_ledger (id, customer_id, date, description, type, amount, running_balance, reference_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                uuidv4(), creditCustomerId, today, `POS Credit Purchase: ${invoiceUID}`,
                'debit', total, newBalance, transactionUID
            );
        }

        // 8. Handle Employee Credit Transaction
        if (paymentMethod === 'employee_credit') {
            const { creditCustomerId } = req.body; // reusing creditCustomerId field
            if (!creditCustomerId) {
                throw new Error('Employee ID is required for employee credit transactions');
            }

            const employee = await db.prepare('SELECT * FROM employees WHERE id = ?').get(creditCustomerId);
            if (!employee) throw new Error('Employee not found');

            const remainingBalance = total - paidAmount;

            // 1. Log an advance in employee_expenses
            const expenseId = uuidv4();
            await db.prepare(`
                INSERT INTO employee_expenses (id, employee_id, type, amount, date, notes, status, recorded_by)
                VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
            `).run(expenseId, creditCustomerId, 'advance', remainingBalance, today, `POS Purchase: ${invoiceUID}`, req.user.id);

            // 2. Update employee's outstanding_balance
            const newBalance = parseFloat(employee.outstanding_balance || 0) + remainingBalance;
            await db.prepare(`
                UPDATE employees 
                SET outstanding_balance = ? 
                WHERE id = ?
            `).run(newBalance, creditCustomerId);

            // 3. Insert into employee_ledger
            await db.prepare(`
                INSERT INTO employee_ledger (id, employee_id, date, description, type, amount, reference_id)
                VALUES (?, ?, ?, ?, 'debit', ?, ?)
            `).run(uuidv4(), creditCustomerId, today, `POS Purchase: ${invoiceUID}`, remainingBalance, expenseId);
        }

        await db.exec('COMMIT');

        logAction(req.user.id, req.user.name, req.user.role, 'CREATE', 'POS', `POS Checkout: ${invoiceUID}`, req.ip);

        res.status(201).json({
            status: invoiceStatus,
            items: invoiceItems,
            userName: req.user.name
        });

    } catch (err) {
        await db.exec('ROLLBACK');
        console.error('POS Checkout Error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
