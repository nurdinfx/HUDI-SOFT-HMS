const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { authenticate, logAction, authorize } = require('../middleware/auth');
const { sendPushNotification } = require('../utils/push-notify');
const { recordGranularPayment } = require('../utils/finance');

const router = express.Router();
router.use(authenticate);
router.use(authorize(['pharmacist', 'admin']));

// â”€â”€ Table Initialization â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function initTables() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS medicine_categories (
                id UUID PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        await db.query(`
            CREATE TABLE IF NOT EXISTS pharmacy_transactions (
                id UUID PRIMARY KEY,
                invoice_id TEXT UNIQUE NOT NULL,
                patient_id UUID,
                patient_name TEXT,
                total_amount DECIMAL(15,2) DEFAULT 0,
                paid_amount DECIMAL(15,2) DEFAULT 0,
                credit_amount DECIMAL(15,2) DEFAULT 0,
                payment_method TEXT,
                status TEXT,
                created_by TEXT,
                items_summary TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        try { await db.query('ALTER TABLE pharmacy_transactions ADD COLUMN items_summary TEXT'); } catch (e) {}

        await db.query(`
            CREATE TABLE IF NOT EXISTS pharmacy_transaction_items (
                id UUID PRIMARY KEY,
                transaction_id UUID REFERENCES pharmacy_transactions(id),
                medicine_id UUID,
                medicine_name TEXT,
                quantity INTEGER,
                unit_price DECIMAL(15,2),
                total_price DECIMAL(15,2)
            )
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS patient_credits (
                id UUID PRIMARY KEY,
                patient_id UUID UNIQUE,
                balance DECIMAL(15,2) DEFAULT 0,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS pharmacy_returns (
                id UUID PRIMARY KEY,
                transaction_id UUID REFERENCES pharmacy_transactions(id),
                item_id UUID REFERENCES pharmacy_transaction_items(id),
                quantity INTEGER,
                amount DECIMAL(15,2),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Seed initial categories if none exist
        const countRes = await db.query('SELECT COUNT(*) as count FROM medicine_categories');
        if (parseInt(countRes.rows[0].count) === 0) {
            const defaults = ['Tablet', 'Syrup', 'Injection', 'Ointment', 'Capsule'];
            for (const name of defaults) {
                await db.prepare('INSERT INTO medicine_categories (id, name) VALUES (?, ?)').run(uuidv4(), name);
            }
        }
    } catch (err) {
        console.error('âŒ Pharmacy Table Init Error:', err.message);
    }
}
initTables();

// â”€â”€ Transactions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/transactions', async (req, res) => {
    const { patientId, status, paymentMethod, startDate, endDate } = req.query;
    let q = 'SELECT * FROM pharmacy_transactions WHERE 1=1';
    const params = [];

    if (patientId) { q += ' AND patient_id = ?'; params.push(patientId); }
    if (status) { q += ' AND status = ?'; params.push(status); }
    if (paymentMethod) { q += ' AND payment_method = ?'; params.push(paymentMethod); }
    if (startDate) { q += ' AND DATE(created_at) >= ?'; params.push(startDate); }
    if (endDate) { q += ' AND DATE(created_at) <= ?'; params.push(endDate); }

    q += ' ORDER BY created_at DESC';

    try {
        const rows = await db.prepare(q).all(...params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/transactions/:id/items', async (req, res) => {
    try {
        const items = await db.prepare('SELECT * FROM pharmacy_transaction_items WHERE transaction_id = ?').all(req.params.id);
        res.json(items);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/transactions', async (req, res) => {
    const { 
        patientId, patientName, items, totalAmount, 
        paidAmount, paymentMethod, status, appliedCredit,
        notes, creditCustomerId 
    } = req.body;
    
    try {
        const txId = uuidv4();
        const maxInvData = await db.prepare("SELECT invoice_id FROM pharmacy_transactions ORDER BY LENGTH(invoice_id) DESC, invoice_id DESC LIMIT 1").get();
        let nextInvNumber = 1;
        if (maxInvData && maxInvData.invoice_id) {
            const parts = maxInvData.invoice_id.split('-');
            const lastPart = parts[parts.length - 1].length === 4 ? parts[parts.length - 2] : parts[parts.length - 1];
            const lastNumber = parseInt(lastPart);
            if (!isNaN(lastNumber)) nextInvNumber = lastNumber + 1;
        }
        const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
        const invoiceId = `PHARM-INV-${String(nextInvNumber).padStart(4, '0')}-${randomSuffix}`;
        
        await db.run('BEGIN TRANSACTION');

        const safeAppliedCredit = appliedCredit ? parseFloat(appliedCredit) : 0;
        const totalToReconcile = totalAmount - safeAppliedCredit;
        // if paymentMethod is 'credit', paidAmount might be 0 or partial.
        const creditAmount = paymentMethod === 'credit' ? (totalToReconcile - (parseFloat(paidAmount) || 0)) : (totalAmount - (parseFloat(paidAmount) || 0) - safeAppliedCredit);
        const itemsSummary = items.map(i => `${i.medicineName || i.name} (x${i.quantity})`).join(', ');

        // Insert Transaction
        await db.prepare(`INSERT INTO pharmacy_transactions 
            (id, invoice_id, patient_id, patient_name, total_amount, paid_amount, credit_amount, payment_method, status, created_by, items_summary)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(txId, invoiceId, patientId || null, patientName, totalAmount, (parseFloat(paidAmount) || 0) + safeAppliedCredit, Math.max(0, creditAmount), paymentMethod, status || 'Completed', req.user.name, itemsSummary);

        const isValidUUID = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

        // Insert Items & Update Stock/Linked Records
        for (const item of items) {
            const itemId = uuidv4();
            const resolvedMedId = item.medicineId || item.id;
            const finalMedId = isValidUUID(resolvedMedId) ? resolvedMedId : null;

            await db.prepare(`INSERT INTO pharmacy_transaction_items 
                (id, transaction_id, medicine_id, medicine_name, quantity, unit_price, total_price)
                VALUES (?, ?, ?, ?, ?, ?, ?)`)
                .run(itemId, txId, finalMedId, item.medicineName || item.name, item.quantity, item.unitPrice, item.totalPrice || (item.unitPrice * item.quantity));

            // 1. Linked Prescription Update
            if (item.prescriptionId) {
                await db.prepare('UPDATE prescriptions SET status = ?, is_billed = 1, invoice_id = ? WHERE id = ?')
                    .run('dispensed', txId, item.prescriptionId);
            }

            // 2. Linked Lab Test Update
            if (item.labTestId) {
                await db.prepare('UPDATE lab_tests SET status = ?, is_billed = 1, invoice_id = ? WHERE id = ?')
                    .run('sample-collected', txId, item.labTestId);
            }

            // 3. Linked OPD Visit Update
            if (item.visitId) {
                await db.prepare('UPDATE opd_visits SET is_billed = 1, invoice_id = ? WHERE id = ?')
                    .run(txId, item.visitId);
            }

            // 4. Stock Check & Update (only for medicines)
            if (item.type === 'medicine' || (!item.type && finalMedId)) {
                if (finalMedId) {
                    const med = await db.prepare('SELECT quantity, reorder_level FROM medicines WHERE id = ?').get(finalMedId);
                
                if (med) {
                    if (med.quantity < item.quantity) {
                        throw new Error(`Insufficient stock for ${item.medicineName || item.name}`);
                    }

                    // Deduct from batches
                    let remainingToDeduct = item.quantity;
                    const batches = await db.prepare('SELECT * FROM pharmacy_batches WHERE medicine_id = ? AND quantity_remaining > 0 ORDER BY expiry_date ASC').all(finalMedId);
                    
                    for (const batch of batches) {
                        if (remainingToDeduct === 0) break;
                        const deduct = Math.min(batch.quantity_remaining, remainingToDeduct);
                        await db.prepare('UPDATE pharmacy_batches SET quantity_remaining = quantity_remaining - ? WHERE id = ?').run(deduct, batch.id);
                        remainingToDeduct -= deduct;
                    }

                    // Update overall quantity
                    const newQty = med.quantity - item.quantity;
                    const newStatus = newQty === 0 ? 'out-of-stock' : newQty <= med.reorder_level ? 'low-stock' : 'in-stock';
                    await db.prepare('UPDATE medicines SET quantity = ?, status = ? WHERE id = ?')
                        .run(newQty, newStatus, finalMedId);
                }
            }
        }
    }

        // Handle Credit Module Integration
        if (paymentMethod === 'credit' && creditCustomerId) {
            const customer = await db.prepare('SELECT * FROM credit_customers WHERE id = ?').get(creditCustomerId);
            if (!customer) throw new Error('Credit Customer not found');

            const transactionId = uuidv4();
            const transactionUID = `CR-TXN-${uuidv4().slice(0, 8).toUpperCase()}`;
            const remainingBalance = totalToReconcile - (parseFloat(paidAmount) || 0);

            await db.prepare(`
                INSERT INTO credit_transactions (id, transaction_id, customer_id, invoice_id, invoice_number, items_summary, total_amount, amount_paid, remaining_balance, status, staff_id, staff_name)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                transactionId, transactionUID, creditCustomerId, txId, invoiceId, itemsSummary,
                totalAmount, (parseFloat(paidAmount) || 0), remainingBalance, remainingBalance <= 0 ? 'paid' : 'unpaid',
                req.user.id, req.user.name
            );

            // Update Customer Balance
            const newBalance = parseFloat(customer.outstanding_balance) + remainingBalance;
            const newTotalCredit = parseFloat(customer.total_credit_taken) + totalAmount;
            
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
                uuidv4(), creditCustomerId, new Date().toISOString().split('T')[0], `Pharmacy POS Credit Purchase: ${invoiceId}`,
                'debit', totalAmount, newBalance, transactionUID
            );
        } else if (paymentMethod === 'employee_credit' && creditCustomerId) {
            // Handle Employee Credit Integration
            const employee = await db.prepare('SELECT * FROM employees WHERE id = ?').get(creditCustomerId);
            if (!employee) throw new Error('Employee not found');

            const remainingBalance = totalToReconcile - (parseFloat(paidAmount) || 0);

            // 1. Log an advance in employee_expenses
            const expenseId = uuidv4();
            const today = new Date().toISOString().split('T')[0];
            await db.prepare(`
                INSERT INTO employee_expenses (id, employee_id, type, amount, date, notes, status, recorded_by)
                VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
            `).run(expenseId, creditCustomerId, 'advance', remainingBalance, today, `Pharmacy Purchase: ${invoiceId}`, req.user.id);

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
            `).run(uuidv4(), creditCustomerId, today, `Pharmacy Purchase: ${invoiceId}`, remainingBalance, expenseId);

        } else if (patientId) {
            // Internal Patient Credit Fallback
            if (safeAppliedCredit > 0) {
                await db.prepare('UPDATE patient_credits SET balance = patient_credits.balance - ?, last_updated = CURRENT_TIMESTAMP WHERE patient_id = ?')
                    .run(safeAppliedCredit, patientId);
            }
            if (creditAmount > 0 && paymentMethod !== 'credit' && paymentMethod !== 'employee_credit') {
                await db.prepare(`INSERT INTO patient_credits (id, patient_id, balance) 
                    VALUES (?, ?, ?) 
                    ON CONFLICT(patient_id) DO UPDATE SET balance = patient_credits.balance + ?, last_updated = CURRENT_TIMESTAMP`)
                    .run(uuidv4(), patientId, creditAmount, creditAmount);
            }
        }

        await db.run('COMMIT');
        logAction(req.user.id, req.user.name, req.user.role, 'CREATE', 'Pharmacy', `POS Transaction ${invoiceId} created`, req.ip);

        // Log income to account_entries for departmental revenue report
        if ((parseFloat(paidAmount) || 0) > 0 && paymentMethod !== 'credit') {
            try {
                await recordGranularPayment({
                    invoiceId,
                    dbInvoiceId: txId,
                    patientName,
                    paymentAmount: (parseFloat(paidAmount) || 0) + (appliedCredit ? parseFloat(appliedCredit) : 0),
                    paymentMethod,
                    userId: req.user.id,
                    defaultDept: 'Pharmacy'
                });
            } catch (e) { console.error('Finance logging error:', e.message); }
        }

        sendPushNotification({
            title: 'ðŸ·ï¸ New Pharmacy POS Sale',
            message: `New sale completed by pharmacist: ${invoiceId} for ${patientName || 'Walk-in'}. Total: $${totalAmount}.`,
            url: `/pharmacy/transactions`
        });

        res.status(201).json({ id: txId, invoiceId });
    } catch (err) {
        if (db.inTransaction) await db.run('ROLLBACK');
        res.status(400).json({ error: err.message });
    }
});

router.post('/transactions/:id/return', async (req, res) => {
    const { items, exchangeItems, netAmount, paymentMethod } = req.body; 
    // items: Array of { itemId, quantity, amount }
    // exchangeItems: Array of { medicineId, medicineName, quantity, unitPrice, totalPrice }
    
    try {
        const tx = await db.prepare('SELECT * FROM pharmacy_transactions WHERE id = ?').get(req.params.id);
        if (!tx) return res.status(404).json({ error: 'Transaction not found' });

        await db.run('BEGIN TRANSACTION');

        let totalReturnedAmount = 0;

        // 1. Process Returns
        for (const rItem of items) {
            const item = await db.prepare('SELECT * FROM pharmacy_transaction_items WHERE id = ?').get(rItem.itemId);
            if (!item) throw new Error('Transaction item not found');

            const returnId = uuidv4();
            await db.prepare('INSERT INTO pharmacy_returns (id, transaction_id, item_id, quantity, amount) VALUES (?, ?, ?, ?, ?)')
                .run(returnId, req.params.id, rItem.itemId, rItem.quantity, rItem.amount);

            // Increase Stock (Old Item)
            await db.prepare('UPDATE medicines SET quantity = quantity + ? WHERE id = ?').run(rItem.quantity, item.medicine_id);
            totalReturnedAmount += parseFloat(rItem.amount);
        }

        // 2. Process Exchanges (as a new sale if exchangeItems exist)
        let totalExchangeAmount = 0;
        if (exchangeItems && exchangeItems.length > 0) {
            const exchangeTxId = uuidv4();
            const maxExcData = await db.prepare("SELECT invoice_id FROM pharmacy_transactions WHERE invoice_id LIKE 'PHARM-EXC-%' ORDER BY invoice_id DESC LIMIT 1").get();
            let nextExcNumber = 1;
            if (maxExcData && maxExcData.invoice_id) {
                const lastExcNumber = parseInt(maxExcData.invoice_id.split('-').pop());
                if (!isNaN(lastExcNumber)) nextExcNumber = lastExcNumber + 1;
            }
            const exchangeInvoiceId = `PHARM-EXC-${String(nextExcNumber).padStart(4, '0')}`;
            
            // Calculate total first to insert transaction
            for (const eItem of exchangeItems) {
                totalExchangeAmount += parseFloat(eItem.totalPrice);
            }

            const itemsSummaryText = exchangeItems.map(i => `${i.medicineName} (x${i.quantity})`).join(', ');
            
            // Insert parent transaction FIRST to satisfy FK
            await db.prepare(`INSERT INTO pharmacy_transactions 
                (id, invoice_id, patient_id, patient_name, total_amount, paid_amount, credit_amount, payment_method, status, created_by, items_summary)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
                .run(exchangeTxId, exchangeInvoiceId, tx.patient_id, tx.patient_name, totalExchangeAmount, totalExchangeAmount, 0, paymentMethod || tx.payment_method, 'Exchange', req.user.name, `EXC for ${tx.invoice_id}: ${itemsSummaryText}`);

            for (const eItem of exchangeItems) {
                // Deduct Stock for New Item
                const med = await db.prepare('SELECT quantity, reorder_level FROM medicines WHERE id = ?').get(eItem.medicineId);
                if (!med || med.quantity < eItem.quantity) {
                    throw new Error(`Insufficient stock for exchange item: ${eItem.medicineName}`);
                }

                // Deduct from batches
                let remainingToDeduct = eItem.quantity;
                const batches = await db.prepare('SELECT * FROM pharmacy_batches WHERE medicine_id = ? AND quantity_remaining > 0 ORDER BY expiry_date ASC').all(eItem.medicineId);
                for (const batch of batches) {
                    if (remainingToDeduct === 0) break;
                    const deduct = Math.min(batch.quantity_remaining, remainingToDeduct);
                    await db.prepare('UPDATE pharmacy_batches SET quantity_remaining = quantity_remaining - ? WHERE id = ?').run(deduct, batch.id);
                    remainingToDeduct -= deduct;
                }

                const newQty = med.quantity - eItem.quantity;
                const newStatus = newQty === 0 ? 'out-of-stock' : newQty <= med.reorder_level ? 'low-stock' : 'in-stock';
                await db.prepare('UPDATE medicines SET quantity = ?, status = ? WHERE id = ?').run(newQty, newStatus, eItem.medicineId);

                // Record Exchange Item
                const exchangeItemId = uuidv4();
                await db.prepare(`INSERT INTO pharmacy_transaction_items 
                    (id, transaction_id, medicine_id, medicine_name, quantity, unit_price, total_price)
                    VALUES (?, ?, ?, ?, ?, ?, ?)`)
                    .run(exchangeItemId, exchangeTxId, eItem.medicineId, eItem.medicineName, eItem.quantity, eItem.unitPrice, eItem.totalPrice);
            }
        }

        // 3. Handle Financial Balance Adjustment
        // Net balance change for the patient/system
        const balanceChange = totalReturnedAmount - totalExchangeAmount;
        
        if (tx.patient_id) {
            // If balanceChange > 0, patient gets credit (Return > Exchange)
            // If balanceChange < 0, patient owes money (Exchange > Return) - but usually they'd pay at counter.
            // We'll update the patient_credits balance regardless.
            await db.prepare(`INSERT INTO patient_credits (id, patient_id, balance) 
                VALUES (?, ?, ?) 
                ON CONFLICT(patient_id) DO UPDATE SET balance = patient_credits.balance + ?, last_updated = CURRENT_TIMESTAMP`)
                .run(uuidv4(), tx.patient_id, balanceChange, balanceChange);
        }

        await db.run('COMMIT');
        logAction(req.user.id, req.user.name, req.user.role, 'UPDATE', 'Pharmacy', `Return/Exchange processed for ${tx.invoice_id}`, req.ip);
        res.json({ message: 'Return/Exchange processed successfully' });
    } catch (err) {
        await db.run('ROLLBACK');
        res.status(400).json({ error: err.message });
    }
});

router.get('/stats/revenue', async (req, res) => {
    try {
        const stats = {
            totalSales: (await db.prepare("SELECT SUM(total_amount) as s FROM pharmacy_transactions WHERE DATE(created_at) = CURRENT_DATE").get()).s || 0,
            totalPaid: (await db.prepare("SELECT SUM(paid_amount) as s FROM pharmacy_transactions WHERE DATE(created_at) = CURRENT_DATE").get()).s || 0,
            totalReturns: (await db.prepare("SELECT SUM(amount) as s FROM pharmacy_returns WHERE DATE(created_at) = CURRENT_DATE").get()).s || 0,
            transactionCount: (await db.prepare("SELECT COUNT(*) as c FROM pharmacy_transactions WHERE DATE(created_at) = CURRENT_DATE").get()).c || 0,
            outstandingCredit: (await db.query("SELECT SUM(patient_credits.balance) as s FROM patient_credits")).rows[0].s || 0,
            breakdown: await db.prepare("SELECT payment_method, SUM(paid_amount) as amount FROM pharmacy_transactions WHERE DATE(created_at) = CURRENT_DATE GROUP BY payment_method").all()
        };
        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/credits/:patientId', async (req, res) => {
    try {
        const row = await db.prepare('SELECT * FROM patient_credits WHERE patient_id = ?').get(req.params.patientId);
        res.json(row || { balance: 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/transactions/:id/items', async (req, res) => {
    try {
        const rows = await db.prepare('SELECT * FROM pharmacy_transaction_items WHERE transaction_id = ?').all(req.params.id);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// â”€â”€ Categories â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/categories', async (req, res) => {
    try {
        const rows = await db.prepare('SELECT * FROM medicine_categories ORDER BY name').all();
        res.json(rows.map(r => ({ id: r.id, name: r.name })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/categories', async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Category name required' });
    try {
        const id = uuidv4();
        await db.prepare('INSERT INTO medicine_categories (id, name) VALUES (?, ?)').run(id, name);
        res.status(201).json({ id, name });
    } catch (err) {
        if (err.message.includes('unique constraint')) {
            return res.status(400).json({ error: 'Category already exists' });
        }
        res.status(500).json({ error: err.message });
    }
});

// â”€â”€ Medicines â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const fmtMed = (m) => ({
    id: m.id, name: m.name, genericName: m.generic_name, category: m.category,
    manufacturer: m.manufacturer, batchNumber: m.batch_number, expiryDate: m.expiry_date,
    quantity: m.quantity, reorderLevel: m.reorder_level, unitPrice: m.unit_price,
    sellingPrice: m.selling_price, unit: m.unit, status: m.status
});

router.get('/medicines', async (req, res) => {
    const { search, category, status } = req.query;
    let q = 'SELECT * FROM medicines WHERE 1=1'; const p = [];
    if (search) { q += ` AND (name LIKE ? OR generic_name LIKE ?)`; const s = `%${search}%`; p.push(s, s); }
    if (category) { q += ' AND category = ?'; p.push(category); }
    if (status) { q += ' AND status = ?'; p.push(status); }
    q += ' ORDER BY name';
    try {
        const rows = await db.prepare(q).all(...p);
        res.json(rows.map(fmtMed));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/medicines/expiring', async (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const ninetyDays = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    try {
        const rows = await db.prepare('SELECT * FROM medicines WHERE expiry_date BETWEEN ? AND ? ORDER BY expiry_date').all(today, ninetyDays);
        res.json(rows.map(fmtMed));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/medicines/low-stock', async (req, res) => {
    try {
        const rows = await db.prepare('SELECT * FROM medicines WHERE quantity <= reorder_level AND quantity > 0').all();
        res.json(rows.map(fmtMed));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/medicines/:id', async (req, res) => {
    try {
        const row = await db.prepare('SELECT * FROM medicines WHERE id = ?').get(req.params.id);
        if (!row) return res.status(404).json({ error: 'Medicine not found' });
        res.json(fmtMed(row));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/medicines', async (req, res) => {
    const { name, genericName, category, manufacturer, batchNumber, expiryDate, quantity, reorderLevel, unitPrice, sellingPrice, unit } = req.body;
    if (!name || !category) return res.status(400).json({ error: 'name and category required' });
    const id = uuidv4();
    const qty = parseInt(quantity) || 0;
    const rl = parseInt(reorderLevel) || 10;
    const status = qty === 0 ? 'out-of-stock' : qty <= rl ? 'low-stock' : 'in-stock';
    try {
        await db.prepare(`INSERT INTO medicines (id, name, generic_name, category, manufacturer, batch_number, expiry_date, quantity, reorder_level, unit_price, selling_price, unit, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(id, name, genericName || null, category, manufacturer || null, batchNumber || null, expiryDate || null, qty, rl, unitPrice || 0, sellingPrice || 0, unit || 'tablet', status);
        logAction(req.user.id, req.user.name, req.user.role, 'CREATE', 'Pharmacy', `Medicine added: ${name}`, req.ip);
        const row = await db.prepare('SELECT * FROM medicines WHERE id = ?').get(id);
        res.status(201).json(fmtMed(row));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/medicines/:id', async (req, res) => {
    try {
        const row = await db.prepare('SELECT * FROM medicines WHERE id = ?').get(req.params.id);
        if (!row) return res.status(404).json({ error: 'Not found' });
        const { name, genericName, category, manufacturer, batchNumber, expiryDate, quantity, reorderLevel, unitPrice, sellingPrice, unit } = req.body;
        const qty = quantity !== undefined ? parseInt(quantity) : row.quantity;
        const rl = reorderLevel !== undefined ? parseInt(reorderLevel) : row.reorder_level;
        const status = qty === 0 ? 'out-of-stock' : qty <= rl ? 'low-stock' : 'in-stock';
        await db.prepare(`UPDATE medicines SET name=?, generic_name=?, category=?, manufacturer=?, batch_number=?, expiry_date=?, quantity=?, reorder_level=?, unit_price=?, selling_price=?, unit=?, status=? WHERE id=?`)
            .run(name || row.name, genericName ?? row.generic_name, category || row.category, manufacturer ?? row.manufacturer, batchNumber ?? row.batch_number, expiryDate ?? row.expiry_date, qty, rl, unitPrice ?? row.unit_price, sellingPrice ?? row.selling_price, unit || row.unit, status, req.params.id);
        logAction(req.user.id, req.user.name, req.user.role, 'UPDATE', 'Pharmacy', `Medicine updated: ${name || row.name}`, req.ip);
        const updatedRow = await db.prepare('SELECT * FROM medicines WHERE id = ?').get(req.params.id);
        res.json(fmtMed(updatedRow));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/medicines/:id', async (req, res) => {
    try {
        const row = await db.prepare('SELECT * FROM medicines WHERE id = ?').get(req.params.id);
        if (!row) return res.status(404).json({ error: 'Not found' });
        await db.prepare('DELETE FROM medicines WHERE id = ?').run(req.params.id);
        logAction(req.user.id, req.user.name, req.user.role, 'DELETE', 'Pharmacy', `Medicine deleted: ${row.name}`, req.ip);
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// â”€â”€ Prescriptions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const fmtRx = (p) => ({
    id: p.id, prescriptionId: p.prescription_id, patientId: p.patient_id, patientName: p.patient_name,
    doctorId: p.doctor_id, doctorName: p.doctor_name, appointmentId: p.appointment_id,
    date: p.date, diagnosis: p.diagnosis, medicines: JSON.parse(p.medicines || '[]'),
    notes: p.notes, status: p.status
});

router.get('/prescriptions', async (req, res) => {
    const { patientId, status } = req.query;
    let q = 'SELECT * FROM prescriptions WHERE 1=1'; const p = [];
    if (patientId) { q += ' AND patient_id = ?'; p.push(patientId); }
    if (status) { q += ' AND status = ?'; p.push(status); }
    q += ' ORDER BY date DESC';
    try {
        const rows = await db.prepare(q).all(...p);
        res.json(rows.map(fmtRx));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/prescriptions', async (req, res) => {
    const { patientId, doctorId, appointmentId, diagnosis, medicines, notes } = req.body;
    if (!patientId || !doctorId || !diagnosis) return res.status(400).json({ error: 'patientId, doctorId, diagnosis required' });
    try {
        const patient = await db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId);
        const doctor = await db.prepare('SELECT * FROM doctors WHERE id = ?').get(doctorId);
        const maxRxData = await db.prepare("SELECT prescription_id FROM prescriptions WHERE prescription_id LIKE 'RX-%' AND prescription_id NOT LIKE 'RX-OPD-%' AND prescription_id NOT LIKE 'RX-IPD-%' ORDER BY prescription_id DESC LIMIT 1").get();
        let nextRxNumber = 1;
        if (maxRxData && maxRxData.prescription_id) {
            const lastRxNumber = parseInt(maxRxData.prescription_id.split('-').pop());
            if (!isNaN(lastRxNumber)) nextRxNumber = lastRxNumber + 1;
        }
        const rxId = `RX-${String(nextRxNumber).padStart(4, '0')}`;
        const id = uuidv4();
        await db.prepare(`INSERT INTO prescriptions (id, prescription_id, patient_id, patient_name, doctor_id, doctor_name, appointment_id, date, diagnosis, medicines, notes, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(id, rxId, patientId, patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown', doctorId, doctor ? doctor.name : 'Unknown', appointmentId || null, new Date().toISOString().split('T')[0], diagnosis, JSON.stringify(medicines || []), notes || null, 'pending');
        logAction(req.user.id, req.user.name, req.user.role, 'CREATE', 'Pharmacy', `Prescription created: ${rxId}`, req.ip);
        
        // Trigger social push notification
        sendPushNotification({
            title: 'ðŸ’Š New Prescription Issued',
            message: `New prescription ${rxId} issued for ${patient ? `${patient.first_name} ${patient.last_name}` : 'Patient'}.`,
            url: `/pharmacy/prescriptions`
        });

        const row = await db.prepare('SELECT * FROM prescriptions WHERE id = ?').get(id);
        res.status(201).json(fmtRx(row));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/prescriptions/:id', async (req, res) => {
    try {
        const row = await db.prepare('SELECT * FROM prescriptions WHERE id = ?').get(req.params.id);
        if (!row) return res.status(404).json({ error: 'Not found' });
        const { status, medicines, notes } = req.body;
        await db.prepare('UPDATE prescriptions SET status=?, medicines=?, notes=? WHERE id=?')
            .run(status || row.status, medicines ? JSON.stringify(medicines) : row.medicines, notes ?? row.notes, req.params.id);
        const updatedRow = await db.prepare('SELECT * FROM prescriptions WHERE id = ?').get(req.params.id);
        res.json(fmtRx(updatedRow));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/prescriptions/:id/dispense', async (req, res) => {
    try {
        const rx = await db.prepare('SELECT * FROM prescriptions WHERE id = ?').get(req.params.id);
        if (!rx) return res.status(404).json({ error: 'Prescription not found' });
        if (rx.status === 'dispensed') return res.status(400).json({ error: 'Prescription already dispensed' });

        const medicinesPrescribed = JSON.parse(rx.medicines || '[]');
        let totalCost = 0;
        const invoiceItems = [];
        const invId = uuidv4();
        const maxPhInvData = await db.prepare("SELECT invoice_id FROM invoices WHERE invoice_id LIKE 'PH-INV-%' ORDER BY invoice_id DESC LIMIT 1").get();
        let nextPhInvNumber = 1;
        if (maxPhInvData && maxPhInvData.invoice_id) {
            const lastPhInvNumber = parseInt(maxPhInvData.invoice_id.split('-').pop());
            if (!isNaN(lastPhInvNumber)) nextPhInvNumber = lastPhInvNumber + 1;
        }
        const readableId = `PH-INV-${String(nextPhInvNumber).padStart(5, '0')}`;

        await db.exec('BEGIN');

        for (const item of medicinesPrescribed) {
            const isCustom = item.medicineId === 'custom';
            let med = null;
            const qtyDispensed = item.quantity || 1;

            if (!isCustom) {
                med = await db.prepare('SELECT * FROM medicines WHERE id = ?').get(item.medicineId);
                if (!med || med.quantity < qtyDispensed) {
                    throw new Error(`Insufficient stock for ${item.medicineName}`);
                }

                // Normal stock deduction logic (same as /transactions)
                let remainingToDeduct = qtyDispensed;
                const batches = await db.prepare('SELECT * FROM pharmacy_batches WHERE medicine_id = ? AND quantity_remaining > 0 ORDER BY expiry_date ASC').all(item.medicineId);
                
                for (const batch of batches) {
                    if (remainingToDeduct === 0) break;
                    const deduct = Math.min(batch.quantity_remaining, remainingToDeduct);
                    await db.prepare('UPDATE pharmacy_batches SET quantity_remaining = quantity_remaining - ? WHERE id = ?').run(deduct, batch.id);
                    remainingToDeduct -= deduct;
                }

                const newQty = med.quantity - qtyDispensed;
                const newStatus = newQty === 0 ? 'out-of-stock' : newQty <= med.reorder_level ? 'low-stock' : 'in-stock';
                await db.prepare('UPDATE medicines SET quantity = ?, status = ? WHERE id = ?').run(newQty, newStatus, med.id);
            }

            const unitPrice = med ? (med.selling_price || 0) : 0;
            totalCost += unitPrice * qtyDispensed;
            invoiceItems.push({
                id: med ? med.id : 'custom',
                name: item.medicineName,
                unitPrice: unitPrice,
                quantity: qtyDispensed,
                total: unitPrice * qtyDispensed
            });
        }

        await db.prepare('UPDATE prescriptions SET status = \'dispensed\' WHERE id = ?').run(req.params.id);

        await db.prepare(`INSERT INTO invoices (id, invoice_id, patient_id, patient_name, date, due_date, items, subtotal, tax, discount, total, paid_amount, status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(invId, readableId, rx.patient_id, rx.patient_name, new Date().toISOString().split('T')[0], new Date().toISOString().split('T')[0], JSON.stringify(invoiceItems), totalCost, 0, 0, totalCost, 0, 'unpaid', `Pharmacy Dispensing: Rx ${rx.prescription_id}`);

        await db.exec('COMMIT');

        logAction(req.user.id, req.user.name, req.user.role, 'UPDATE', 'Pharmacy', `Prescription dispensed and billing created: ${rx.prescription_id}`, req.ip);
        res.json({ message: 'Prescription dispensed successfully', rxId: rx.id, invoiceId: readableId });

    } catch (error) {
        await db.exec('ROLLBACK');
        res.status(400).json({ error: error.message });
    }
});

router.get('/stats', async (req, res) => {
    try {
        const totalMeds = (await db.prepare('SELECT COUNT(*) as c FROM medicines').get()).c;
        const outOfStock = (await db.prepare('SELECT COUNT(*) as c FROM medicines WHERE quantity = 0').get()).c;
        const lowStock = (await db.prepare('SELECT COUNT(*) as c FROM medicines WHERE quantity <= reorder_level AND quantity > 0').get()).c;
        const todayDispensed = (await db.prepare("SELECT COUNT(*) as c FROM prescriptions WHERE status = 'dispensed' AND date = CURRENT_DATE").get()).c;

        res.json({
            totalMedicines: totalMeds,
            outOfStock,
            lowStock,
            dispensedToday: todayDispensed
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

