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

router.get('/stats', (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const stats = {
        todayVisits: db.prepare('SELECT COUNT(*) as c FROM opd_visits WHERE date = ?').get(today).c,
        waitingCount: db.prepare('SELECT COUNT(*) as c FROM opd_visits WHERE date = ? AND status = "waiting"').get(today).c,
        consultingCount: db.prepare('SELECT COUNT(*) as c FROM opd_visits WHERE date = ? AND status = "in-consultation"').get(today).c,
        completedCount: db.prepare('SELECT COUNT(*) as c FROM opd_visits WHERE date = ? AND status = "completed"').get(today).c,
        dailyRevenue: 0, // Simplified; actual would sum invoice items
        departmentStats: db.prepare('SELECT department, COUNT(*) as count FROM opd_visits WHERE date = ? GROUP BY department').all(today),
        queueStatus: db.prepare('SELECT visit_id as visitId, patient_name as patientName, token_number as token, status FROM opd_visits WHERE date = ? ORDER BY token_number ASC').all(today)
    };
    res.json(stats);
});

router.get('/', (req, res) => {
    const { search, status, date } = req.query;
    let q = 'SELECT * FROM opd_visits WHERE 1=1'; const p = [];
    if (search) { q += ` AND (patient_name LIKE ? OR visit_id LIKE ?)`; const s = `%${search}%`; p.push(s, s); }
    if (status) { q += ' AND status = ?'; p.push(status); }
    if (date) { q += ' AND date = ?'; p.push(date); }
    q += ' ORDER BY date DESC, token_number ASC';
    res.json(db.prepare(q).all(...p).map(fmt));
});

router.get('/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM opd_visits WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(fmt(row));
});

router.post('/', (req, res) => {
    const { patientId, doctorId, chiefComplaint, vitals, time, visitType } = req.body;
    if (!patientId || !doctorId || !chiefComplaint) return res.status(400).json({ error: 'patientId, doctorId, chiefComplaint required' });
    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId);
    const doctor = db.prepare('SELECT * FROM doctors WHERE id = ?').get(doctorId);
    const today = new Date().toISOString().split('T')[0];
    const tokenCount = db.prepare("SELECT COUNT(*) as c FROM opd_visits WHERE date = ?").get(today).c;
    const count = db.prepare('SELECT COUNT(*) as c FROM opd_visits').get().c;
    const visitId = `OPD-${String(count + 1).padStart(4, '0')}`;
    const id = uuidv4();
    db.prepare(`INSERT INTO opd_visits (id, visit_id, patient_id, patient_name, doctor_id, doctor_name, department, date, time, chief_complaint, vitals, status, token_number, visit_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(id, visitId, patientId, patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown', doctorId, doctor ? doctor.name : 'Unknown', doctor ? doctor.department : 'General', today, time || new Date().toTimeString().slice(0, 5), chiefComplaint, JSON.stringify(vitals || {}), 'waiting', tokenCount + 1, visitType || 'New');
    logAction(req.user.id, req.user.name, req.user.role, 'CREATE', 'OPD', `OPD visit created: ${visitId}`, req.ip);
    res.status(201).json(fmt(db.prepare('SELECT * FROM opd_visits WHERE id = ?').get(id)));
});

router.put('/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM opd_visits WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    const { status, diagnosis, vitals, historyIllness, pastHistory, familyHistory, physicalExamination, clinicalNotes } = req.body;
    db.prepare(`UPDATE opd_visits SET 
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
    res.json(fmt(db.prepare('SELECT * FROM opd_visits WHERE id = ?').get(req.params.id)));
});

router.get('/:id/patient-summary', (req, res) => {
    const visit = db.prepare('SELECT * FROM opd_visits WHERE id = ?').get(req.params.id);
    if (!visit) return res.status(404).json({ error: 'Visit not found' });

    const patient = db.prepare('SELECT allergies, chronic_conditions FROM patients WHERE id = ?').get(visit.patient_id);
    const visitCount = db.prepare('SELECT COUNT(*) as c FROM opd_visits WHERE patient_id = ? AND status = "completed"').get(visit.patient_id).c;

    res.json({
        allergies: JSON.parse(patient?.allergies || '[]'),
        chronicConditions: JSON.parse(patient?.chronic_conditions || '[]'),
        previousVisitCount: visitCount
    });
});

router.put('/:id/consultation', (req, res) => {
    const row = db.prepare('SELECT * FROM opd_visits WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    const {
        diagnosis, vitals, historyIllness, pastHistory, familyHistory,
        physicalExamination, clinicalNotes, medications, completeVisit
    } = req.body;

    const newStatus = completeVisit ? 'completed' : 'in-consultation';

    // Update OPD visit details
    db.prepare(`UPDATE opd_visits SET 
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

    // Only trigger billing and prescriptions if completing the visit
    if (completeVisit) {
        // Trigger Prescription Creation if meds provided
        if (medications && Array.isArray(medications) && medications.length > 0) {
            const pCount = db.prepare('SELECT COUNT(*) as c FROM prescriptions').get().c;
            const rxId = `RX-OPD-${String(pCount + 1).padStart(4, '0')}`;
            db.prepare(`INSERT INTO prescriptions (id, prescription_id, patient_id, patient_name, doctor_id, doctor_name, date, diagnosis, medicines, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
                .run(uuidv4(), rxId, row.patient_id, row.patient_name, row.doctor_id, row.doctor_name, new Date().toISOString().split('T')[0], diagnosis || 'OPD Consultation', JSON.stringify(medications), 'pending');
        }

        // Auto-create simplified bill/invoice entry for consultation fee
        const doctor = db.prepare('SELECT consultation_fee FROM doctors WHERE id = ?').get(row.doctor_id);
        const fee = doctor ? doctor.consultation_fee : 50;
        const invCount = db.prepare('SELECT COUNT(*) as c FROM invoices').get().c;
        const invId = `INV-OPD-${String(invCount + 1).padStart(4, '0')}`;
        const items = [{ description: `Consultation Fee (${row.visit_id})`, category: 'Service', quantity: 1, unitPrice: fee, total: fee }];

        db.prepare(`INSERT INTO invoices (id, invoice_id, patient_id, patient_name, date, due_date, items, subtotal, tax, total, paid_amount, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(uuidv4(), invId, row.patient_id, row.patient_name, new Date().toISOString().split('T')[0], new Date().toISOString().split('T')[0], JSON.stringify(items), fee, 0, fee, 0, 'unpaid');
    }

    res.json(fmt(db.prepare('SELECT * FROM opd_visits WHERE id = ?').get(req.params.id)));
});

router.delete('/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM opd_visits WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    db.prepare('DELETE FROM opd_visits WHERE id = ?').run(req.params.id);
    res.json({ message: 'Deleted' });
});

module.exports = router;
