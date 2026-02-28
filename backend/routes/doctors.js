const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { authenticate, logAction } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const fmt = (d) => ({
    id: d.id, doctorId: d.doctor_id, name: d.name, email: d.email, phone: d.phone,
    specialization: d.specialization, department: d.department, qualification: d.qualification,
    experience: d.experience, consultationFee: d.consultation_fee,
    availableDays: JSON.parse(d.available_days || '[]'),
    availableTimeStart: d.available_time_start, availableTimeEnd: d.available_time_end,
    status: d.status, avatar: d.avatar, joinedAt: d.joined_at
});

router.get('/stats', (req, res) => {
    const total = db.prepare('SELECT COUNT(*) as c FROM doctors').get().c;
    const available = db.prepare('SELECT COUNT(*) as c FROM doctors WHERE status = "available"').get().c;
    const depts = db.prepare('SELECT department, COUNT(*) as count FROM doctors GROUP BY department').all();
    res.json({
        totalDoctors: total,
        availableNow: available,
        departmentBreakdown: depts,
        onLeave: total - available
    });
});

router.get('/:id/performance', (req, res) => {
    const doctor = db.prepare('SELECT name, consultation_fee FROM doctors WHERE id = ?').get(req.params.id);
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });

    const opdCount = db.prepare('SELECT COUNT(*) as c FROM opd_visits WHERE doctor_id = ?').get(req.params.id).c;
    const ipdCount = db.prepare('SELECT COUNT(*) as c FROM ipd_admissions WHERE doctor_id = ?').get(req.params.id).c;

    // Simplified revenue: just consultation fees for OPD
    const revenue = opdCount * doctor.consultation_fee;

    res.json({
        doctorName: doctor.name,
        totalAppointments: opdCount + ipdCount,
        opdVisits: opdCount,
        ipdAdmissions: ipdCount,
        estimatedRevenue: revenue
    });
});

router.get('/', (req, res) => {
    const { search, status, department } = req.query;
    let q = 'SELECT * FROM doctors WHERE 1=1'; const p = [];
    if (search) { q += ` AND (name LIKE ? OR email LIKE ? OR specialization LIKE ? OR doctor_id LIKE ?)`; const s = `%${search}%`; p.push(s, s, s, s); }
    if (status) { q += ' AND status = ?'; p.push(status); }
    if (department) { q += ' AND department = ?'; p.push(department); }
    q += ' ORDER BY name';
    res.json(db.prepare(q).all(...p).map(fmt));
});

router.get('/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM doctors WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Doctor not found' });
    res.json(fmt(row));
});

router.post('/', (req, res) => {
    const { name, email, phone, specialization, department, qualification, experience, consultationFee, availableDays, availableTimeStart, availableTimeEnd, status } = req.body;
    if (!name || !email || !specialization || !department) return res.status(400).json({ error: 'name, email, specialization, department required' });
    const count = db.prepare('SELECT COUNT(*) as c FROM doctors').get().c;
    const doctorId = `DOC-${String(count + 1).padStart(3, '0')}`;
    const id = uuidv4();
    db.prepare(`INSERT INTO doctors (id, doctor_id, name, email, phone, specialization, department, qualification, experience, consultation_fee, available_days, available_time_start, available_time_end, status, joined_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(id, doctorId, name, email, phone || null, specialization, department, qualification || null, experience || 0, consultationFee || 0, JSON.stringify(availableDays || []), availableTimeStart || '09:00', availableTimeEnd || '17:00', status || 'available', new Date().toISOString());
    logAction(req.user.id, req.user.name, req.user.role, 'CREATE', 'Doctors', `Doctor added: ${name}`, req.ip);
    res.status(201).json(fmt(db.prepare('SELECT * FROM doctors WHERE id = ?').get(id)));
});

router.put('/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM doctors WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Doctor not found' });
    const { name, email, phone, specialization, department, qualification, experience, consultationFee, availableDays, availableTimeStart, availableTimeEnd, status } = req.body;
    db.prepare(`UPDATE doctors SET name=?, email=?, phone=?, specialization=?, department=?, qualification=?, experience=?, consultation_fee=?, available_days=?, available_time_start=?, available_time_end=?, status=? WHERE id=?`)
        .run(name || row.name, email || row.email, phone ?? row.phone, specialization || row.specialization, department || row.department, qualification ?? row.qualification, experience ?? row.experience, consultationFee ?? row.consultation_fee, availableDays ? JSON.stringify(availableDays) : row.available_days, availableTimeStart || row.available_time_start, availableTimeEnd || row.available_time_end, status || row.status, req.params.id);
    logAction(req.user.id, req.user.name, req.user.role, 'UPDATE', 'Doctors', `Doctor updated: ${name || row.name}`, req.ip);
    res.json(fmt(db.prepare('SELECT * FROM doctors WHERE id = ?').get(req.params.id)));
});

router.delete('/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM doctors WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Doctor not found' });
    db.prepare('DELETE FROM doctors WHERE id = ?').run(req.params.id);
    logAction(req.user.id, req.user.name, req.user.role, 'DELETE', 'Doctors', `Doctor deleted: ${row.name}`, req.ip);
    res.json({ message: 'Doctor deleted' });
});

module.exports = router;
