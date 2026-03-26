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

        // 2. Fetch manual revenue data instead of calculated data
        let query = `
            SELECT department, category, amount as revenue
            FROM manual_daily_revenue
            WHERE 1=1
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

        const rawData = await db.prepare(query).all(...params);

        // 3. Structure data for the frontend (Matrix)
        const report = departments.map(dept => {
            const row = { department: dept.name, totals: {} };
            let deptTotal = 0;

            categories.forEach(cat => {
                const matchs = rawData.filter(d => d.department === dept.name && d.category === cat.name);
                const val = matchs.reduce((sum, m) => sum + parseFloat(m.revenue), 0);
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

        // 5. System Values (Payment Methods, Daymaha, Expenses)
        let sysQuery = `SELECT department as key, SUM(amount) as value FROM manual_daily_revenue WHERE category = 'SYSTEM_VALUES'`;
        const sysParams = [];
        if (startDate) { sysQuery += ' AND date >= ?'; sysParams.push(startDate); }
        if (endDate) { sysQuery += ' AND date <= ?'; sysParams.push(endDate); }
        sysQuery += ' GROUP BY department';
        const systemValuesRaw = await db.prepare(sysQuery).all(...sysParams);
        
        const systemValues = {};
        systemValuesRaw.forEach(row => {
            systemValues[row.key] = parseFloat(row.value) || 0;
        });

        // Calculate legacy fields from systemValues just in case anything else uses them.
        const totalExpenses = parseFloat(systemValues['EXPENSES']) || 0;
        const autoNetIncome = grandTotal - totalExpenses;

        res.json({
            columns: categories.map(c => c.name),
            rows: report,
            columnTotals,
            grandTotal,
            paymentBreakdown: [], // Deprecated in favor of systemValues
            totalExpenses,
            netIncome: autoNetIncome,
            systemValues
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/revenue-analytics/report/cell
router.post('/report/cell', authorize(['admin']), async (req, res) => {
    const { date, department, category, amount } = req.body;
    if (!date || !department || !category) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    try {
        const id = uuidv4();
        // Since sqlite (local) uses REPLACE or INSERT ON CONFLICT depending on version, 
        // Postgres uses INSERT ON CONFLICT. Our wrapper converts INSERT to correct DB syntax, 
        // but it's safer to delete and insert for compatibility across environments.
        await db.prepare('DELETE FROM manual_daily_revenue WHERE date = ? AND department = ? AND category = ?')
            .run(date, department, category);
        
        if (amount !== undefined && amount !== null && amount !== '') {
            await db.prepare(`
                INSERT INTO manual_daily_revenue (id, date, department, category, amount)
                VALUES (?, ?, ?, ?, ?)
            `).run(id, date, department, category, parseFloat(amount) || 0);
        }
        
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
