const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { authenticate, logAction } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// ── Medicines ──────────────────────────────────────────────────────────────
const fmtMed = (m) => ({
    id: m.id, name: m.name, genericName: m.generic_name, category: m.category,
    manufacturer: m.manufacturer, batchNumber: m.batch_number, expiryDate: m.expiry_date,
    quantity: m.quantity, reorderLevel: m.reorder_level, unitPrice: m.unit_price,
    sellingPrice: m.selling_price, unit: m.unit, status: m.status
});

router.get('/medicines', (req, res) => {
    const { search, category, status } = req.query;
    let q = 'SELECT * FROM medicines WHERE 1=1'; const p = [];
    if (search) { q += ` AND (name LIKE ? OR generic_name LIKE ?)`; const s = `%${search}%`; p.push(s, s); }
    if (category) { q += ' AND category = ?'; p.push(category); }
    if (status) { q += ' AND status = ?'; p.push(status); }
    q += ' ORDER BY name';
    res.json(db.prepare(q).all(...p).map(fmtMed));
});

router.get('/medicines/expiring', (req, res) => {
    // Expiring in next 90 days
    const today = new Date().toISOString().split('T')[0];
    const ninetyDays = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const rows = db.prepare('SELECT * FROM medicines WHERE expiry_date BETWEEN ? AND ? ORDER BY expiry_date').all(today, ninetyDays);
    res.json(rows.map(fmtMed));
});

router.get('/medicines/low-stock', (req, res) => {
    const rows = db.prepare('SELECT * FROM medicines WHERE quantity <= reorder_level AND quantity > 0').all();
    res.json(rows.map(fmtMed));
});

router.get('/medicines/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM medicines WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Medicine not found' });
    res.json(fmtMed(row));
});

router.post('/medicines', (req, res) => {
    const { name, genericName, category, manufacturer, batchNumber, expiryDate, quantity, reorderLevel, unitPrice, sellingPrice, unit } = req.body;
    if (!name || !category) return res.status(400).json({ error: 'name and category required' });
    const id = uuidv4();
    const qty = parseInt(quantity) || 0;
    const rl = parseInt(reorderLevel) || 10;
    const status = qty === 0 ? 'out-of-stock' : qty <= rl ? 'low-stock' : 'in-stock';
    db.prepare(`INSERT INTO medicines (id, name, generic_name, category, manufacturer, batch_number, expiry_date, quantity, reorder_level, unit_price, selling_price, unit, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(id, name, genericName || null, category, manufacturer || null, batchNumber || null, expiryDate || null, qty, rl, unitPrice || 0, sellingPrice || 0, unit || 'tablet', status);
    logAction(req.user.id, req.user.name, req.user.role, 'CREATE', 'Pharmacy', `Medicine added: ${name}`, req.ip);
    res.status(201).json(fmtMed(db.prepare('SELECT * FROM medicines WHERE id = ?').get(id)));
});

router.put('/medicines/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM medicines WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    const { name, genericName, category, manufacturer, batchNumber, expiryDate, quantity, reorderLevel, unitPrice, sellingPrice, unit } = req.body;
    const qty = quantity !== undefined ? parseInt(quantity) : row.quantity;
    const rl = reorderLevel !== undefined ? parseInt(reorderLevel) : row.reorder_level;
    const status = qty === 0 ? 'out-of-stock' : qty <= rl ? 'low-stock' : 'in-stock';
    db.prepare(`UPDATE medicines SET name=?, generic_name=?, category=?, manufacturer=?, batch_number=?, expiry_date=?, quantity=?, reorder_level=?, unit_price=?, selling_price=?, unit=?, status=? WHERE id=?`)
        .run(name || row.name, genericName ?? row.generic_name, category || row.category, manufacturer ?? row.manufacturer, batchNumber ?? row.batch_number, expiryDate ?? row.expiry_date, qty, rl, unitPrice ?? row.unit_price, sellingPrice ?? row.selling_price, unit || row.unit, status, req.params.id);
    logAction(req.user.id, req.user.name, req.user.role, 'UPDATE', 'Pharmacy', `Medicine updated: ${name || row.name}`, req.ip);
    res.json(fmtMed(db.prepare('SELECT * FROM medicines WHERE id = ?').get(req.params.id)));
});

router.delete('/medicines/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM medicines WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    db.prepare('DELETE FROM medicines WHERE id = ?').run(req.params.id);
    logAction(req.user.id, req.user.name, req.user.role, 'DELETE', 'Pharmacy', `Medicine deleted: ${row.name}`, req.ip);
    res.json({ message: 'Deleted' });
});

// ── Prescriptions ──────────────────────────────────────────────────────────
const fmtRx = (p) => ({
    id: p.id, prescriptionId: p.prescription_id, patientId: p.patient_id, patientName: p.patient_name,
    doctorId: p.doctor_id, doctorName: p.doctor_name, appointmentId: p.appointment_id,
    date: p.date, diagnosis: p.diagnosis, medicines: JSON.parse(p.medicines || '[]'),
    notes: p.notes, status: p.status
});

router.get('/prescriptions', (req, res) => {
    const { patientId, status } = req.query;
    let q = 'SELECT * FROM prescriptions WHERE 1=1'; const p = [];
    if (patientId) { q += ' AND patient_id = ?'; p.push(patientId); }
    if (status) { q += ' AND status = ?'; p.push(status); }
    q += ' ORDER BY date DESC';
    res.json(db.prepare(q).all(...p).map(fmtRx));
});

router.post('/prescriptions', (req, res) => {
    const { patientId, doctorId, appointmentId, diagnosis, medicines, notes } = req.body;
    if (!patientId || !doctorId || !diagnosis) return res.status(400).json({ error: 'patientId, doctorId, diagnosis required' });
    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId);
    const doctor = db.prepare('SELECT * FROM doctors WHERE id = ?').get(doctorId);
    const count = db.prepare('SELECT COUNT(*) as c FROM prescriptions').get().c;
    const rxId = `RX-${String(count + 1).padStart(4, '0')}`;
    const id = uuidv4();
    db.prepare(`INSERT INTO prescriptions (id, prescription_id, patient_id, patient_name, doctor_id, doctor_name, appointment_id, date, diagnosis, medicines, notes, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(id, rxId, patientId, patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown', doctorId, doctor ? doctor.name : 'Unknown', appointmentId || null, new Date().toISOString().split('T')[0], diagnosis, JSON.stringify(medicines || []), notes || null, 'pending');
    logAction(req.user.id, req.user.name, req.user.role, 'CREATE', 'Pharmacy', `Prescription created: ${rxId}`, req.ip);
    res.status(201).json(fmtRx(db.prepare('SELECT * FROM prescriptions WHERE id = ?').get(id)));
});

router.put('/prescriptions/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM prescriptions WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    const { status, medicines, notes } = req.body;
    db.prepare('UPDATE prescriptions SET status=?, medicines=?, notes=? WHERE id=?')
        .run(status || row.status, medicines ? JSON.stringify(medicines) : row.medicines, notes ?? row.notes, req.params.id);
    res.json(fmtRx(db.prepare('SELECT * FROM prescriptions WHERE id = ?').get(req.params.id)));
});

router.put('/prescriptions/:id/dispense', (req, res) => {
    const rx = db.prepare('SELECT * FROM prescriptions WHERE id = ?').get(req.params.id);
    if (!rx) return res.status(404).json({ error: 'Prescription not found' });
    if (rx.status === 'dispensed') return res.status(400).json({ error: 'Prescription already dispensed' });

    const medicinesPrescribed = JSON.parse(rx.medicines || '[]');
    let totalCost = 0;
    const invoiceItems = [];
    const invId = uuidv4();
    const readableId = `PH-INV-${String(db.prepare('SELECT COUNT(*) as c FROM invoices').get().c + 1).padStart(5, '0')}`;

    try {
        db.exec('BEGIN TRANSACTION');

        // 1. Verify and Deduct Stock
        for (const med of medicinesPrescribed) {
            const medicine = db.prepare('SELECT * FROM medicines WHERE (name = ? OR generic_name = ?)').get(med.medicineName, med.medicineName);
            const qtyDispensed = med.quantity || 1;

            if (!medicine || medicine.quantity < qtyDispensed) {
                throw new Error(`Insufficient stock for ${med.medicineName}`);
            }

            const newQty = medicine.quantity - qtyDispensed;
            const newStatus = newQty === 0 ? 'out-of-stock' : newQty <= medicine.reorder_level ? 'low-stock' : 'in-stock';

            db.prepare('UPDATE medicines SET quantity = ?, status = ? WHERE id = ?')
                .run(newQty, newStatus, medicine.id);

            totalCost += (medicine.selling_price || 0) * qtyDispensed;
            invoiceItems.push({
                id: medicine.id,
                name: medicine.name,
                unitPrice: medicine.selling_price,
                quantity: qtyDispensed,
                total: medicine.selling_price * qtyDispensed
            });
        }

        // 2. Update Prescription
        db.prepare('UPDATE prescriptions SET status = "dispensed" WHERE id = ?').run(req.params.id);

        // 3. Create Invoice Entry
        db.prepare(`INSERT INTO invoices (id, invoice_id, patient_id, patient_name, date, due_date, items, subtotal, tax, discount, total, paid_amount, status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(invId, readableId, rx.patient_id, rx.patient_name, new Date().toISOString().split('T')[0], new Date().toISOString().split('T')[0], JSON.stringify(invoiceItems), totalCost, 0, 0, totalCost, 0, 'unpaid', `Pharmacy Dispensing: Rx ${rx.prescription_id}`);

        db.exec('COMMIT');

        logAction(req.user.id, req.user.name, req.user.role, 'UPDATE', 'Pharmacy', `Prescription dispensed and billing created: ${rx.prescription_id}`, req.ip);
        res.json({ message: 'Prescription dispensed successfully', rxId: rx.id, invoiceId: readableId });

    } catch (error) {
        db.exec('ROLLBACK');
        res.status(400).json({ error: error.message });
    }
});

router.get('/stats', (req, res) => {
    const totalMeds = db.prepare('SELECT COUNT(*) as c FROM medicines').get().c;
    const outOfStock = db.prepare('SELECT COUNT(*) as c FROM medicines WHERE quantity = 0').get().c;
    const lowStock = db.prepare('SELECT COUNT(*) as c FROM medicines WHERE quantity <= reorder_level AND quantity > 0').get().c;
    const todayDispensed = db.prepare('SELECT COUNT(*) as c FROM prescriptions WHERE status = "dispensed" AND date = date("now")').get().c;

    res.json({
        totalMedicines: totalMeds,
        outOfStock,
        lowStock,
        dispensedToday: todayDispensed
    });
});

module.exports = router;
