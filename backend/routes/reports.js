const express = require('express');
const db = require('../database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// Revenue report
router.get('/revenue', (req, res) => {
    const { period } = req.query; // 'daily', 'monthly', 'yearly'
    let groupBy = "date";
    if (period === 'monthly') groupBy = "strftime('%Y-%m', date)";
    if (period === 'yearly') groupBy = "strftime('%Y', date)";

    const data = db.prepare(`SELECT ${groupBy} as period, SUM(paid_amount) as revenue, SUM(total) as billed, COUNT(*) as invoices FROM invoices GROUP BY ${groupBy} ORDER BY period DESC LIMIT 30`).all();
    res.json(data);
});

// Patient statistics
router.get('/patients', (req, res) => {
    const byGender = db.prepare('SELECT gender, COUNT(*) as count FROM patients GROUP BY gender').all();
    const byStatus = db.prepare('SELECT status, COUNT(*) as count FROM patients GROUP BY status').all();
    const byBloodGroup = db.prepare('SELECT blood_group, COUNT(*) as count FROM patients WHERE blood_group IS NOT NULL GROUP BY blood_group').all();
    const newThisMonth = db.prepare("SELECT COUNT(*) as c FROM patients WHERE registered_at LIKE ?").get(new Date().toISOString().slice(0, 7) + '%').c;
    res.json({ byGender, byStatus, byBloodGroup, newThisMonth });
});

// Appointment statistics
router.get('/appointments', (req, res) => {
    const byType = db.prepare('SELECT type, COUNT(*) as count FROM appointments GROUP BY type').all();
    const byStatus = db.prepare('SELECT status, COUNT(*) as count FROM appointments GROUP BY status').all();
    const byDepartment = db.prepare('SELECT department, COUNT(*) as count FROM appointments GROUP BY department ORDER BY count DESC').all();
    const byMonth = db.prepare("SELECT strftime('%Y-%m', date) as month, COUNT(*) as count FROM appointments GROUP BY month ORDER BY month DESC LIMIT 12").all();
    res.json({ byType, byStatus, byDepartment, byMonth });
});

// Lab statistics
router.get('/laboratory', (req, res) => {
    const byCategory = db.prepare('SELECT test_category, COUNT(*) as count FROM lab_tests GROUP BY test_category ORDER BY count DESC').all();
    const byStatus = db.prepare('SELECT status, COUNT(*) as count FROM lab_tests GROUP BY status').all();
    const byPriority = db.prepare('SELECT priority, COUNT(*) as count FROM lab_tests GROUP BY priority').all();
    const totalRevenue = db.prepare('SELECT SUM(cost) as total FROM lab_tests WHERE status = ?').get('completed').total || 0;
    res.json({ byCategory, byStatus, byPriority, totalRevenue });
});

// Pharmacy statistics
router.get('/pharmacy', (req, res) => {
    const byCategory = db.prepare('SELECT category, COUNT(*) as count FROM medicines GROUP BY category').all();
    const byStatus = db.prepare('SELECT status, COUNT(*) as count FROM medicines GROUP BY status').all();
    const lowStock = db.prepare("SELECT * FROM medicines WHERE status IN ('low-stock','out-of-stock') ORDER BY quantity ASC").all();
    const expiringSoon = db.prepare("SELECT * FROM medicines WHERE expiry_date <= date('now', '+90 days') AND expiry_date >= date('now') ORDER BY expiry_date ASC").all();
    res.json({ byCategory, byStatus, lowStock: lowStock.length, expiringSoon: expiringSoon.length });
});

module.exports = router;
