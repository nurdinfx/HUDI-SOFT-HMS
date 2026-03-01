const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { authenticate, logAction } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const fmt = (v) => ({
    id: v.id, visitId: v.visit_id, patientId: v.patient_id, patientName: v.patient_name,
    doctorId: v.doctor_id, doctorName: v.doctor_name, department: v.department,
    date: v.date, time: v.time, chiefComplaint: v.chief_complaint,
    historyIllness: v.history_illness, pastHistory: v.past_history,
    familyHistory: v.family_history, physicalExamination: v.physical_examination,
    clinicalNotes: v.clinical_notes,
    vitals: JSON.parse(v.vitals || '{}'), diagnosis: v.diagnosis,
    status: v.status, tokenNumber: v.token_number,
    visitType: v.visit_type || 'New'
});

router.get('/stats', async (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    try {
        const todayVisits = (await db.prepare('SELECT COUNT(*) as c FROM opd_visits WHERE date = ?').get(today)).c;
        const waitingCount = (await db.prepare('SELECT COUNT(*) as c FROM opd_visits WHERE date = ? AND status = "waiting"').get(today)).c;
        const consultingCount = (await db.prepare('SELECT COUNT(*) as c FROM opd_visits WHERE date = ? AND status = "in-consultation"').get(today)).c;
        const completedCount = (await db.prepare('SELECT COUNT(*) as c FROM opd_visits WHERE date = ? AND status = "completed"').get(today)).c;
        const departmentStats = await db.prepare('SELECT department, COUNT(*) as count FROM opd_visits WHERE date = ? GROUP BY department').all(today);
        const queueStatus = await db.prepare('SELECT visit_id as "visitId", patient_name as "patientName", token_number as token, status FROM opd_visits WHERE date = ? ORDER BY token_number ASC').all(today);

        res.json({
            todayVisits: parseInt(todayVisits),
            waitingCount: parseInt(waitingCount),
            consultingCount: parseInt(consultingCount),
            completedCount: parseInt(completedCount),
            dailyRevenue: 0,
            departmentStats,
            queueStatus
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/', async (req, res) => {
    const { search, status, date } = req.query;
    let q = 'SELECT * FROM opd_visits WHERE 1=1'; const p = [];
    if (search) { q += ` AND (patient_name LIKE ? OR visit_id LIKE ?)`; const s = `%${search}%`; p.push(s, s); }
    if (status) { q += ' AND status = ?'; p.push(status); }
    if (date) { q += ' AND date = ?'; p.push(date); }
    q += ' ORDER BY date DESC, token_number ASC';
    try {
        const rows = await db.prepare(q).all(...p);
        res.json(rows.map(fmt));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const row = await db.prepare('SELECT * FROM opd_visits WHERE id = ?').get(req.params.id);
        if (!row) return res.status(404).json({ error: 'Not found' });
        res.json(fmt(row));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', async (req, res) => {
    const { patientId, doctorId, chiefComplaint, vitals, time, visitType } = req.body;
    if (!patientId || !doctorId || !chiefComplaint) return res.status(400).json({ error: 'patientId, doctorId, chiefComplaint required' });

    try {
        const patient = await db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId);
        const doctor = await db.prepare('SELECT * FROM doctors WHERE id = ?').get(doctorId);
        const today = new Date().toISOString().split('T')[0];
        const tokenCountData = await db.prepare("SELECT COUNT(*) as c FROM opd_visits WHERE date = ?").get(today);
        const tokenCount = parseInt(tokenCountData.c);
        const countData = await db.prepare('SELECT COUNT(*) as c FROM opd_visits').get();
        const visitId = `OPD-${String(parseInt(countData.c) + 1).padStart(4, '0')}`;
        const id = uuidv4();

        await db.prepare(`INSERT INTO opd_visits (id, visit_id, patient_id, patient_name, doctor_id, doctor_name, department, date, time, chief_complaint, vitals, status, token_number, visit_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(id, visitId, patientId, patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown', doctorId, doctor ? doctor.name : 'Unknown', doctor ? doctor.department : 'General', today, time || new Date().toTimeString().slice(0, 5), chiefComplaint, JSON.stringify(vitals || {}), 'waiting', tokenCount + 1, visitType || 'New');

        logAction(req.user.id, req.user.name, req.user.role, 'CREATE', 'OPD', `OPD visit created: ${visitId}`, req.ip);
        const row = await db.prepare('SELECT * FROM opd_visits WHERE id = ?').get(id);
        res.status(201).json(fmt(row));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const row = await db.prepare('SELECT * FROM opd_visits WHERE id = ?').get(req.params.id);
        if (!row) return res.status(404).json({ error: 'Not found' });
        const { status, diagnosis, vitals, historyIllness, pastHistory, familyHistory, physicalExamination, clinicalNotes } = req.body;

        await db.prepare(`UPDATE opd_visits SET 
            status=?, diagnosis=?, vitals=?, 
            history_illness=?, past_history=?, family_history=?, 
            physical_examination=?, clinical_notes=? 
            WHERE id=?`)
            .run(
                status || row.status,
                diagnosis ?? row.diagnosis,
                vitals ? JSON.stringify(vitals) : row.vitals,
                historyIllness ?? row.history_illness,
                pastHistory ?? row.past_history,
                familyHistory ?? row.family_history,
                physicalExamination ?? row.physical_examination,
                clinicalNotes ?? row.clinical_notes,
                req.params.id
            );
        const updatedRow = await db.prepare('SELECT * FROM opd_visits WHERE id = ?').get(req.params.id);
        res.json(fmt(updatedRow));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:id/patient-summary', async (req, res) => {
    try {
        const visit = await db.prepare('SELECT * FROM opd_visits WHERE id = ?').get(req.params.id);
        if (!visit) return res.status(404).json({ error: 'Visit not found' });

        const patient = await db.prepare('SELECT allergies, chronic_conditions FROM patients WHERE id = ?').get(visit.patient_id);
        const visitCountData = await db.prepare('SELECT COUNT(*) as c FROM opd_visits WHERE patient_id = ? AND status = "completed"').get(visit.patient_id);

        res.json({
            allergies: JSON.parse(patient?.allergies || '[]'),
            chronicConditions: JSON.parse(patient?.chronic_conditions || '[]'),
            previousVisitCount: parseInt(visitCountData.c)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id/consultation', async (req, res) => {
    try {
        const row = await db.prepare('SELECT * FROM opd_visits WHERE id = ?').get(req.params.id);
        if (!row) return res.status(404).json({ error: 'Not found' });
        const {
            diagnosis, vitals, historyIllness, pastHistory, familyHistory,
            physicalExamination, clinicalNotes, medications, completeVisit
        } = req.body;

        const newStatus = completeVisit ? 'completed' : 'in-consultation';

        await db.prepare(`UPDATE opd_visits SET 
            status=?, diagnosis=?, vitals=?, 
            history_illness=?, past_history=?, family_history=?, 
            physical_examination=?, clinical_notes=? 
            WHERE id=?`)
            .run(
                newStatus,
                diagnosis ?? row.diagnosis,
                vitals ? JSON.stringify(vitals) : row.vitals,
                historyIllness ?? row.history_illness,
                pastHistory ?? row.past_history,
                familyHistory ?? row.family_history,
                physicalExamination ?? row.physical_examination,
                clinicalNotes ?? row.clinical_notes,
                req.params.id
            );

        if (completeVisit) {
            if (medications && Array.isArray(medications) && medications.length > 0) {
                const pCountData = await db.prepare('SELECT COUNT(*) as c FROM prescriptions').get();
                const rxId = `RX-OPD-${String(parseInt(pCountData.c) + 1).padStart(4, '0')}`;
                await db.prepare(`INSERT INTO prescriptions (id, prescription_id, patient_id, patient_name, doctor_id, doctor_name, date, diagnosis, medicines, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
                    .run(uuidv4(), rxId, row.patient_id, row.patient_name, row.doctor_id, row.doctor_name, new Date().toISOString().split('T')[0], diagnosis || 'OPD Consultation', JSON.stringify(medications), 'pending');
            }

            const doctor = await db.prepare('SELECT consultation_fee FROM doctors WHERE id = ?').get(row.doctor_id);
            const fee = doctor ? doctor.consultation_fee : 50;
            const invCountData = await db.prepare('SELECT COUNT(*) as c FROM invoices').get();
            const invId = `INV-OPD-${String(parseInt(invCountData.c) + 1).padStart(4, '0')}`;
            const items = [{ description: `Consultation Fee (${row.visit_id})`, category: 'Service', quantity: 1, unitPrice: fee, total: fee }];

            await db.prepare(`INSERT INTO invoices (id, invoice_id, patient_id, patient_name, date, due_date, items, subtotal, tax, total, paid_amount, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
                .run(uuidv4(), invId, row.patient_id, row.patient_name, new Date().toISOString().split('T')[0], new Date().toISOString().split('T')[0], JSON.stringify(items), fee, 0, fee, 0, 'unpaid');
        }

        const updatedRow = await db.prepare('SELECT * FROM opd_visits WHERE id = ?').get(req.params.id);
        res.json(fmt(updatedRow));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const row = await db.prepare('SELECT * FROM opd_visits WHERE id = ?').get(req.params.id);
        if (!row) return res.status(404).json({ error: 'Not found' });
        await db.prepare('DELETE FROM opd_visits WHERE id = ?').run(req.params.id);
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
