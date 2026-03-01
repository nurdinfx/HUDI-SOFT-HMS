const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { authenticate, logAction } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const fmt = (e) => ({
    id: e.id,
    date: e.date,
    type: e.type,
    category: e.category,
    description: e.description,
    amount: e.amount,
    paymentMethod: e.payment_method,
    referenceId: e.reference_id,
    department: e.department,
    status: e.status,
    userId: e.user_id
});

// GET all entries with filtering
router.get('/', async (req, res) => {
    const { type, category, department, status, startDate, endDate } = req.query;
    let q = 'SELECT * FROM account_entries WHERE 1=1';
    const p = [];

    if (type) { q += ' AND type = ?'; p.push(type); }
    if (category) { q += ' AND category = ?'; p.push(category); }
    if (department) { q += ' AND department = ?'; p.push(department); }
    if (status) { q += ' AND status = ?'; p.push(status); }
    if (startDate) { q += ' AND date >= ?'; p.push(startDate); }
    if (endDate) { q += ' AND date <= ?'; p.push(endDate); }

    q += ' ORDER BY date DESC';
    try {
        const rows = await db.prepare(q).all(...p);
        res.json(rows.map(fmt));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET Financial Summary (Dashboard KPIs)
router.get('/summary', async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const month = today.substring(0, 7) + '%';

        const stats = await db.prepare(`
            SELECT 
                SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as "totalIncome",
                SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as "totalExpense",
                SUM(CASE WHEN type = 'income' AND date = ? THEN amount ELSE 0 END) as "incomeToday",
                SUM(CASE WHEN type = 'income' AND TO_CHAR(date, 'YYYY-MM') LIKE ? THEN amount ELSE 0 END) as "incomeMonth"
            FROM account_entries
        `).get(today, month);

        const deptBreakdown = await db.prepare(`
            SELECT department, SUM(amount) as amount 
            FROM account_entries 
            WHERE type = 'income' 
            GROUP BY department
        `).all();

        const paymentModeBreakdown = await db.prepare(`
            SELECT payment_method as method, SUM(amount) as amount 
            FROM account_entries 
            WHERE type = 'income' 
            GROUP BY payment_method
        `).all();

        const recentEntries = await db.prepare('SELECT * FROM account_entries ORDER BY date DESC LIMIT 5').all();

        res.json({
            totalIncome: parseFloat(stats?.totalIncome || 0),
            totalExpense: parseFloat(stats?.totalExpense || 0),
            profit: parseFloat(stats?.totalIncome || 0) - parseFloat(stats?.totalExpense || 0),
            incomeToday: parseFloat(stats?.incomeToday || 0),
            incomeMonth: parseFloat(stats?.incomeMonth || 0),
            departmentRevenue: deptBreakdown || [],
            paymentModeRevenue: paymentModeBreakdown || [],
            recentEntries: recentEntries.map(fmt) || []
        });
    } catch (error) {
        console.error('❌ Accounts Summary Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET Cash Flow Data (last 6 months)
router.get('/analytics/cashflow', async (req, res) => {
    try {
        // PostgreSQL equivalent for strftime: TO_CHAR(date::date, 'YYYY-MM')
        const data = await db.prepare(`
            SELECT 
                TO_CHAR(date::date, 'YYYY-MM') as month,
                SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
                SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
            FROM account_entries
            GROUP BY month
            ORDER BY month DESC
            LIMIT 6
        `).all();
        res.json(data.reverse());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST new entry
router.post('/', async (req, res) => {
    const { date, type, category, description, amount, paymentMethod, referenceId, department, status } = req.body;
    if (!type || !category || !description || !amount) {
        return res.status(400).json({ error: 'type, category, description, amount required' });
    }

    const id = uuidv4();
    try {
        await db.prepare(`
            INSERT INTO account_entries (id, date, type, category, description, amount, payment_method, reference_id, department, status, user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            id,
            date || new Date().toISOString().split('T')[0],
            type,
            category,
            description,
            parseFloat(amount),
            paymentMethod || 'cash',
            referenceId || null,
            department || 'General',
            status || 'completed',
            req.user.id
        );

        logAction(req.user.id, req.user.name, req.user.role, 'CREATE', 'Accounts', `Financial Entry: ${type} - ${description} ($${amount})`, req.ip);
        const row = await db.prepare('SELECT * FROM account_entries WHERE id = ?').get(id);
        res.status(201).json(fmt(row));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT update entry
router.put('/:id', async (req, res) => {
    try {
        const row = await db.prepare('SELECT * FROM account_entries WHERE id = ?').get(req.params.id);
        if (!row) return res.status(404).json({ error: 'Not found' });

        const { date, type, category, description, amount, paymentMethod, department, status } = req.body;
        await db.prepare(`
            UPDATE account_entries 
            SET date=?, type=?, category=?, description=?, amount=?, payment_method=?, department=?, status=? 
            WHERE id=?
        `).run(
            date || row.date,
            type || row.type,
            category || row.category,
            description || row.description,
            amount || row.amount,
            paymentMethod || row.payment_method,
            department || row.department,
            status || row.status,
            req.params.id
        );

        logAction(req.user.id, req.user.name, req.user.role, 'UPDATE', 'Accounts', `Updated Entry: ${req.params.id}`, req.ip);
        const updatedRow = await db.prepare('SELECT * FROM account_entries WHERE id = ?').get(req.params.id);
        res.json(fmt(updatedRow));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE entry
router.delete('/:id', async (req, res) => {
    try {
        await db.prepare('DELETE FROM account_entries WHERE id = ?').run(req.params.id);
        logAction(req.user.id, req.user.name, req.user.role, 'DELETE', 'Accounts', `Deleted Entry: ${req.params.id}`, req.ip);
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- BUDGETING ENDPOINTS ---

// GET all budgets
router.get('/budgets', async (req, res) => {
    try {
        const rows = await db.prepare('SELECT * FROM department_budgets').all();
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST/PUT budget
router.post('/budgets', async (req, res) => {
    const { department, budgetAmount, period } = req.body;
    if (!department || !budgetAmount) {
        return res.status(400).json({ error: 'department and budgetAmount required' });
    }

    try {
        // ON CONFLICT requires a unique constraint. In PG: INSERT INTO ... ON CONFLICT (department) DO UPDATE SET ...
        await db.prepare(`
            INSERT INTO department_budgets (id, department, budget_amount, period)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(department) DO UPDATE SET 
                budget_amount = EXCLUDED.budget_amount,
                period = EXCLUDED.period
        `).run(uuidv4(), department, parseFloat(budgetAmount), period || 'Monthly');

        logAction(req.user.id, req.user.name, req.user.role, 'UPDATE', 'Accounts', `Set budget for ${department}: ${budgetAmount}`, req.ip);
        res.json({ message: 'Budget updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
