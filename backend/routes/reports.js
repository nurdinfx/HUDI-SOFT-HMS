const express = require('express');
const db = require('../database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// Revenue report
router.get('/revenue', async (req, res) => {
    const { period } = req.query; // 'daily', 'monthly', 'yearly'
    let groupBy = "date";
    if (period === 'monthly') groupBy = "TO_CHAR(date::date, 'YYYY-MM')";
    if (period === 'yearly') groupBy = "TO_CHAR(date::date, 'YYYY')";

    try {
        const data = await db.prepare(`
            SELECT ${groupBy} as period, SUM(paid_amount) as revenue, SUM(total) as billed, COUNT(*) as invoices 
            FROM invoices 
            GROUP BY period 
            ORDER BY period DESC 
            LIMIT 30
        `).all();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Advanced Financial Report (Profit & Loss, Dept Breakdown)
router.get('/financial', async (req, res) => {
    try {
        const incomeByDept = await db.prepare(`
            SELECT department, SUM(amount) as amount 
            FROM account_entries 
            WHERE type = 'income' 
            GROUP BY department
        `).all();

        const expenseByCategory = await db.prepare(`
            SELECT category, SUM(amount) as amount 
            FROM account_entries 
            WHERE type = 'expense' 
            GROUP BY category
        `).all();

        const monthlyTrend = await db.prepare(`
            SELECT 
                TO_CHAR(date::date, 'YYYY-MM') as month,
                SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
                SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
            FROM account_entries
            GROUP BY month
            ORDER BY month DESC
            LIMIT 12
        `).all();

        res.json({
            incomeByDept,
            expenseByCategory,
            monthlyTrend: monthlyTrend.reverse()
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Patient statistics
router.get('/patients', async (req, res) => {
    try {
        const byGender = await db.prepare('SELECT gender, COUNT(*) as count FROM patients GROUP BY gender').all();
        const byStatus = await db.prepare('SELECT status, COUNT(*) as count FROM patients GROUP BY status').all();
        const byBloodGroup = await db.prepare('SELECT blood_group, COUNT(*) as count FROM patients WHERE blood_group IS NOT NULL GROUP BY blood_group').all();
        const newThisMonth = await db.prepare("SELECT COUNT(*) as c FROM patients WHERE TO_CHAR(registered_at, 'YYYY-MM') = TO_CHAR(CURRENT_DATE, 'YYYY-MM')").get();
        res.json({ byGender, byStatus, byBloodGroup, newThisMonth: newThisMonth.c });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Appointment statistics
router.get('/appointments', async (req, res) => {
    try {
        const byType = await db.prepare('SELECT type, COUNT(*) as count FROM appointments GROUP BY type').all();
        const byStatus = await db.prepare('SELECT status, COUNT(*) as count FROM appointments GROUP BY status').all();
        const byDepartment = await db.prepare('SELECT department, COUNT(*) as count FROM appointments GROUP BY department ORDER BY count DESC').all();
        const byMonth = await db.prepare("SELECT TO_CHAR(date::date, 'YYYY-MM') as month, COUNT(*) as count FROM appointments GROUP BY month ORDER BY month DESC LIMIT 12").all();
        res.json({ byType, byStatus, byDepartment, byMonth });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Lab statistics
router.get('/laboratory', async (req, res) => {
    try {
        const byCategory = await db.prepare('SELECT test_category, COUNT(*) as count FROM lab_tests GROUP BY test_category ORDER BY count DESC').all();
        const byStatus = await db.prepare('SELECT status, COUNT(*) as count FROM lab_tests GROUP BY status').all();
        const byPriority = await db.prepare('SELECT priority, COUNT(*) as count FROM lab_tests GROUP BY priority').all();
        const stats = await db.prepare("SELECT SUM(amount) as total FROM account_entries WHERE department = 'Laboratory' AND type = 'income'").get();
        res.json({ byCategory, byStatus, byPriority, totalRevenue: stats.total || 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Pharmacy statistics
router.get('/pharmacy', async (req, res) => {
    try {
        const byCategory = await db.prepare('SELECT category, COUNT(*) as count FROM medicines GROUP BY category').all();
        const byStatus = await db.prepare('SELECT status, COUNT(*) as count FROM medicines GROUP BY status').all();
        const lowStock = await db.prepare("SELECT COUNT(*) as count FROM medicines WHERE status IN ('low-stock','out-of-stock')").get();
        const expiringSoon = await db.prepare("SELECT COUNT(*) as count FROM medicines WHERE expiry_date <= CURRENT_DATE + INTERVAL '90 days' AND expiry_date >= CURRENT_DATE").get();
        const sales = await db.prepare("SELECT SUM(amount) as total FROM account_entries WHERE department = 'Pharmacy' AND type = 'income'").get();
        res.json({ byCategory, byStatus, lowStock: lowStock.count, expiringSoon: expiringSoon.count, totalSales: sales.total || 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
