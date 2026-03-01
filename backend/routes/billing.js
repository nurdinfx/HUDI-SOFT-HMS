const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { authenticate, logAction } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const fmt = (i) => ({
    id: i.id, invoiceId: i.invoice_id, patientId: i.patient_id, patientName: i.patient_name,
    date: i.date, dueDate: i.due_date, items: JSON.parse(i.items || '[]'),
    subtotal: i.subtotal, tax: i.tax, discount: i.discount, total: i.total,
    paidAmount: i.paid_amount, status: i.status, paymentMethod: i.payment_method,
    insuranceClaim: i.insurance_claim, notes: i.notes
});

router.get('/', async (req, res) => {
    const { search, status, patientId } = req.query;
    let q = 'SELECT * FROM invoices WHERE 1=1'; const p = [];
    if (search) { q += ` AND (patient_name LIKE ? OR invoice_id LIKE ?)`; const s = `%${search}%`; p.push(s, s); }
    if (status) { q += ' AND status = ?'; p.push(status); }
    if (patientId) { q += ' AND patient_id = ?'; p.push(patientId); }
    q += ' ORDER BY date DESC';
    try {
        const rows = await db.prepare(q).all(...p);
        res.json(rows.map(fmt));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const row = await db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
        if (!row) return res.status(404).json({ error: 'Invoice not found' });
        res.json(fmt(row));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', async (req, res) => {
    const { patientId, items, discount, notes, dueDate, paymentMethod } = req.body;
    if (!patientId || !items || !Array.isArray(items)) return res.status(400).json({ error: 'patientId and items[] required' });

    try {
        const patient = await db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId);
        if (!patient) return res.status(404).json({ error: 'Patient not found' });

        const countData = await db.prepare('SELECT COUNT(*) as c FROM invoices').get();
        const invId = `INV-${String(parseInt(countData.c) + 1).padStart(4, '0')}`;

        const subtotal = items.reduce((s, item) => s + (item.total || item.quantity * item.unitPrice || 0), 0);
        const settings = await db.prepare('SELECT tax_rate FROM hospital_settings WHERE id = 1').get();
        const taxRate = settings ? settings.tax_rate : 10;
        const disc = parseFloat(discount) || 0;
        const tax = subtotal * (taxRate / 100);
        const total = subtotal + tax - disc;
        const today = new Date().toISOString().split('T')[0];
        const due = dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const id = uuidv4();

        await db.prepare(`INSERT INTO invoices (id, invoice_id, patient_id, patient_name, date, due_date, items, subtotal, tax, discount, total, paid_amount, status, payment_method, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(id, invId, patientId, `${patient.first_name} ${patient.last_name}`, today, due, JSON.stringify(items), subtotal, tax, disc, total, 0, 'unpaid', paymentMethod || null, notes || null);

        logAction(req.user.id, req.user.name, req.user.role, 'CREATE', 'Billing', `Invoice created: ${invId}`, req.ip);
        const row = await db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
        res.status(201).json(fmt(row));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const row = await db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
        if (!row) return res.status(404).json({ error: 'Invoice not found' });

        const { status, paidAmount, paymentMethod, notes, discount } = req.body;
        const prevPaid = row.paid_amount || 0;
        const paid = paidAmount !== undefined ? parseFloat(paidAmount) : prevPaid;
        const paymentIncrement = paid - prevPaid;

        const disc = discount !== undefined ? parseFloat(discount) : row.discount;
        const total = row.subtotal + row.tax - disc;

        let newStatus = status || row.status;
        if (paidAmount !== undefined) {
            if (paid >= total) newStatus = 'paid';
            else if (paid > 0) newStatus = 'partial';
            else newStatus = 'unpaid';
        }

        await db.exec('BEGIN');

        await db.prepare('UPDATE invoices SET status=?, paid_amount=?, payment_method=?, notes=?, discount=?, total=? WHERE id=?')
            .run(newStatus, paid, paymentMethod ?? row.payment_method, notes ?? row.notes, disc, total, req.params.id);

        if (paymentIncrement > 0) {
            const entryId = uuidv4();
            await db.prepare(`
                INSERT INTO account_entries (id, date, type, category, description, amount, payment_method, reference_id, department, status, user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                entryId,
                new Date().toISOString().split('T')[0],
                'income',
                'Patient Payment',
                `Payment for Invoice ${row.invoice_id} (${row.patient_name})`,
                paymentIncrement,
                paymentMethod || 'cash',
                row.invoice_id,
                'Billing',
                'completed',
                req.user.id
            );
        }

        await db.exec('COMMIT');

        logAction(req.user.id, req.user.name, req.user.role, 'UPDATE', 'Billing', `Invoice ${row.invoice_id} updated. Payment: $${paymentIncrement}`, req.ip);
        const updatedRow = await db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
        res.json(fmt(updatedRow));
    } catch (err) {
        await db.exec('ROLLBACK');
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const row = await db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
        if (!row) return res.status(404).json({ error: 'Not found' });
        await db.prepare('DELETE FROM invoices WHERE id = ?').run(req.params.id);
        logAction(req.user.id, req.user.name, req.user.role, 'DELETE', 'Billing', `Invoice ${row.invoice_id} deleted`, req.ip);
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
