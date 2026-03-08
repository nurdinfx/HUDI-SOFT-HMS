const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { authenticate, logAction } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

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

    try {
        await db.exec('BEGIN');

        // 1. Calculate totals
        let subtotal = 0;
        for (const item of items) {
            subtotal += (item.unitPrice * item.quantity);
        }

        const settings = await db.prepare('SELECT tax_rate FROM hospital_settings WHERE id = 1').get();
        const taxRate = settings ? settings.tax_rate : 10;
        const disc = parseFloat(discount) || 0;
        const tax = subtotal * (taxRate / 100);
        const total = Math.max(0, subtotal + tax - disc);
        const paidAmount = (amountPaid !== undefined && amountPaid !== null && !isNaN(parseFloat(amountPaid)))
            ? parseFloat(amountPaid)
            : total;

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
        const invCountData = await db.prepare('SELECT COUNT(*) as c FROM invoices').get();
        const invoiceUID = `INV-POS-${String(parseInt(invCountData.c) + 1).padStart(5, '0')}`;
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

            // Stock management for medicines
            if (item.type === 'medicine') {
                const med = await db.prepare('SELECT quantity, reorder_level FROM medicines WHERE id = ?').get(item.id.split('-')[0]);
                if (med) {
                    const newQty = Math.max(0, med.quantity - item.quantity);
                    const newStatus = newQty === 0 ? 'out-of-stock' : newQty <= med.reorder_level ? 'low-stock' : 'in-stock';
                    await db.prepare('UPDATE medicines SET quantity = ?, status = ? WHERE id = ?')
                        .run(newQty, newStatus, item.id.split('-')[0]);
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

        // 6. Account entry for payment
        if (paidAmount > 0) {
            await db.prepare(`
                INSERT INTO account_entries (id, date, type, category, description, amount, payment_method, reference_id, department, status, user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                uuidv4(), today, 'income', 'POS Checkout',
                `POS Payment for ${invoiceUID} (${actualPatientName})`,
                paidAmount, paymentMethod || 'cash', invoiceUID, 'Billing', 'completed', req.user.id
            );
        }

        await db.exec('COMMIT');

        logAction(req.user.id, req.user.name, req.user.role, 'CREATE', 'POS', `POS Checkout: ${invoiceUID}`, req.ip);

        res.status(201).json({
            id: invoiceDbId,
            invoiceId: invoiceUID,
            patientName: actualPatientName,
            total,
            paidAmount,
            status: invoiceStatus
        });

    } catch (err) {
        await db.exec('ROLLBACK');
        console.error('POS Checkout Error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
