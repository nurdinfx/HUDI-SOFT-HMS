const express = require('express');
const db = require('../database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET all payments (income from account_entries linked to invoices)
router.get('/', async (req, res) => {
    const { method, startDate, endDate, patientId } = req.query;
    let q = `
        SELECT ae.*, i.patient_name, i.total as invoice_total
        FROM account_entries ae
        LEFT JOIN invoices i ON ae.reference_id = i.invoice_id
        WHERE ae.type = 'income'
    `;
    const p = [];

    if (method) { q += ' AND ae.payment_method = ?'; p.push(method); }
    if (startDate) { q += ' AND ae.date >= ?'; p.push(startDate); }
    if (endDate) { q += ' AND ae.date <= ?'; p.push(endDate); }
    if (patientId) { q += ' AND i.patient_id = ?'; p.push(patientId); }

    q += ' ORDER BY ae.date DESC';

    try {
        const rows = await db.prepare(q).all(...p);
        res.json(rows.map(r => ({
            id: r.id,
            date: r.date,
            amount: r.amount,
            method: r.payment_method,
            invoiceId: r.reference_id,
            patientName: r.patient_name || 'N/A',
            invoiceTotal: r.invoice_total,
            description: r.description
        })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
