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
        // We return a list of rows, where each row has dept name and revenue for each category
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

        res.json({
            columns: categories.map(c => c.name),
            rows: report,
            columnTotals,
            grandTotal
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
