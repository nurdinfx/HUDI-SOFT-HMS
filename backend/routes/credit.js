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
    try {
        const { id } = req.params;
        await db.prepare("DELETE FROM credit_transactions WHERE customer_id = ?").run(id);
        await db.prepare("DELETE FROM credit_customers WHERE id = ?").run(id);
        res.json({ message: "Customer deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── TRANSACTIONS ────────────────────────────────────────────────
// POST /api/credit/payments - Record a repayment
router.post('/payments', async (req, res) => {
    const { customerId, amount, paymentMethod, referenceNotes, date } = req.body;
    
    if (!customerId || !amount || !paymentMethod) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        await db.exec('BEGIN');

        const customer = await db.prepare('SELECT * FROM credit_customers WHERE id = ?').get(customerId);
        if (!customer) throw new Error('Customer not found');

        const paymentId = uuidv4();
        const paymentUID = `PAY-CR-${Math.floor(10000 + Math.random() * 90000)}`;
        const payDate = date || new Date().toISOString().split('T')[0];
        const amt = parseFloat(amount);

        // 1. Record payment
        await db.prepare(`
            INSERT INTO credit_payments (id, payment_id, customer_id, amount, payment_method, reference_notes, date, staff_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(paymentId, paymentUID, customerId, amt, paymentMethod, referenceNotes, payDate, req.user.id);

        // 2. Update customer balance
        const newBalance = parseFloat(customer.outstanding_balance) - amt;
        const totalPayments = parseFloat(customer.total_payments_made) + amt;
        
        await db.prepare(`
            UPDATE credit_customers 
            SET outstanding_balance = ?, total_payments_made = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(newBalance, totalPayments, customerId);

        // 3. Add to ledger
        await db.prepare(`
            INSERT INTO credit_ledger (id, customer_id, date, description, type, amount, running_balance, reference_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(uuidv4(), customerId, payDate, `Repayment: ${paymentUID}`, 'credit', amt, newBalance, paymentUID);

        // 4. Record as income in main accounts
        await db.prepare(`
            INSERT INTO account_entries (id, date, type, category, description, amount, payment_method, reference_id, department, status, user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            uuidv4(), payDate, 'income', 'Credit Repayment',
            `Credit Repayment from ${customer.full_name} (${paymentUID})`,
            amt, paymentMethod, paymentUID, 'Finance', 'completed', req.user.id
        );

        await db.exec('COMMIT');
        
        logAction(req.user.id, req.user.name, req.user.role, 'CREATE', 'Credit', `Recorded repayment: ${amt} for ${customer.full_name}`, req.ip);
        
        res.status(201).json({ message: 'Payment recorded successfully', newBalance });
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
