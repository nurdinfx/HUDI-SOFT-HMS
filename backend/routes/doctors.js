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

router.get('/stats', async (req, res) => {
    try {
        const totalData = await db.prepare('SELECT COUNT(*) as c FROM doctors').get();
        const total = parseInt(totalData.c);
        const availableData = await db.prepare("SELECT COUNT(*) as c FROM doctors WHERE status = 'available'").get();
        const available = parseInt(availableData.c);
        const depts = await db.prepare('SELECT department, COUNT(*) as count FROM doctors GROUP BY department').all();
        res.json({
            totalDoctors: total,
            availableNow: available,
            departmentBreakdown: depts,
            onLeave: total - available
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:id/performance', async (req, res) => {
    try {
        const doctor = await db.prepare('SELECT name, consultation_fee FROM doctors WHERE id = ?').get(req.params.id);
        if (!doctor) return res.status(404).json({ error: 'Doctor not found' });

        const opdData = await db.prepare('SELECT COUNT(*) as c FROM opd_visits WHERE doctor_id = ?').get(req.params.id);
        const opdCount = parseInt(opdData.c);
        const ipdData = await db.prepare('SELECT COUNT(*) as c FROM ipd_admissions WHERE doctor_id = ?').get(req.params.id);
        const ipdCount = parseInt(ipdData.c);

        // Simplified revenue: just consultation fees for OPD
        const revenue = opdCount * doctor.consultation_fee;

        res.json({
            doctorName: doctor.name,
            totalAppointments: opdCount + ipdCount,
            opdVisits: opdCount,
            ipdAdmissions: ipdCount,
            estimatedRevenue: revenue
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/', async (req, res) => {
    const { search, status, department } = req.query;
    let q = 'SELECT * FROM doctors WHERE 1=1'; const p = [];
    if (search) { q += ` AND (name LIKE ? OR email LIKE ? OR specialization LIKE ? OR doctor_id LIKE ?)`; const s = `%${search}%`; p.push(s, s, s, s); }
    if (status) { q += ' AND status = ?'; p.push(status); }
    if (department) { q += ' AND department = ?'; p.push(department); }
    q += ' ORDER BY name';
    try {
        const rows = await db.prepare(q).all(...p);
        res.json(rows.map(fmt));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const row = await db.prepare('SELECT * FROM doctors WHERE id = ?').get(req.params.id);
        if (!row) return res.status(404).json({ error: 'Doctor not found' });
        res.json(fmt(row));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', async (req, res) => {
    const { name, email, phone, specialization, department, qualification, experience, consultationFee, availableDays, availableTimeStart, availableTimeEnd, status } = req.body;
    if (!name || !email || !specialization || !department) return res.status(400).json({ error: 'name, email, specialization, department required' });
    try {
        const countData = await db.prepare('SELECT COUNT(*) as c FROM doctors').get();
        const count = parseInt(countData.c);
        const doctorId = `DOC-${String(count + 1).padStart(3, '0')}`;
        const id = uuidv4();
        await db.prepare(`INSERT INTO doctors (id, doctor_id, name, email, phone, specialization, department, qualification, experience, consultation_fee, available_days, available_time_start, available_time_end, status, joined_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(id, doctorId, name, email, phone || null, specialization, department, qualification || null, experience || 0, consultationFee || 0, JSON.stringify(availableDays || []), availableTimeStart || '09:00', availableTimeEnd || '17:00', status || 'available', new Date().toISOString());
        logAction(req.user.id, req.user.name, req.user.role, 'CREATE', 'Doctors', `Doctor added: ${name}`, req.ip);
        const row = await db.prepare('SELECT * FROM doctors WHERE id = ?').get(id);
        res.status(201).json(fmt(row));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const row = await db.prepare('SELECT * FROM doctors WHERE id = ?').get(req.params.id);
        if (!row) return res.status(404).json({ error: 'Doctor not found' });
        const { name, email, phone, specialization, department, qualification, experience, consultationFee, availableDays, availableTimeStart, availableTimeEnd, status } = req.body;
        await db.prepare(`UPDATE doctors SET name=?, email=?, phone=?, specialization=?, department=?, qualification=?, experience=?, consultation_fee=?, available_days=?, available_time_start=?, available_time_end=?, status=? WHERE id=?`)
            .run(name || row.name, email || row.email, phone ?? row.phone, specialization || row.specialization, department || row.department, qualification ?? row.qualification, experience ?? row.experience, consultationFee ?? row.consultation_fee, availableDays ? JSON.stringify(availableDays) : row.available_days, availableTimeStart || row.available_time_start, availableTimeEnd || row.available_time_end, status || row.status, req.params.id);
        logAction(req.user.id, req.user.name, req.user.role, 'UPDATE', 'Doctors', `Doctor updated: ${name || row.name}`, req.ip);
        const updatedRow = await db.prepare('SELECT * FROM doctors WHERE id = ?').get(req.params.id);
        res.json(fmt(updatedRow));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const row = await db.prepare('SELECT * FROM doctors WHERE id = ?').get(req.params.id);
        if (!row) return res.status(404).json({ error: 'Doctor not found' });
        await db.prepare('DELETE FROM doctors WHERE id = ?').run(req.params.id);
        logAction(req.user.id, req.user.name, req.user.role, 'DELETE', 'Doctors', `Doctor deleted: ${row.name}`, req.ip);
        res.json({ message: 'Doctor deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
