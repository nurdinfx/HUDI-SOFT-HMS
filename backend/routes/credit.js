const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { authenticate, authorize, logAction } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/credit/customers - List all credit customers
router.get('/customers', async (req, res) => {
    try {
        const customers = await db.prepare('SELECT * FROM credit_customers ORDER BY full_name ASC').all();
        res.json(customers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/credit/customers - Register new credit customer
router.post('/customers', async (req, res) => {
    const { fullName, phone, address, patientId, creditLimit } = req.body;
    
    if (!fullName) return res.status(400).json({ error: 'Full Name is required' });

    try {
        const id = uuidv4();
        const customerUID = `CR-${Math.floor(1000 + Math.random() * 9000)}`;
        
        await db.prepare(`
            INSERT INTO credit_customers (id, customer_id, full_name, phone, address, patient_id, credit_limit)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(id, customerUID, fullName, phone, address, patientId, creditLimit || 1000);

        logAction(req.user.id, req.user.name, req.user.role, 'CREATE', 'Credit', `Registered credit customer: ${fullName}`, req.ip);
        
        const newCustomer = await db.prepare('SELECT * FROM credit_customers WHERE id = ?').get(id);
        res.status(201).json(newCustomer);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/credit/customers/:id - Get profile and ledger
router.get('/customers/:id', async (req, res) => {
    try {
        const customer = await db.prepare('SELECT * FROM credit_customers WHERE id = ?').get(req.params.id);
        if (!customer) return res.status(404).json({ error: 'Customer not found' });

        const ledger = await db.prepare('SELECT * FROM credit_ledger WHERE customer_id = ? ORDER BY created_at DESC').all(req.params.id);
        const transactions = await db.prepare('SELECT * FROM credit_transactions WHERE customer_id = ? ORDER BY date DESC').all(req.params.id);
        const payments = await db.prepare('SELECT * FROM credit_payments WHERE customer_id = ? ORDER BY date DESC').all(req.params.id);

        res.json({ customer, ledger, transactions, payments });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update customer
router.put('/customers/:id', async (req, res) => {
    try {
        const { fullName, phone, address, creditLimit, status } = req.body;
        const { id } = req.params;
        await db.prepare(`
            UPDATE credit_customers 
            SET full_name = ?, phone = ?, address = ?, credit_limit = ?, status = ?
            WHERE id = ?
        `).run(fullName, phone, address, creditLimit, status || 'active', id);
        res.json({ message: "Customer updated successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete customer
router.delete('/customers/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.exec('BEGIN');
        
        console.log(`🗑️ Deleting customer ${id} and all related records...`);
        
        await db.prepare("DELETE FROM credit_payments WHERE customer_id = ?").run(id);
        await db.prepare("DELETE FROM credit_ledger WHERE customer_id = ?").run(id);
        await db.prepare("DELETE FROM credit_transactions WHERE customer_id = ?").run(id);
        await db.prepare("DELETE FROM credit_customers WHERE id = ?").run(id);
        
        await db.exec('COMMIT');
        
        logAction(req.user.id, req.user.name, req.user.role, 'DELETE', 'Credit', `Deleted customer: ${id}`, req.ip);
        res.json({ message: "Customer and all history records deleted successfully" });
    } catch (err) {
        await db.exec('ROLLBACK');
        console.error('❌ Delete Customer Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ─── TRANSACTIONS ────────────────────────────────────────────────
// POST /api/credit/payments - Record a repayment
router.post('/payments', async (req, res) => {
    const { customerId, amount, paymentMethod, referenceNotes, date, discountAmount } = req.body;
    
    if (!customerId || (!amount && !discountAmount) || !paymentMethod) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        await db.exec('BEGIN');

        const customer = await db.prepare('SELECT * FROM credit_customers WHERE id = ?').get(customerId);
        if (!customer) throw new Error('Customer not found');

        const paymentId = uuidv4();
        const paymentUID = `PAY-CR-${Math.floor(10000 + Math.random() * 90000)}`;
        const payDate = date || new Date().toISOString().split('T')[0];
        const amt = Math.max(0, parseFloat(amount) || 0);
        const discount = Math.max(0, parseFloat(discountAmount) || 0);
        const totalSettled = amt + discount;

        if (totalSettled <= 0) throw new Error('Payment amount or discount required');

        // 1. Record cash payment
        if (amt > 0) {
            await db.prepare(`
                INSERT INTO credit_payments (id, payment_id, customer_id, amount, payment_method, reference_notes, date, staff_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(paymentId, paymentUID, customerId, amt, paymentMethod, referenceNotes, payDate, req.user.id);
        }

        // 2. Update customer balance
        const newBalance = Math.max(0, parseFloat(customer.outstanding_balance) - totalSettled);
        const totalPayments = parseFloat(customer.total_payments_made) + amt;
        
        await db.prepare(`
            UPDATE credit_customers 
            SET outstanding_balance = ?, total_payments_made = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(newBalance, totalPayments, customerId);

        // 3. Add to ledger (cash payment)
        if (amt > 0) {
            await db.prepare(`
                INSERT INTO credit_ledger (id, customer_id, date, description, type, amount, running_balance, reference_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(uuidv4(), customerId, payDate, `Repayment via ${paymentMethod.toUpperCase()}: ${paymentUID}`, 'credit', amt, newBalance, paymentUID);
        }

        // 4. Add to ledger (discount)
        if (discount > 0) {
            await db.prepare(`
                INSERT INTO credit_ledger (id, customer_id, date, description, type, amount, running_balance, reference_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(uuidv4(), customerId, payDate, `Discount applied (${paymentUID})`, 'credit', discount, newBalance, paymentUID);
        }

        // 5. Record cash portion as income in main accounts (correct payment method → ZAAD/Sahal receipts)
        if (amt > 0) {
            await db.prepare(`
                INSERT INTO account_entries (id, date, type, category, description, amount, payment_method, reference_id, department, status, user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                uuidv4(), payDate, 'income', 'Credit Repayment',
                `Credit Repayment from ${customer.full_name} via ${paymentMethod.toUpperCase()} (${paymentUID})`,
                amt, paymentMethod, paymentUID, 'Finance', 'completed', req.user.id
            );
        }

        // 6. Record discount as expense in main accounts
        if (discount > 0) {
            await db.prepare(`
                INSERT INTO account_entries (id, date, type, category, description, amount, payment_method, reference_id, department, status, user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                uuidv4(), payDate, 'expense', 'Credit Discount',
                `Discount granted to ${customer.full_name} on account balance (${paymentUID})`,
                discount, paymentMethod, paymentUID, 'Finance', 'completed', req.user.id
            );
        }

        await db.exec('COMMIT');
        
        logAction(req.user.id, req.user.name, req.user.role, 'CREATE', 'Credit', `Recorded repayment: $${amt} + discount $${discount} for ${customer.full_name}`, req.ip);
        
        res.status(201).json({ message: 'Payment recorded successfully', newBalance, amountPaid: amt, discountApplied: discount });
    } catch (err) {
        await db.exec('ROLLBACK');
        res.status(500).json({ error: err.message });
    }
});


// POST /api/credit/transactions - Record manual credit / loan
router.post('/transactions', async (req, res) => {
    const { customerId, amount, notes, date } = req.body;
    
    if (!customerId || !amount || parseFloat(amount) <= 0) {
        return res.status(400).json({ error: 'Missing required fields or invalid amount' });
    }

    try {
        await db.exec('BEGIN');

        const customer = await db.prepare('SELECT * FROM credit_customers WHERE id = ?').get(customerId);
        if (!customer) throw new Error('Customer not found');

        if (customer.status !== 'active') {
            throw new Error('Customer account is not active or blocked');
        }

        const amt = parseFloat(amount);
        const currentBalance = parseFloat(customer.outstanding_balance) || 0;
        const creditLimit = parseFloat(customer.credit_limit) || 0;
        const remainingLimit = creditLimit - currentBalance;

        if (amt > remainingLimit) {
            throw new Error(
                `Credit limit exceeded for ${customer.full_name}. ` +
                `Available: $${remainingLimit.toFixed(2)}, Required: $${amt.toFixed(2)}.`
            );
        }

        const transactionId = uuidv4();
        const transactionUID = `CR-TXN-MANUAL-${uuidv4().slice(0, 8).toUpperCase()}`;
        const txDate = date || new Date().toISOString().split('T')[0];

        // 1. Insert into credit_transactions
        await db.prepare(`
            INSERT INTO credit_transactions (id, transaction_id, customer_id, items_summary, total_amount, amount_paid, remaining_balance, status, staff_id, staff_name, date)
            VALUES (?, ?, ?, ?, ?, 0.00, ?, 'unpaid', ?, ?, ?)
        `).run(
            transactionId, transactionUID, customerId, 
            notes || 'Manual Credit Adjustment',
            amt, amt, req.user.id, req.user.name, txDate
        );

        // 2. Update Customer Balance
        const newBalance = currentBalance + amt;
        const newTotalCredit = (parseFloat(customer.total_credit_taken) || 0) + amt;

        await db.prepare(`
            UPDATE credit_customers 
            SET outstanding_balance = ?, total_credit_taken = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(newBalance, newTotalCredit, customerId);

        // 3. Add to Ledger
        await db.prepare(`
            INSERT INTO credit_ledger (id, customer_id, date, description, type, amount, running_balance, reference_id)
            VALUES (?, ?, ?, ?, 'debit', ?, ?, ?)
        `).run(
            uuidv4(), customerId, txDate, 
            notes || `Manual Credit Adjustment`,
            amt, newBalance, transactionUID
        );

        await db.exec('COMMIT');

        logAction(req.user.id, req.user.name, req.user.role, 'CREATE', 'Credit', `Recorded manual credit: ${amt} for ${customer.full_name}`, req.ip);

        res.status(201).json({ message: 'Credit balance added successfully', newBalance });
    } catch (err) {
        await db.exec('ROLLBACK');
        res.status(500).json({ error: err.message });
    }
});

// GET /api/credit/transactions - Global history
router.get('/transactions', async (req, res) => {
    try {
        const transactions = await db.prepare(`
            SELECT t.*, c.full_name as customer_name 
            FROM credit_transactions t
            JOIN credit_customers c ON t.customer_id = c.id
            ORDER BY t.created_at DESC
        `).all();
        res.json(transactions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/credit/transactions/:id/pay - Pay off a specific transaction partially or fully
router.put('/transactions/:id/pay', async (req, res) => {
    const { id } = req.params;
    const { paymentMethod, referenceNotes, amount, discountAmount } = req.body;
    
    try {
        console.log(`💳 Processing payment for transaction ${id}, amount: ${amount}, method: ${paymentMethod}, discount: ${discountAmount}`);
        await db.exec('BEGIN');
        
        const txn = await db.prepare('SELECT * FROM credit_transactions WHERE id = ?').get(id);
        if (!txn) {
            console.warn(`⚠️ Transaction ${id} not found`);
            throw new Error('Transaction not found');
        }
        if (parseFloat(txn.remaining_balance) <= 0) throw new Error('Transaction already paid');
        
        const remainingBalance = parseFloat(txn.remaining_balance);

        // Apply discount first
        const discount = Math.max(0, parseFloat(discountAmount) || 0);
        if (discount > remainingBalance) throw new Error('Discount cannot exceed the remaining balance');

        const balanceAfterDiscount = remainingBalance - discount;

        // Determine the actual cash amount to pay (on top of discount)
        const requestAmount = amount != null ? parseFloat(amount) : balanceAfterDiscount;
        if (requestAmount < 0) throw new Error('Invalid payment amount');
        
        // Cap payment at remaining after discount
        const amt = Math.min(requestAmount, balanceAfterDiscount);
        const totalSettled = amt + discount; // total reduction to the balance
        const customerId = txn.customer_id;
        
        const customer = await db.prepare('SELECT * FROM credit_customers WHERE id = ?').get(customerId);
        if (!customer) throw new Error('Customer not found');

        // Update transaction
        const oldAmountPaid = parseFloat(txn.amount_paid) || 0;
        const oldRemaining = parseFloat(txn.remaining_balance);
        const newAmountPaid = oldAmountPaid + totalSettled;
        const newRemaining = Math.max(0, oldRemaining - totalSettled);
        const newStatus = newRemaining <= 0 ? 'paid' : 'partial';

        await db.prepare(`
            UPDATE credit_transactions 
            SET amount_paid = ?, remaining_balance = ?, status = ?
            WHERE id = ?
        `).run(newAmountPaid, newRemaining, newStatus, id);

        // Also update the linked pharmacy_transactions row so the Pharmacy Financial Hub
        // shows the correct payment method (the one selected by the pharmacist) and paid amount.
        if (txn.invoice_id) {
            const pharmTx = await db.prepare(`SELECT id, paid_amount, total_amount, credit_amount FROM pharmacy_transactions WHERE id = ?`).get(txn.invoice_id);
            if (pharmTx) {
                const newPharmPaid = Math.min(
                    parseFloat(pharmTx.total_amount) || 0,
                    (parseFloat(pharmTx.paid_amount) || 0) + amt
                );
                const newPharmCredit = Math.max(0, (parseFloat(pharmTx.credit_amount) || 0) - totalSettled);
                const newPharmStatus = newPharmCredit <= 0 ? 'Paid' : 'Partial';
                await db.prepare(`
                    UPDATE pharmacy_transactions
                    SET paid_amount = ?, credit_amount = ?, payment_method = ?, status = ?
                    WHERE id = ?
                `).run(newPharmPaid, newPharmCredit, paymentMethod || 'cash', newPharmStatus, pharmTx.id);
            }
        }

        const paymentId = uuidv4();
        const paymentUID = `PAY-CR-${Math.floor(10000 + Math.random() * 90000)}`;
        const payDate = new Date().toISOString().split('T')[0];
        const method = paymentMethod || 'cash';

        // 1. Record payment (cash portion only)
        if (amt > 0) {
            await db.prepare(`
                INSERT INTO credit_payments (id, payment_id, customer_id, amount, payment_method, reference_notes, date, staff_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(paymentId, paymentUID, customerId, amt, method, referenceNotes || `Paid Txn: ${txn.transaction_id}`, payDate, req.user.id);
        }

        // 2. Update customer balance
        const newBalance = Math.max(0, parseFloat(customer.outstanding_balance) - totalSettled);
        const totalPayments = parseFloat(customer.total_payments_made) + amt;
        
        await db.prepare(`
            UPDATE credit_customers 
            SET outstanding_balance = ?, total_payments_made = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(newBalance, totalPayments, customerId);

        // 3. Add to ledger (cash payment)
        if (amt > 0) {
            await db.prepare(`
                INSERT INTO credit_ledger (id, customer_id, date, description, type, amount, running_balance, reference_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(uuidv4(), customerId, payDate, `Repayment via ${method.toUpperCase()} (Txn ${txn.transaction_id})`, 'credit', amt, newBalance, paymentUID);
        }

        // 4. Add to ledger (discount portion)
        if (discount > 0) {
            await db.prepare(`
                INSERT INTO credit_ledger (id, customer_id, date, description, type, amount, running_balance, reference_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(uuidv4(), customerId, payDate, `Discount applied (Txn ${txn.transaction_id})`, 'credit', discount, newBalance, paymentUID);
        }

        // 5. Record cash payment as income in main accounts (hospital revenue)
        //    — goes under the correct payment method so ZAAD/Sahal etc. receipts update correctly
        if (amt > 0) {
            await db.prepare(`
                INSERT INTO account_entries (id, date, type, category, description, amount, payment_method, reference_id, department, status, user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                uuidv4(), payDate, 'income', 'Credit Repayment',
                `Credit Repayment from ${customer.full_name} via ${method.toUpperCase()} (${paymentUID})`,
                amt, method, paymentUID, 'Finance', 'completed', req.user.id
            );
        }

        // 6. Record discount as a separate discount entry in account_entries
        if (discount > 0) {
            await db.prepare(`
                INSERT INTO account_entries (id, date, type, category, description, amount, payment_method, reference_id, department, status, user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                uuidv4(), payDate, 'expense', 'Credit Discount',
                `Discount granted to ${customer.full_name} on credit balance (${paymentUID})`,
                discount, method, paymentUID, 'Finance', 'completed', req.user.id
            );
        }

        await db.exec('COMMIT');
        
        logAction(req.user.id, req.user.name, req.user.role, 'UPDATE', 'Credit', `Paid transaction ${txn.transaction_id} | Paid: $${amt} | Discount: $${discount}`, req.ip);
        
        res.status(200).json({ 
            message: 'Transaction paid successfully', 
            newBalance,
            amountPaid: amt,
            discountApplied: discount
        });
    } catch (err) {
        await db.exec('ROLLBACK');
        res.status(500).json({ error: err.message });
    }
});


// GET /api/credit/stats - Summary for dashboard
router.get('/stats', async (req, res) => {
    try {
        const stats = await db.prepare(`
            SELECT 
                SUM(outstanding_balance) as total_outstanding,
                COUNT(*) as total_customers,
                (SELECT COUNT(*) FROM credit_customers WHERE outstanding_balance > credit_limit) as limit_exceeded_count
            FROM credit_customers
        `).get();
        
        const recentTransactions = await db.prepare(`
            SELECT t.*, c.full_name as customer_name 
            FROM credit_transactions t
            JOIN credit_customers c ON t.customer_id = c.id
            ORDER BY t.created_at DESC LIMIT 5
        `).all();

        res.json({ stats, recentTransactions });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
