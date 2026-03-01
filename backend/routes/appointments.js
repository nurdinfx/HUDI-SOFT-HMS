const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { authenticate, logAction } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const fmt = (a) => ({
    id: a.id, appointmentId: a.appointment_id, patientId: a.patient_id, patientName: a.patient_name,
    doctorId: a.doctor_id, doctorName: a.doctor_name, department: a.department,
    date: a.date, time: a.time, type: a.type, status: a.status, notes: a.notes, createdAt: a.created_at
});

router.get('/', async (req, res) => {
    const { search, status, date, doctorId, patientId } = req.query;
    let q = 'SELECT * FROM appointments WHERE 1=1'; const p = [];
    if (search) { q += ` AND (patient_name LIKE ? OR doctor_name LIKE ? OR appointment_id LIKE ?)`; const s = `%${search}%`; p.push(s, s, s); }
    if (status) { q += ' AND status = ?'; p.push(status); }
    if (date) { q += ' AND date = ?'; p.push(date); }
    if (doctorId) { q += ' AND doctor_id = ?'; p.push(doctorId); }
    if (patientId) { q += ' AND patient_id = ?'; p.push(patientId); }
    q += ' ORDER BY date DESC, time DESC';
    try {
        const rows = await db.prepare(q).all(...p);
        res.json(rows.map(fmt));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const row = await db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id);
        if (!row) return res.status(404).json({ error: 'Appointment not found' });
        res.json(fmt(row));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', async (req, res) => {
    const { patientId, doctorId, date, time, type, notes } = req.body;
    if (!patientId || !doctorId || !date || !time) return res.status(400).json({ error: 'patientId, doctorId, date, time required' });
    try {
        const patient = await db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId);
        const doctor = await db.prepare('SELECT * FROM doctors WHERE id = ?').get(doctorId);
        if (!patient) return res.status(404).json({ error: 'Patient not found' });
        if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
        const countData = await db.prepare('SELECT COUNT(*) as c FROM appointments').get();
        const count = parseInt(countData.c);
        const apptId = `APT-${String(count + 1).padStart(4, '0')}`;
        const id = uuidv4();
        await db.prepare(`INSERT INTO appointments (id, appointment_id, patient_id, patient_name, doctor_id, doctor_name, department, date, time, type, status, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(id, apptId, patientId, `${patient.first_name} ${patient.last_name}`, doctorId, doctor.name, doctor.department, date, time, type || 'consultation', 'scheduled', notes || null, new Date().toISOString());
        logAction(req.user.id, req.user.name, req.user.role, 'CREATE', 'Appointments', `Appointment created: ${apptId}`, req.ip);
        const row = await db.prepare('SELECT * FROM appointments WHERE id = ?').get(id);
        res.status(201).json(fmt(row));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const row = await db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id);
        if (!row) return res.status(404).json({ error: 'Appointment not found' });
        const { date, time, type, status, notes } = req.body;
        await db.prepare('UPDATE appointments SET date=?, time=?, type=?, status=?, notes=? WHERE id=?')
            .run(date || row.date, time || row.time, type || row.type, status || row.status, notes ?? row.notes, req.params.id);
        logAction(req.user.id, req.user.name, req.user.role, 'UPDATE', 'Appointments', `Appointment ${row.appointment_id} updated`, req.ip);
        const updatedRow = await db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id);
        res.json(fmt(updatedRow));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const row = await db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id);
        if (!row) return res.status(404).json({ error: 'Not found' });
        await db.prepare('DELETE FROM appointments WHERE id = ?').run(req.params.id);
        logAction(req.user.id, req.user.name, req.user.role, 'DELETE', 'Appointments', `Appointment ${row.appointment_id} deleted`, req.ip);
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
