const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { authenticate, logAction } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const fmtOps = (row) => ({
    id: row.id,
    employeeId: row.employee_id,
    employeeName: row.employee_name,
    department: row.department,
    transactionType: row.transaction_type,
    labTestId: row.lab_test_id,
    labTestName: row.lab_test_name,
    amount: parseFloat(row.amount || 0),
    description: row.description,
    date: row.date,
    recordedBy: row.recorded_by,
    createdAt: row.created_at
});

// GET summary metrics
router.get('/summary', async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        const metrics = await db.prepare(`
            SELECT 
                SUM(CASE WHEN transaction_type = 'Operational Expense' THEN amount ELSE 0 END) as expenses,
                SUM(CASE WHEN transaction_type = 'Cash Received' THEN amount ELSE 0 END) as cash_received,
                COUNT(CASE WHEN transaction_type = 'Staff Laboratory Test' THEN 1 END) as lab_tests,
                SUM(CASE WHEN transaction_type = 'Cash Received' THEN amount 
                         WHEN transaction_type = 'Operational Expense' THEN -amount 
                         ELSE 0 END) as net_balance
            FROM daily_operations
            WHERE date = ?
        `).get(today);

        res.json({
            expenses: parseFloat(metrics.expenses || 0),
            cashReceived: parseFloat(metrics.cash_received || 0),
            labTests: parseInt(metrics.lab_tests || 0),
            netBalance: parseFloat(metrics.net_balance || 0)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET all records
router.get('/', async (req, res) => {
    try {
        const { date, transactionType, employeeId } = req.query;
        let q = 'SELECT * FROM daily_operations WHERE 1=1';
        const params = [];

        if (date) { q += ' AND date = ?'; params.push(date); }
        if (transactionType && transactionType !== 'all') { q += ' AND transaction_type = ?'; params.push(transactionType); }
        if (employeeId && employeeId !== 'all') { q += ' AND employee_id = ?'; params.push(employeeId); }

        q += ' ORDER BY created_at DESC';

        const rows = await db.prepare(q).all(...params);
        res.json(rows.map(fmtOps));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET single record
router.get('/:id', async (req, res) => {
    try {
        const row = await db.prepare('SELECT * FROM daily_operations WHERE id = ?').get(req.params.id);
        if (!row) return res.status(404).json({ error: 'Record not found' });
        res.json(fmtOps(row));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST new record
router.post('/', async (req, res) => {
    const { employeeId, department, transactionType, labTestId, amount, description, date } = req.body;
    
    if (!employeeId || !transactionType) {
        return res.status(400).json({ error: 'employeeId and transactionType are required' });
    }

    try {
        const emp = await db.prepare('SELECT full_name FROM employees WHERE id = ?').get(employeeId);
        if (!emp) return res.status(404).json({ error: 'Employee not found' });

        let labTestName = null;
        if (labTestId) {
            const lab = await db.prepare('SELECT name FROM lab_catalog WHERE id = ?').get(labTestId);
            if (lab) labTestName = lab.name;
        }

        const id = uuidv4();
        const opDate = date || new Date().toISOString().split('T')[0];

        await db.prepare(`
            INSERT INTO daily_operations (
                id, employee_id, employee_name, department, transaction_type, 
                lab_test_id, lab_test_name, amount, description, date, recorded_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            id, employeeId, emp.full_name, department || null, transactionType,
            labTestId || null, labTestName, amount || 0, description || null,
            opDate, req.user.name
        );

        const newRow = await db.prepare('SELECT * FROM daily_operations WHERE id = ?').get(id);
        logAction(req.user.id, req.user.name, req.user.role, 'CREATE', 'Daily Operations', `Created ${transactionType} record for ${emp.full_name}`, req.ip);
        
        res.status(201).json(fmtOps(newRow));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT update record
router.put('/:id', async (req, res) => {
    const { employeeId, department, transactionType, labTestId, amount, description, date } = req.body;
    try {
        const row = await db.prepare('SELECT * FROM daily_operations WHERE id = ?').get(req.params.id);
        if (!row) return res.status(404).json({ error: 'Record not found' });

        let empName = row.employee_name;
        if (employeeId && employeeId !== row.employee_id) {
            const emp = await db.prepare('SELECT full_name FROM employees WHERE id = ?').get(employeeId);
            if (emp) empName = emp.full_name;
        }

        let labTestName = row.lab_test_name;
        if (labTestId && labTestId !== row.lab_test_id) {
            const lab = await db.prepare('SELECT name FROM lab_catalog WHERE id = ?').get(labTestId);
            if (lab) labTestName = lab.name;
        }

        await db.prepare(`
            UPDATE daily_operations SET 
                employee_id = ?, employee_name = ?, department = ?, transaction_type = ?,
                lab_test_id = ?, lab_test_name = ?, amount = ?, description = ?, date = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(
            employeeId || row.employee_id,
            empName,
            department !== undefined ? department : row.department,
            transactionType || row.transaction_type,
            labTestId !== undefined ? labTestId : row.lab_test_id,
            labTestName,
            amount !== undefined ? amount : row.amount,
            description !== undefined ? description : row.description,
            date || row.date,
            req.params.id
        );

        logAction(req.user.id, req.user.name, req.user.role, 'UPDATE', 'Daily Operations', `Updated record ${req.params.id}`, req.ip);
        
        const updatedRow = await db.prepare('SELECT * FROM daily_operations WHERE id = ?').get(req.params.id);
        res.json(fmtOps(updatedRow));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE record
router.delete('/:id', async (req, res) => {
    try {
        const row = await db.prepare('SELECT * FROM daily_operations WHERE id = ?').get(req.params.id);
        if (!row) return res.status(404).json({ error: 'Record not found' });

        await db.prepare('DELETE FROM daily_operations WHERE id = ?').run(req.params.id);
        logAction(req.user.id, req.user.name, req.user.role, 'DELETE', 'Daily Operations', `Deleted record ${req.params.id}`, req.ip);
        
        res.json({ message: 'Record deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
