const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { authenticate, logAction, authorize } = require('../middleware/auth');
const { sendPushNotification } = require('../utils/push-notify');
const { recordGranularPayment } = require('../utils/finance');

const router = express.Router();
router.use(authenticate);
router.use(authorize(['pharmacist', 'admin', 'doctor']));

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
                subtotal_amount DECIMAL(15,2) DEFAULT 0,
                discount_amount DECIMAL(15,2) DEFAULT 0,
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
        try { await db.query('ALTER TABLE pharmacy_transactions ADD COLUMN subtotal_amount DECIMAL(15,2) DEFAULT 0'); } catch (e) {}
        try { await db.query('ALTER TABLE pharmacy_transactions ADD COLUMN discount_amount DECIMAL(15,2) DEFAULT 0'); } catch (e) {}

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
    else { q += " AND COALESCE(status, '') <> 'Cancelled' AND COALESCE(total_amount, 0) > 0"; }
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
        const items = await db.prepare(`
            SELECT ti.*,
                   COALESCE(r.returned_qty, 0) AS returned_quantity,
                   CASE
                       WHEN ti.quantity - COALESCE(r.returned_qty, 0) > 0 THEN ti.quantity - COALESCE(r.returned_qty, 0)
                       ELSE 0
                   END AS remaining_quantity
            FROM pharmacy_transaction_items ti
            LEFT JOIN (
                SELECT item_id, COALESCE(SUM(quantity), 0) AS returned_qty
                FROM pharmacy_returns
                GROUP BY item_id
            ) r ON r.item_id = ti.id
            WHERE ti.transaction_id = ?
            ORDER BY ti.medicine_name ASC
        `).all(req.params.id);
        res.json(items);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/transactions', async (req, res) => {
    const { 
        patientId, patientName, items, totalAmount, 
        paidAmount, paymentMethod, status, appliedCredit,
        notes, creditCustomerId, discount
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

        const subtotalAmount = parseFloat(totalAmount) || 0;
        const discountAmount = Math.max(0, parseFloat(discount) || 0);
        const netTotalAmount = Math.max(0, subtotalAmount - discountAmount);
        const safeAppliedCredit = Math.min(netTotalAmount, appliedCredit ? parseFloat(appliedCredit) : 0);
        const totalToReconcile = Math.max(0, netTotalAmount - safeAppliedCredit);
        const pmLower = (paymentMethod || '').toLowerCase();
        const resolvedPaidAmount =
            (pmLower === 'credit' || pmLower === 'employee_credit')
                ? (parseFloat(paidAmount) || 0)
                : ((paidAmount !== undefined && paidAmount !== null && paidAmount !== '')
                    ? (parseFloat(paidAmount) || 0)
                    : totalToReconcile);
        const creditAmount = pmLower === 'credit'
            ? (totalToReconcile - resolvedPaidAmount)
            : (netTotalAmount - resolvedPaidAmount - safeAppliedCredit);
        const itemsSummary = items.map(i => `${i.medicineName || i.name} (x${i.quantity})`).join(', ');

        // Insert Transaction
        await db.prepare(`INSERT INTO pharmacy_transactions 
            (id, invoice_id, patient_id, patient_name, subtotal_amount, discount_amount, total_amount, paid_amount, credit_amount, payment_method, status, created_by, items_summary)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(
                txId,
                invoiceId,
                patientId || null,
                patientName,
                subtotalAmount,
                discountAmount,
                netTotalAmount,
                resolvedPaidAmount + safeAppliedCredit,
                Math.max(0, creditAmount),
                paymentMethod,
                status || 'Completed',
                req.user.name,
                itemsSummary
            );

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
        if (pmLower === 'credit' && creditCustomerId) {
            const customer = await db.prepare('SELECT * FROM credit_customers WHERE id = ?').get(creditCustomerId);
            if (!customer) throw new Error('Credit Customer not found');

            // ── Credit Limit Check ──────────────────────────────────
            const currentBalance = parseFloat(customer.outstanding_balance) || 0;
            const creditLimit    = parseFloat(customer.credit_limit)        || 0;
            const remainingLimit = creditLimit - currentBalance;
            const saleOnCredit   = totalToReconcile - resolvedPaidAmount;

            if (saleOnCredit > remainingLimit) {
                throw new Error(
                    `Credit limit exceeded for ${customer.full_name}. ` +
                    `Available: $${remainingLimit.toFixed(2)}, Required: $${saleOnCredit.toFixed(2)}.`
                );
            }
            // ───────────────────────────────────────────────────────

            const transactionId = uuidv4();
            const transactionUID = `CR-TXN-${uuidv4().slice(0, 8).toUpperCase()}`;
            const remainingBalance = saleOnCredit;

            await db.prepare(`
                INSERT INTO credit_transactions (id, transaction_id, customer_id, invoice_id, invoice_number, items_summary, total_amount, amount_paid, remaining_balance, status, staff_id, staff_name)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                transactionId, transactionUID, creditCustomerId, txId, invoiceId, itemsSummary,
                netTotalAmount, resolvedPaidAmount, remainingBalance, remainingBalance <= 0 ? 'paid' : 'unpaid',
                req.user.id, req.user.name
            );

            // Update Customer Balance
            const newBalance = parseFloat(customer.outstanding_balance) + remainingBalance;
            const newTotalCredit = parseFloat(customer.total_credit_taken) + netTotalAmount;
            
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
                'debit', netTotalAmount, newBalance, transactionUID
            );
        } else if (pmLower === 'employee_credit' && creditCustomerId) {
            // Handle Employee Credit Integration
            const employee = await db.prepare('SELECT * FROM employees WHERE id = ?').get(creditCustomerId);
            if (!employee) throw new Error('Employee not found');

            const remainingBalance = totalToReconcile - resolvedPaidAmount;

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
            if (creditAmount > 0 && pmLower !== 'credit' && pmLower !== 'employee_credit') {
                await db.prepare(`INSERT INTO patient_credits (id, patient_id, balance) 
                    VALUES (?, ?, ?) 
                    ON CONFLICT(patient_id) DO UPDATE SET balance = patient_credits.balance + ?, last_updated = CURRENT_TIMESTAMP`)
                    .run(uuidv4(), patientId, creditAmount, creditAmount);
            }
        }

        await db.run('COMMIT');
        logAction(req.user.id, req.user.name, req.user.role, 'CREATE', 'Pharmacy', `POS Transaction ${invoiceId} created`, req.ip);

        // DISABLED: Pharmacy sales now transferred end-of-day.
        // Log income to account_entries for departmental revenue report (Only via End of Day Transfer)
        /*
        if (resolvedPaidAmount > 0 && pmLower !== 'credit') {
            try {
                await recordGranularPayment({
                    invoiceId,
                    dbInvoiceId: txId,
                    patientName,
                    paymentAmount: resolvedPaidAmount + safeAppliedCredit,
                    paymentMethod,
                    userId: req.user.id,
                    defaultDept: 'Pharmacy'
                });
            } catch (e) { console.error('Finance logging error:', e.message); }
        }
        */

        sendPushNotification({
            title: '💊 New Pharmacy POS Sale',
            message: `New sale completed by pharmacist: ${invoiceId} for ${patientName || 'Walk-in'}. Total: $${netTotalAmount}.`,
            url: `/pharmacy/transactions`
        });

        res.status(201).json({ id: txId, invoiceId });
    } catch (err) {
        if (db.inTransaction) await db.run('ROLLBACK');
        res.status(400).json({ error: err.message });
    }
});

router.post('/transactions/:id/return', async (req, res) => {
    const { items, exchangeItems, paymentMethod } = req.body; 
    
    try {
        const tx = await db.prepare('SELECT * FROM pharmacy_transactions WHERE id = ?').get(req.params.id);
        if (!tx) return res.status(404).json({ error: 'Transaction not found' });

        const returnItems = Array.isArray(items) ? items.filter(item => (parseInt(item?.quantity, 10) || 0) > 0) : [];
        const safeExchangeItems = Array.isArray(exchangeItems) ? exchangeItems.filter(item => (parseInt(item?.quantity, 10) || 0) > 0) : [];

        if (returnItems.length === 0 && safeExchangeItems.length === 0) {
            return res.status(400).json({ error: 'No return or exchange items provided' });
        }

        await db.run('BEGIN TRANSACTION');

        const originalPaidAmount = Math.max(0, parseFloat(tx.paid_amount) || 0);
        const originalDiscountAmount = Math.max(
            0,
            parseFloat(tx.discount_amount) || Math.max(0, (parseFloat(tx.subtotal_amount) || parseFloat(tx.total_amount) || 0) - (parseFloat(tx.total_amount) || 0))
        );

        // 1. Process Returns
        for (const rItem of returnItems) {
            const item = await db.prepare('SELECT * FROM pharmacy_transaction_items WHERE id = ? AND transaction_id = ?').get(rItem.itemId, req.params.id);
            if (!item) throw new Error('Transaction item not found');

            const requestedQty = Math.max(0, parseInt(rItem.quantity, 10) || 0);
            if (requestedQty <= 0) continue;

            const previouslyReturned = await db.prepare(`
                SELECT COALESCE(SUM(quantity), 0) AS returned_qty
                FROM pharmacy_returns
                WHERE item_id = ?
            `).get(rItem.itemId);

            const soldQty = Math.max(0, parseInt(item.quantity, 10) || 0);
            const alreadyReturnedQty = Math.max(0, parseInt(previouslyReturned?.returned_qty, 10) || 0);
            const remainingQty = Math.max(0, soldQty - alreadyReturnedQty);

            if (requestedQty > remainingQty) {
                throw new Error(`Return quantity for ${item.medicine_name} exceeds remaining sold quantity`);
            }

            const unitPrice = Math.max(0, parseFloat(item.unit_price) || 0);
            const returnAmount = Number((requestedQty * unitPrice).toFixed(2));
            const returnId = uuidv4();
            await db.prepare('INSERT INTO pharmacy_returns (id, transaction_id, item_id, quantity, amount) VALUES (?, ?, ?, ?, ?)')
                .run(returnId, req.params.id, rItem.itemId, requestedQty, returnAmount);

            // Increase Stock (Old Item)
            const medicine = item.medicine_id
                ? await db.prepare('SELECT quantity, reorder_level FROM medicines WHERE id = ?').get(item.medicine_id)
                : null;

            if (medicine) {
                const updatedQty = (parseInt(medicine.quantity, 10) || 0) + requestedQty;
                const reorderLevel = parseInt(medicine.reorder_level, 10) || 0;
                const updatedStatus = updatedQty === 0 ? 'out-of-stock' : updatedQty <= reorderLevel ? 'low-stock' : 'in-stock';
                await db.prepare('UPDATE medicines SET quantity = ?, status = ? WHERE id = ?').run(updatedQty, updatedStatus, item.medicine_id);
            }
        }

        // 2. Process Exchanges (as a new sale if exchangeItems exist)
        let totalExchangeAmount = 0;
        if (safeExchangeItems.length > 0) {
            const exchangeTxId = uuidv4();
            const maxExcData = await db.prepare("SELECT invoice_id FROM pharmacy_transactions WHERE invoice_id LIKE 'PHARM-EXC-%' ORDER BY invoice_id DESC LIMIT 1").get();
            let nextExcNumber = 1;
            if (maxExcData && maxExcData.invoice_id) {
                const lastExcNumber = parseInt(maxExcData.invoice_id.split('-').pop());
                if (!isNaN(lastExcNumber)) nextExcNumber = lastExcNumber + 1;
            }
            const exchangeInvoiceId = `PHARM-EXC-${String(nextExcNumber).padStart(4, '0')}`;
            
            for (const eItem of safeExchangeItems) {
                totalExchangeAmount += parseFloat(eItem.totalPrice);
            }

            const itemsSummaryText = safeExchangeItems.map(i => `${i.medicineName} (x${i.quantity})`).join(', ');
            
            await db.prepare(`INSERT INTO pharmacy_transactions 
                (id, invoice_id, patient_id, patient_name, total_amount, paid_amount, credit_amount, payment_method, status, created_by, items_summary, is_transferred)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`)
                .run(exchangeTxId, exchangeInvoiceId, tx.patient_id, tx.patient_name, totalExchangeAmount, totalExchangeAmount, 0, paymentMethod || tx.payment_method, 'Exchange', req.user.name, `EXC for ${tx.invoice_id}: ${itemsSummaryText}`);

            for (const eItem of safeExchangeItems) {
                const med = await db.prepare('SELECT quantity, reorder_level FROM medicines WHERE id = ?').get(eItem.medicineId);
                if (!med || med.quantity < eItem.quantity) {
                    throw new Error(`Insufficient stock for exchange item: ${eItem.medicineName}`);
                }

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

                const exchangeItemId = uuidv4();
                await db.prepare(`INSERT INTO pharmacy_transaction_items 
                    (id, transaction_id, medicine_id, medicine_name, quantity, unit_price, total_price)
                    VALUES (?, ?, ?, ?, ?, ?, ?)`)
                    .run(exchangeItemId, exchangeTxId, eItem.medicineId, eItem.medicineName, eItem.quantity, eItem.unitPrice, eItem.totalPrice);
            }
        }

        const originalItems = await db.prepare('SELECT * FROM pharmacy_transaction_items WHERE transaction_id = ?').all(req.params.id);
        const returnedQtyRows = await db.prepare(`
            SELECT item_id, COALESCE(SUM(quantity), 0) AS returned_qty
            FROM pharmacy_returns
            WHERE transaction_id = ?
            GROUP BY item_id
        `).all(req.params.id);

        const returnedQtyMap = new Map(
            returnedQtyRows.map(row => [row.item_id, Math.max(0, parseInt(row.returned_qty, 10) || 0)])
        );

        const remainingItems = originalItems
            .map(item => {
                const soldQty = Math.max(0, parseInt(item.quantity, 10) || 0);
                const returnedQty = Math.min(soldQty, returnedQtyMap.get(item.id) || 0);
                const remainingQty = Math.max(0, soldQty - returnedQty);
                const unitPrice = Math.max(0, parseFloat(item.unit_price) || 0);
                return {
                    ...item,
                    remainingQty,
                    unitPrice,
                    remainingLineTotal: Number((remainingQty * unitPrice).toFixed(2))
                };
            })
            .filter(item => item.remainingQty > 0);

        const updatedSubtotalAmount = Number(
            remainingItems.reduce((sum, item) => sum + item.remainingLineTotal, 0).toFixed(2)
        );
        const updatedDiscountAmount = Number(Math.min(originalDiscountAmount, updatedSubtotalAmount).toFixed(2));
        const updatedTotalAmount = Number(Math.max(0, updatedSubtotalAmount - updatedDiscountAmount).toFixed(2));
        const updatedPaidAmount = Number(Math.min(originalPaidAmount, updatedTotalAmount).toFixed(2));
        const updatedCreditAmount = Number(Math.max(0, updatedTotalAmount - updatedPaidAmount).toFixed(2));
        const updatedItemsSummary = remainingItems.length > 0
            ? remainingItems.map(item => `${item.medicine_name} (x${item.remainingQty})`).join(', ')
            : 'All items returned';

        const isReturnOnlyFlow = safeExchangeItems.length === 0;

        let updatedStatus = 'Paid';
        if (updatedTotalAmount === 0) updatedStatus = 'Cancelled';
        else if (updatedCreditAmount > 0 && updatedPaidAmount > 0) updatedStatus = 'Partial';
        else if (updatedCreditAmount > 0) updatedStatus = 'Credit';

        await db.prepare(`
            UPDATE pharmacy_transactions
            SET subtotal_amount = ?,
                discount_amount = ?,
                total_amount = ?,
                paid_amount = ?,
                credit_amount = ?,
                status = ?,
                items_summary = ?
            WHERE id = ?
        `).run(
            updatedSubtotalAmount,
            updatedDiscountAmount,
            updatedTotalAmount,
            updatedPaidAmount,
            updatedCreditAmount,
            updatedStatus,
            updatedItemsSummary,
            req.params.id
        );

        const refundableBalance = Number(Math.max(0, originalPaidAmount - updatedPaidAmount).toFixed(2));
        
        if (tx.is_transferred === 1 && refundableBalance > 0) {
            const todayStr = new Date().toISOString().split('T')[0];
            await db.prepare(`
                INSERT INTO account_entries (id, date, type, category, description, amount, payment_method, reference_id, department, status, user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                uuidv4(),
                todayStr,
                'expense',
                'Pharmacy Refund',
                `Refund for returned items (Inv: ${tx.invoice_id}, Patient: ${tx.patient_name || 'Walk-In'})`,
                refundableBalance,
                paymentMethod || tx.payment_method || 'cash',
                `PHARM-REFUND-${tx.invoice_id}`,
                'Pharmacy',
                'completed',
                req.user.id
            );
        }

        const balanceChange = Number((refundableBalance - totalExchangeAmount).toFixed(2));
        
        if (tx.patient_id && balanceChange !== 0 && !isReturnOnlyFlow) {
            await db.prepare(`INSERT INTO patient_credits (id, patient_id, balance) 
                VALUES (?, ?, ?) 
                ON CONFLICT(patient_id) DO UPDATE SET balance = patient_credits.balance + ?, last_updated = CURRENT_TIMESTAMP`)
                .run(uuidv4(), tx.patient_id, balanceChange, balanceChange);
        }

        await db.run('COMMIT');
        logAction(req.user.id, req.user.name, req.user.role, 'UPDATE', 'Pharmacy', `Return/Exchange processed for ${tx.invoice_id}`, req.ip);
        res.json({ 
            message: 'Return/Exchange processed successfully',
            refundAmount: refundableBalance,
            cancelledTransaction: updatedStatus === 'Cancelled'
        });
    } catch (err) {
        await db.run('ROLLBACK');
        res.status(400).json({ error: err.message });
    }
});

router.get('/stats/revenue', async (req, res) => {
    try {
        const stats = {
            totalSales: (await db.prepare("SELECT SUM(total_amount) as s FROM pharmacy_transactions WHERE DATE(created_at) = CURRENT_DATE AND COALESCE(status, '') <> 'Cancelled'").get()).s || 0,
            totalDiscount: (await db.prepare("SELECT SUM(discount_amount) as s FROM pharmacy_transactions WHERE DATE(created_at) = CURRENT_DATE AND COALESCE(status, '') <> 'Cancelled'").get()).s || 0,
            totalPaid: (await db.prepare("SELECT SUM(paid_amount) as s FROM pharmacy_transactions WHERE DATE(created_at) = CURRENT_DATE AND COALESCE(status, '') <> 'Cancelled'").get()).s || 0,
            totalReturns: (await db.prepare("SELECT SUM(amount) as s FROM pharmacy_returns WHERE DATE(created_at) = CURRENT_DATE").get()).s || 0,
            transactionCount: (await db.prepare("SELECT COUNT(*) as c FROM pharmacy_transactions WHERE DATE(created_at) = CURRENT_DATE AND COALESCE(status, '') <> 'Cancelled'").get()).c || 0,
            outstandingCredit: (await db.query("SELECT SUM(patient_credits.balance) as s FROM patient_credits")).rows[0].s || 0,
            breakdown: await db.prepare("SELECT payment_method, SUM(paid_amount) as amount FROM pharmacy_transactions WHERE DATE(created_at) = CURRENT_DATE AND COALESCE(status, '') <> 'Cancelled' GROUP BY payment_method").all()
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
        const rows = await db.prepare(`
            SELECT ti.*,
                   COALESCE(r.returned_qty, 0) AS returned_quantity,
                   CASE
                       WHEN ti.quantity - COALESCE(r.returned_qty, 0) > 0 THEN ti.quantity - COALESCE(r.returned_qty, 0)
                       ELSE 0
                   END AS remaining_quantity
            FROM pharmacy_transaction_items ti
            LEFT JOIN (
                SELECT item_id, COALESCE(SUM(quantity), 0) AS returned_qty
                FROM pharmacy_returns
                GROUP BY item_id
            ) r ON r.item_id = ti.id
            WHERE ti.transaction_id = ?
            ORDER BY ti.medicine_name ASC
        `).all(req.params.id);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

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
        
        sendPushNotification({
            title: '💊 New Prescription Issued',
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

router.delete('/admin/clear-transactions', async (req, res) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin only' });
    }
    try {
        await db.exec('BEGIN');

        const txRows = await db.prepare('SELECT id, invoice_id FROM pharmacy_transactions').all();
        const txIds      = txRows.map(r => r.id);
        const invoiceIds = txRows.map(r => r.invoice_id).filter(Boolean);

        if (txIds.length > 0) {
            const crTxnRows = await db.prepare(`
                SELECT transaction_id FROM credit_transactions
                WHERE invoice_id = ANY($1::text[])
            `).all(txIds);
            if (crTxnRows.length > 0) {
                const crTxnIds = crTxnRows.map(r => r.transaction_id);
                await db.prepare(`DELETE FROM credit_ledger WHERE reference_id = ANY($1::text[])`).run(crTxnIds);
            }

            await db.prepare(`DELETE FROM credit_transactions WHERE invoice_id = ANY($1::text[])`).run(txIds);

            await db.prepare(`DELETE FROM pharmacy_returns WHERE transaction_id = ANY($1::uuid[])`).run(txIds);

            await db.prepare(`DELETE FROM pharmacy_transaction_items WHERE transaction_id = ANY($1::uuid[])`).run(txIds);

            if (invoiceIds.length > 0) {
                await db.prepare(`DELETE FROM account_entries WHERE reference_id = ANY($1::text[])`).run(invoiceIds);
            }
        }

        await db.exec('DELETE FROM pharmacy_transactions');

        await db.exec('COMMIT');

        logAction(req.user.id, req.user.name, req.user.role, 'DELETE', 'Pharmacy', 'Admin cleared all pharmacy transactions', req.ip);
        res.json({ message: `Cleared ${txIds.length} pharmacy transactions successfully.` });
    } catch (err) {
        try { await db.exec('ROLLBACK'); } catch (_) {}
        res.status(500).json({ error: err.message });
    }
});

router.delete('/admin/clear-hospital-revenue', async (req, res) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin only' });
    }
    try {
        await db.exec('BEGIN');

        await db.exec(`DELETE FROM invoices WHERE invoice_id LIKE 'INV-POS-%'`);

        await db.exec(`DELETE FROM account_entries WHERE type = 'income'`);

        await db.exec('COMMIT');

        logAction(req.user.id, req.user.name, req.user.role, 'DELETE', 'Pharmacy', 'Admin cleared all hospital revenue entries', req.ip);
        res.json({ message: 'All hospital revenue entries cleared successfully.' });
    } catch (err) {
        try { await db.exec('ROLLBACK'); } catch (_) {}
        res.status(500).json({ error: err.message });
    }
});

router.post('/sales-receipts/manual', async (req, res) => {
    const { date, amount, paymentMethod, referenceName, invoiceNumber } = req.body;

    if (!date || !amount || !paymentMethod) {
        return res.status(400).json({ error: 'date, amount, and paymentMethod are required' });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ error: 'amount must be a positive number' });
    }

    try {
        const txId = uuidv4();
        let invoiceId = invoiceNumber && invoiceNumber.trim() ? invoiceNumber.trim() : null;
        if (!invoiceId) {
            const maxInvData = await db.prepare("SELECT invoice_id FROM pharmacy_transactions ORDER BY LENGTH(invoice_id) DESC, invoice_id DESC LIMIT 1").get();
            let nextInvNumber = 1;
            if (maxInvData && maxInvData.invoice_id) {
                const parts = maxInvData.invoice_id.split('-');
                const lastPart = parts[parts.length - 1].length === 4 ? parts[parts.length - 2] : parts[parts.length - 1];
                const lastNumber = parseInt(lastPart);
                if (!isNaN(lastNumber)) nextInvNumber = lastNumber + 1;
            }
            const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
            invoiceId = `QB-${String(nextInvNumber).padStart(4, '0')}-${randomSuffix}`;
        }

        const patientName = referenceName && referenceName.trim() ? referenceName.trim() : 'QuickBooks Import';
        const customTimestamp = `${date} 12:00:00`;

        await db.prepare(`
            INSERT INTO pharmacy_transactions
            (id, invoice_id, patient_id, patient_name, subtotal_amount, discount_amount, total_amount, paid_amount, credit_amount, payment_method, status, created_by, items_summary, created_at, is_transferred)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        `).run(
            txId, invoiceId, null, patientName,
            parsedAmount, 0, parsedAmount, parsedAmount, 0,
            paymentMethod, 'Completed', req.user.name,
            'Manual QuickBooks Import', customTimestamp
        );

        logAction(req.user.id, req.user.name, req.user.role, 'CREATE', 'Pharmacy', `Manual QB receipt added: ${invoiceId}`, req.ip);
        res.status(201).json({ id: txId, invoiceId, message: 'Manual receipt added successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/sales-receipts/pending-transfers', async (req, res) => {
    try {
        const queryStr = `
            SELECT DATE(created_at) as date, COUNT(*) as transaction_count, SUM(paid_amount) as total_amount
            FROM pharmacy_transactions
            WHERE COALESCE(is_transferred, 0) = 0
              AND DATE(created_at) <= CURRENT_DATE
              AND COALESCE(status, '') <> 'Cancelled'
              AND COALESCE(total_amount, 0) > 0
            GROUP BY DATE(created_at)
            ORDER BY DATE(created_at) DESC
        `;
        const rows = await db.prepare(queryStr).all();
        
        const formatted = rows.map(r => {
            let dateStr = r.date;
            if (dateStr instanceof Date) {
                dateStr = dateStr.toISOString().split('T')[0];
            } else if (typeof dateStr === 'string') {
                dateStr = dateStr.split('T')[0];
            }
            return {
                date: dateStr,
                transactionCount: parseInt(r.transaction_count) || 0,
                totalAmount: parseFloat(r.total_amount) || 0
            };
        });
        
        res.json(formatted);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/sales-receipts/transfer', async (req, res) => {
    const { date } = req.body;
    if (!date) {
        return res.status(400).json({ error: 'date is required' });
    }

    try {
        await db.run('BEGIN TRANSACTION');

        const txs = await db.prepare(`
            SELECT id, total_amount, paid_amount, payment_method
            FROM pharmacy_transactions
            WHERE DATE(created_at) = ?
              AND COALESCE(is_transferred, 0) = 0
              AND COALESCE(status, '') <> 'Cancelled'
              AND COALESCE(total_amount, 0) > 0
        `).all(date);

        if (txs.length === 0) {
            await db.run('COMMIT');
            return res.json({ message: 'No pending transactions to transfer for this date', transferred: 0 });
        }

        const groups = {};
        for (const tx of txs) {
            const method = (tx.payment_method || 'CASH').toUpperCase();
            const amt = parseFloat(tx.paid_amount) || 0;
            if (amt > 0) {
                groups[method] = (groups[method] || 0) + amt;
            }
        }

        const methodsTransferred = [];
        let totalTransferred = 0;
        for (const [method, amount] of Object.entries(groups)) {
            if (amount <= 0) continue;

            const refId = `PHARM-TRANSFER-${date}-${method}`;
            
            const existing = await db.prepare(`
                SELECT id FROM account_entries WHERE reference_id = ?
            `).get(refId);

            if (!existing) {
                await db.prepare(`
                    INSERT INTO account_entries (id, date, type, category, description, amount, payment_method, reference_id, department, status, user_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).run(
                    uuidv4(),
                    date,
                    'income',
                    'Pharmacy Sales Transfer',
                    `Pharmacy sales transfer (${method}) for ${date}`,
                    amount,
                    method,
                    refId,
                    'Pharmacy',
                    'completed',
                    req.user.id
                );
            }
            methodsTransferred.push({ method, amount });
            totalTransferred += amount;
        }

        await db.prepare(`
            UPDATE pharmacy_transactions
            SET is_transferred = 1
            WHERE DATE(created_at) = ?
              AND COALESCE(is_transferred, 0) = 0
              AND COALESCE(status, '') <> 'Cancelled'
              AND COALESCE(total_amount, 0) > 0
        `).run(date);

        await db.run('COMMIT');

        logAction(req.user.id, req.user.name, req.user.role, 'CREATE', 'Pharmacy', `Transferred pharmacy sales for ${date}: ${totalTransferred}`, req.ip);

        res.json({
            message: `Successfully transferred daily sales for ${date}`,
            date,
            totalTransferred,
            transfers: methodsTransferred
        });
    } catch (err) {
        if (db.inTransaction) await db.run('ROLLBACK');
        res.status(500).json({ error: err.message });
    }
});

router.get('/sales-receipts', async (req, res) => {
    const { startDate, endDate, paymentMethod, pendingOnly } = req.query;

    const today = new Date().toISOString().split('T')[0];
    const start = startDate || '2000-01-01';
    const end   = endDate   || today;

    try {
        let txQ = `SELECT id, invoice_id, patient_name, subtotal_amount, discount_amount, total_amount, paid_amount, credit_amount,
                          payment_method, status, items_summary, created_at, is_transferred
                   FROM pharmacy_transactions
                   WHERE DATE(created_at) >= ? AND DATE(created_at) <= ?
                     AND COALESCE(status, '') <> 'Cancelled'
                     AND COALESCE(total_amount, 0) > 0`;
        const txParams = [start, end];
        if (pendingOnly === 'true') {
            txQ += ' AND COALESCE(is_transferred, 0) = 0';
        }
        if (paymentMethod && paymentMethod !== 'ALL') {
            txQ += ' AND UPPER(payment_method) = UPPER(?)';
            txParams.push(paymentMethod);
        }
        txQ += ' ORDER BY created_at DESC';
        const pharmacyTxns = await db.prepare(txQ).all(...txParams);

        let posQ = `SELECT id, invoice_id, patient_name, subtotal, discount, total, paid_amount, payment_method,
                           status, date, items
                    FROM invoices
                    WHERE invoice_id LIKE 'INV-POS-%'
                      AND date >= ? AND date <= ?`;
        const posParams = [start, end];
        if (paymentMethod && paymentMethod !== 'ALL') {
            posQ += ' AND UPPER(payment_method) = UPPER(?)';
            posParams.push(paymentMethod);
        }
        posQ += ' ORDER BY date DESC';
        const posInvoices = await db.prepare(posQ).all(...posParams);

        let invQ = `SELECT id, invoice_id, patient_name, total, paid_amount, payment_method,
                           status, date, items
                    FROM invoices
                    WHERE invoice_id NOT LIKE 'INV-POS-%'
                      AND date >= ? AND date <= ?
                      AND (status = 'paid' OR paid_amount > 0)`;
        const invParams = [start, end];
        if (paymentMethod && paymentMethod !== 'ALL') {
            invQ += ' AND UPPER(payment_method) = UPPER(?)';
            invParams.push(paymentMethod);
        }
        invQ += ' ORDER BY date DESC';
        const otherInvoices = await db.prepare(invQ).all(...invParams);

        let aeQ = `SELECT ae.id, ae.date, ae.amount, ae.payment_method,
                          ae.description, ae.category, ae.reference_id,
                          ae.department, ae.status
                   FROM account_entries ae
                   WHERE ae.type = 'income'
                     AND ae.date >= ? AND ae.date <= ?`;
        const aeParams = [start, end];
        if (paymentMethod && paymentMethod !== 'ALL') {
            aeQ += ' AND UPPER(ae.payment_method) = UPPER(?)';
            aeParams.push(paymentMethod);
        }
        aeQ += ' ORDER BY ae.date DESC';
        const accountEntries = await db.prepare(aeQ).all(...aeParams);

        const arRows = await db.prepare(`
            SELECT id, customer_id, full_name, phone,
                   outstanding_balance, credit_limit, total_credit_taken, total_payments_made
            FROM credit_customers
            WHERE outstanding_balance > 0
            ORDER BY outstanding_balance DESC
        `).all();

        const pharmTotal  = pharmacyTxns.reduce((s, r) => s + (parseFloat(r.total_amount) || 0), 0);
        const pharmDiscountTotal = pharmacyTxns.reduce((s, r) => s + (parseFloat(r.discount_amount) || 0), 0);
        const posTotal    = posInvoices.reduce((s, r) => s + (parseFloat(r.total) || 0), 0);
        const posDiscountTotal = posInvoices.reduce((s, r) => s + (parseFloat(r.discount) || 0), 0);
        const invTotal    = otherInvoices.reduce((s, r) => s + (parseFloat(r.paid_amount) || parseFloat(r.total) || 0), 0);
        const aeTotal     = accountEntries.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
        const hospitalTotal = posTotal + invTotal + aeTotal;
        const arTotal     = arRows.reduce((s, r) => s + (parseFloat(r.outstanding_balance) || 0), 0);
        const totalDiscount = pharmDiscountTotal + posDiscountTotal;

        // Calculate transfer total for the period to subtract from grandTotal to avoid double counting
        const pharmacyTransfersTotal = accountEntries
            .filter(e => e.category === 'Pharmacy Sales Transfer')
            .reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);

        // Payment method breakdown (pharmacy + pos invoices)
        const byMethod = {};
        [...pharmacyTxns].forEach(t => {
            const m = (t.payment_method || 'OTHER').toUpperCase();
            byMethod[m] = (byMethod[m] || 0) + (parseFloat(t.total_amount) || 0);
        });
        [...posInvoices, ...otherInvoices].forEach(t => {
            const m = (t.payment_method || 'OTHER').toUpperCase();
            byMethod[m] = (byMethod[m] || 0) + (parseFloat(t.paid_amount) || parseFloat(t.total) || 0);
        });

        res.json({
            summary: {
                pharmacyTotal:  parseFloat(pharmTotal.toFixed(2)),
                hospitalTotal:  parseFloat(hospitalTotal.toFixed(2)),
                grandTotal:     parseFloat((pharmTotal + hospitalTotal - pharmacyTransfersTotal).toFixed(2)),
                discountTotal:  parseFloat(totalDiscount.toFixed(2)),
                arTotal:        parseFloat(arTotal.toFixed(2)),
                pharmacyTransfersTotal: parseFloat(pharmacyTransfersTotal.toFixed(2)),
                byMethod
            },
            pharmacyTransactions: pharmacyTxns.map(t => ({
                id:            t.id,
                invoiceId:     t.invoice_id,
                patientName:   t.patient_name || 'Walk-In',
                subtotalAmount: parseFloat(t.subtotal_amount) || parseFloat(t.total_amount) || 0,
                discountAmount: parseFloat(t.discount_amount) || 0,
                totalAmount:   parseFloat(t.total_amount)  || 0,
                paidAmount:    parseFloat(t.paid_amount)   || 0,
                creditAmount:  parseFloat(t.credit_amount) || 0,
                paymentMethod: t.payment_method,
                status:        t.status,
                itemsSummary:  t.items_summary,
                date:          t.created_at,
                isTransferred: t.is_transferred === 1 || t.is_transferred === true,
                source:        'Pharmacy'
            })),
            hospitalIncome: [
                ...posInvoices.map(e => ({
                    id:            e.id,
                    date:          e.date,
                    subtotalAmount: parseFloat(e.subtotal) || parseFloat(e.total) || 0,
                    discountAmount: parseFloat(e.discount) || 0,
                    amount:        parseFloat(e.total) || 0,
                    paidAmount:    parseFloat(e.paid_amount) || 0,
                    paymentMethod: e.payment_method,
                    description:   `POS Sale — ${e.patient_name || 'Walk-In'}`,
                    category:      'POS Sale',
                    department:    'Point of Sale',
                    referenceId:   e.invoice_id,
                    status:        e.status,
                    source:        'POS'
                })),
                ...otherInvoices.map(e => ({
                    id:            e.id,
                    date:          e.date,
                    amount:        parseFloat(e.paid_amount) || parseFloat(e.total) || 0,
                    paidAmount:    parseFloat(e.paid_amount) || 0,
                    paymentMethod: e.payment_method,
                    description:   `Invoice — ${e.patient_name || 'Patient'}`,
                    category:      'Invoice',
                    department:    'Billing',
                    referenceId:   e.invoice_id,
                    status:        e.status,
                    source:        'Billing'
                })),
                ...accountEntries.map(e => ({
                    id:            e.id,
                    date:          e.date,
                    amount:        parseFloat(e.amount) || 0,
                    paidAmount:    parseFloat(e.amount) || 0,
                    paymentMethod: e.payment_method,
                    description:   e.description,
                    category:      e.category,
                    department:    e.department,
                    referenceId:   e.reference_id,
                    status:        e.status,
                    source:        'Accounts'
                }))
            ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
            accountsReceivable: arRows.map(r => ({
                id:               r.id,
                customerId:       r.customer_id,
                fullName:         r.full_name,
                phone:            r.phone,
                outstandingBalance: parseFloat(r.outstanding_balance) || 0,
                creditLimit:      parseFloat(r.credit_limit)          || 0,
                totalCreditTaken: parseFloat(r.total_credit_taken)    || 0,
                totalPaid:        parseFloat(r.total_payments_made)   || 0
            }))
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

