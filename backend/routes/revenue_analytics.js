const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// ─── DEPARTMENTS ─────────────────────────────────────────────────

// GET /api/revenue-analytics/departments
router.get('/departments', async (req, res) => {
    try {
        const rows = await db.prepare('SELECT * FROM departments ORDER BY name ASC').all();
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/revenue-analytics/departments
router.post('/departments', authorize(['admin']), async (req, res) => {
    const { name, code } = req.body;
    if (!name) return res.status(400).json({ error: 'Department name is required' });

    try {
        const id = uuidv4();
        await db.prepare('INSERT INTO departments (id, name, code) VALUES (?, ?, ?)').run(id, name, code || null);
        const newDept = await db.prepare('SELECT * FROM departments WHERE id = ?').get(id);
        res.status(201).json(newDept);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/revenue-analytics/departments/:id
router.put('/departments/:id', authorize(['admin']), async (req, res) => {
    const { name, code, is_active } = req.body;
    const { id } = req.params;
    if (!name) return res.status(400).json({ error: 'Department name is required' });

    try {
        await db.prepare('UPDATE departments SET name = ?, code = ?, is_active = COALESCE(?, is_active) WHERE id = ?').run(name, code || null, is_active !== undefined ? is_active : null, id);
        const updatedDept = await db.prepare('SELECT * FROM departments WHERE id = ?').get(id);
        res.json(updatedDept);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/revenue-analytics/departments/:id
router.delete('/departments/:id', authorize(['admin']), async (req, res) => {
    const { id } = req.params;
    try {
        await db.prepare('DELETE FROM departments WHERE id = ?').run(id);
        res.json({ message: 'Department deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── SERVICE CATEGORIES ──────────────────────────────────────────

// GET /api/revenue-analytics/service-categories
router.get('/service-categories', async (req, res) => {
    try {
        const rows = await db.prepare('SELECT * FROM service_categories ORDER BY name ASC').all();
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/revenue-analytics/service-categories
router.post('/service-categories', authorize(['admin']), async (req, res) => {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Category name is required' });

    try {
        const id = uuidv4();
        await db.prepare('INSERT INTO service_categories (id, name, description) VALUES (?, ?, ?)').run(id, name, description || null);
        const newCat = await db.prepare('SELECT * FROM service_categories WHERE id = ?').get(id);
        res.status(201).json(newCat);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/revenue-analytics/service-categories/:id
router.put('/service-categories/:id', authorize(['admin']), async (req, res) => {
    const { name, description, is_active } = req.body;
    const { id } = req.params;
    if (!name) return res.status(400).json({ error: 'Category name is required' });

    try {
        await db.prepare('UPDATE service_categories SET name = ?, description = ?, is_active = COALESCE(?, is_active) WHERE id = ?').run(name, description || null, is_active !== undefined ? is_active : null, id);
        const updatedCat = await db.prepare('SELECT * FROM service_categories WHERE id = ?').get(id);
        res.json(updatedCat);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/revenue-analytics/service-categories/:id
router.delete('/service-categories/:id', authorize(['admin']), async (req, res) => {
    const { id } = req.params;
    try {
        await db.prepare('DELETE FROM service_categories WHERE id = ?').run(id);
        res.json({ message: 'Service category deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── REVENUE REPORT ──────────────────────────────────────────────

// GET /api/revenue-analytics/report
router.get('/report', async (req, res) => {
    const { startDate, endDate } = req.query;
    
    try {
        // 1. Fetch all departments and service categories
        const departments = await db.prepare('SELECT name FROM departments WHERE is_active = 1 ORDER BY name ASC').all();
        const categories = await db.prepare('SELECT name FROM service_categories WHERE is_active = 1 ORDER BY name ASC').all();

        // 2. Fetch aggregated revenue data
        let query = `
            SELECT department, category, SUM(amount) as revenue
            FROM account_entries
            WHERE type = 'income' AND status = 'completed'
        `;
        const params = [];
        if (startDate) {
            query += ' AND date >= ?';
            params.push(startDate);
        }
        if (endDate) {
            query += ' AND date <= ?';
            params.push(endDate);
        }
        query += ' GROUP BY department, category';

        const rawData = await db.prepare(query).all(...params);

        // 3. Structure data for the frontend (Matrix)
        const report = departments.map(dept => {
            const row = { department: dept.name, totals: {} };
            let deptTotal = 0;

            categories.forEach(cat => {
                const match = rawData.find(d => d.department === dept.name && d.category === cat.name);
                const val = match ? parseFloat(match.revenue) : 0;
                row.totals[cat.name] = val;
                deptTotal += val;
            });

            row.rowTotal = deptTotal;
            return row;
        });

        // 4. Calculate Column Totals & Grand Total
        const columnTotals = {};
        let grandTotal = 0;
        categories.forEach(cat => {
            const total = report.reduce((sum, row) => sum + (row.totals[cat.name] || 0), 0);
            columnTotals[cat.name] = total;
            grandTotal += total;
        });

        // 5. Payment Method Breakdown
        let pmQuery = `
            SELECT payment_method, SUM(amount) as total
            FROM account_entries
            WHERE type = 'income' AND status = 'completed'
        `;
        const pmParams = [];
        if (startDate) { pmQuery += ' AND date >= ?'; pmParams.push(startDate); }
        if (endDate) { pmQuery += ' AND date <= ?'; pmParams.push(endDate); }
        pmQuery += ' GROUP BY payment_method';
        const paymentBreakdown = await db.prepare(pmQuery).all(...pmParams);

        // 6. Expenses Breakdown
        let expQuery = `
            SELECT category, department, SUM(amount) as total
            FROM account_entries
            WHERE type = 'expense' AND status = 'completed'
        `;
        const expParams = [];
        if (startDate) { expQuery += ' AND date >= ?'; expParams.push(startDate); }
        if (endDate) { expQuery += ' AND date <= ?'; expParams.push(endDate); }
        expQuery += ' GROUP BY category, department';
        const expenseRows = await db.prepare(expQuery).all(...expParams);
        const totalExpenses = expenseRows.reduce((sum, r) => sum + parseFloat(r.total || 0), 0);

        res.json({
            columns: categories.map(c => c.name),
            rows: report,
            columnTotals,
            grandTotal,
            paymentBreakdown: paymentBreakdown.map(p => ({ method: p.payment_method, total: parseFloat(p.total || 0) })),
            totalExpenses,
            netIncome: grandTotal - totalExpenses
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
