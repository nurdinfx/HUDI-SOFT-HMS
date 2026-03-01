const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { authenticate, logAction } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// Formatters
const fmtAdm = (a) => ({
    id: a.id, admissionId: a.admission_id, patientId: a.patient_id, patientName: a.patient_name,
    doctorId: a.doctor_id, doctorName: a.doctor_name, department: a.department,
    ward: a.ward, bedNumber: a.bed_number, admissionDate: a.admission_date,
    dischargeDate: a.discharge_date, diagnosis: a.diagnosis, status: a.status,
    nursingNotes: JSON.parse(a.nursing_notes || '[]')
});

const fmtBed = (b) => ({
    id: b.id, ward: b.ward, bedNumber: b.bed_number, type: b.type,
    status: b.status, patientId: b.patient_id, dailyRate: b.daily_rate
});

const fmtWard = (w) => ({
    id: w.id, name: w.name, type: w.type, department: w.department,
    totalBeds: w.total_beds, dailyRate: w.daily_rate, createdAt: w.created_at
});

const fmtNurseNote = (n) => ({
    id: n.id, admissionId: n.admission_id, patientId: n.patient_id, patientName: n.patient_name,
    nurseId: n.nurse_id, nurseName: n.nurse_name, vitals: JSON.parse(n.vitals || '{}'),
    observations: n.observations, medications: JSON.parse(n.medications || '[]'),
    shift: n.shift, createdAt: n.created_at
});

const fmtDoctorRound = (d) => ({
    id: d.id, admissionId: d.admission_id, patientId: d.patient_id, patientName: d.patient_name,
    doctorId: d.doctor_id, doctorName: d.doctor_name, observations: d.observations,
    treatmentUpdates: d.treatment_updates, procedureOrders: JSON.parse(d.procedure_orders || '[]'),
    timestamp: d.timestamp
});

// Admissions
router.get('/admissions', async (req, res) => {
    const { search, status, ward } = req.query;
    let q = 'SELECT * FROM ipd_admissions WHERE 1=1'; const p = [];
    if (search) { q += ` AND (patient_name LIKE ? OR admission_id LIKE ?)`; const s = `%${search}%`; p.push(s, s); }
    if (status) { q += ' AND status = ?'; p.push(status); }
    if (ward) { q += ' AND ward = ?'; p.push(ward); }
    q += ' ORDER BY admission_date DESC';
    try {
        const rows = await db.prepare(q).all(...p);
        res.json(rows.map(fmtAdm));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/admissions', async (req, res) => {
    const { patientId, doctorId, ward, bedNumber, diagnosis } = req.body;
    if (!patientId || !ward || !bedNumber || !diagnosis) return res.status(400).json({ error: 'patientId, ward, bedNumber, diagnosis required' });

    try {
        const patient = await db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId);
        if (!patient) return res.status(404).json({ error: 'Patient not found' });

        const doctor = doctorId ? await db.prepare('SELECT * FROM doctors WHERE id = ?').get(doctorId) : null;
        const bed = await db.prepare('SELECT * FROM beds WHERE bed_number = ?').get(bedNumber);
        if (bed && bed.status === 'occupied') return res.status(400).json({ error: 'Bed is already occupied' });

        const countData = await db.prepare('SELECT COUNT(*) as c FROM ipd_admissions').get();
        const admId = `IPD-${String(parseInt(countData.c) + 1).padStart(4, '0')}`;
        const id = uuidv4();
        const today = new Date().toISOString().split('T')[0];

        await db.prepare(`INSERT INTO ipd_admissions (id, admission_id, patient_id, patient_name, doctor_id, doctor_name, department, ward, bed_number, admission_date, diagnosis, status, nursing_notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(id, admId, patientId, `${patient.first_name} ${patient.last_name}`, doctorId || '', doctor ? doctor.name : '', doctor ? doctor.department : 'General', ward, bedNumber, today, diagnosis, 'admitted', JSON.stringify([`Patient admitted on ${today}`]));

        if (bed) await db.prepare("UPDATE beds SET status='occupied', patient_id=? WHERE bed_number=?").run(patientId, bedNumber);

        logAction(req.user.id, req.user.name, req.user.role, 'CREATE', 'IPD', `Patient admitted: ${admId}`, req.ip);
        const row = await db.prepare('SELECT * FROM ipd_admissions WHERE id = ?').get(id);
        res.status(201).json(fmtAdm(row));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/admissions/:id', async (req, res) => {
    try {
        const row = await db.prepare('SELECT * FROM ipd_admissions WHERE id = ?').get(req.params.id);
        if (!row) return res.status(404).json({ error: 'Not found' });
        const { status, dischargeDate, diagnosis, nursingNotes } = req.body;
        const newStatus = status || row.status;
        const dd = newStatus === 'discharged' ? (dischargeDate || new Date().toISOString().split('T')[0]) : row.discharge_date;

        await db.prepare('UPDATE ipd_admissions SET status=?, discharge_date=?, diagnosis=?, nursing_notes=? WHERE id=?')
            .run(newStatus, dd, diagnosis || row.diagnosis, nursingNotes ? JSON.stringify(nursingNotes) : row.nursing_notes, req.params.id);

        if (newStatus === 'discharged') {
            await db.prepare("UPDATE beds SET status='available', patient_id=NULL WHERE bed_number=?").run(row.bed_number);
            const startDate = new Date(row.admission_date);
            const endDate = new Date(dd);
            const days = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));
            const bed = await db.prepare('SELECT * FROM beds WHERE bed_number = ?').get(row.bed_number);
            const dailyRate = bed ? bed.daily_rate : 0;
            const totalBedCharge = days * dailyRate;

            logAction(req.user.id, 'SYSTEM', 'admin', 'BILLING', 'IPD', `Automatic bed charge calculated for ${row.admission_id}: ${totalBedCharge} (${days} days)`, '127.0.0.1');
        }

        logAction(req.user.id, req.user.name, req.user.role, 'UPDATE', 'IPD', `Admission ${row.admission_id} updated`, req.ip);
        const updatedRow = await db.prepare('SELECT * FROM ipd_admissions WHERE id = ?').get(req.params.id);
        res.json(fmtAdm(updatedRow));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Wards
router.get('/wards', async (req, res) => {
    try {
        const rows = await db.prepare('SELECT * FROM wards ORDER BY name').all();
        res.json(rows.map(fmtWard));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/wards', async (req, res) => {
    const { name, type, department, totalBeds, dailyRate } = req.body;
    if (!name || !type || !department) return res.status(400).json({ error: 'name, type, department required' });
    const id = uuidv4();

    try {
        await db.prepare('INSERT INTO wards (id, name, type, department, total_beds, daily_rate) VALUES (?, ?, ?, ?, ?, ?)')
            .run(id, name, type, department, totalBeds || 0, dailyRate || 0);

        const bedsCount = parseInt(totalBeds) || 0;
        if (bedsCount > 0) {
            for (let i = 1; i <= bedsCount; i++) {
                const bedId = uuidv4();
                const prefix = name.substring(0, 3).toUpperCase();
                const bedNumber = `${prefix}-${String(i).padStart(2, '0')}-${Math.floor(Math.random() * 1000)}`;
                await db.prepare('INSERT INTO beds (id, ward, bed_number, type, status, daily_rate, ward_id) VALUES (?, ?, ?, ?, ?, ?, ?)')
                    .run(bedId, name, bedNumber, type, 'available', dailyRate || 0, id);
            }
        }

        logAction(req.user.id, req.user.name, req.user.role, 'CREATE', 'IPD', `Ward ${name} added with ${bedsCount} beds`, req.ip);
        const row = await db.prepare('SELECT * FROM wards WHERE id = ?').get(id);
        res.status(201).json(fmtWard(row));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Nurse Notes
router.get('/nurse-notes/:admissionId', async (req, res) => {
    try {
        const notes = await db.prepare('SELECT * FROM nurse_notes WHERE admission_id = ? ORDER BY created_at DESC').all(req.params.admissionId);
        res.json(notes.map(fmtNurseNote));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/nurse-notes', async (req, res) => {
    const { admissionId, vitals, observations, medications, shift } = req.body;
    try {
        const adm = await db.prepare('SELECT * FROM ipd_admissions WHERE id = ?').get(admissionId);
        if (!adm) return res.status(404).json({ error: 'Admission not found' });
        const id = uuidv4();
        await db.prepare('INSERT INTO nurse_notes (id, admission_id, patient_id, patient_name, nurse_id, nurse_name, vitals, observations, medications, shift) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
            .run(id, admissionId, adm.patient_id, adm.patient_name, req.user.id, req.user.name, JSON.stringify(vitals || {}), observations, JSON.stringify(medications || []), shift);
        const row = await db.prepare('SELECT * FROM nurse_notes WHERE id = ?').get(id);
        res.status(201).json(fmtNurseNote(row));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Doctor Rounds
router.get('/doctor-rounds/:admissionId', async (req, res) => {
    try {
        const rounds = await db.prepare('SELECT * FROM doctor_rounds WHERE admission_id = ? ORDER BY timestamp DESC').all(req.params.admissionId);
        res.json(rounds.map(fmtDoctorRound));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/doctor-rounds', async (req, res) => {
    const { admissionId, observations, treatmentUpdates, procedureOrders, medications } = req.body;
    try {
        const adm = await db.prepare('SELECT * FROM ipd_admissions WHERE id = ?').get(admissionId);
        if (!adm) return res.status(404).json({ error: 'Admission not found' });
        const id = uuidv4();
        await db.prepare('INSERT INTO doctor_rounds (id, admission_id, patient_id, patient_name, doctor_id, doctor_name, observations, treatment_updates, procedure_orders) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
            .run(id, admissionId, adm.patient_id, adm.patient_name, req.user.id, req.user.name, observations, treatmentUpdates, JSON.stringify(procedureOrders || []));

        if (medications && Array.isArray(medications) && medications.length > 0) {
            const pCountData = await db.prepare('SELECT COUNT(*) as c FROM prescriptions').get();
            const pId = `RX-IPD-${String(parseInt(pCountData.c) + 1).padStart(4, '0')}`;
            await db.prepare('INSERT INTO prescriptions (id, prescription_id, patient_id, patient_name, doctor_id, doctor_name, diagnosis, medicines, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
                .run(uuidv4(), pId, adm.patient_id, adm.patient_name, req.user.id, req.user.name, adm.diagnosis, JSON.stringify(medications), `From IPD Round: ${observations}`, 'pending');
        }

        const row = await db.prepare('SELECT * FROM doctor_rounds WHERE id = ?').get(id);
        res.status(201).json(fmtDoctorRound(row));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Beds
router.get('/beds', async (req, res) => {
    const { ward, status } = req.query;
    let q = 'SELECT * FROM beds WHERE 1=1'; const p = [];
    if (ward) { q += ' AND ward = ?'; p.push(ward); }
    if (status) { q += ' AND status = ?'; p.push(status); }
    q += ' ORDER BY ward, bed_number';
    try {
        const rows = await db.prepare(q).all(...p);
        res.json(rows.map(fmtBed));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/beds/:id', async (req, res) => {
    try {
        const row = await db.prepare('SELECT * FROM beds WHERE id = ?').get(req.params.id);
        if (!row) return res.status(404).json({ error: 'Bed not found' });
        const { status, dailyRate, wardId, bedNumber, type, ward } = req.body;
        await db.prepare('UPDATE beds SET status=?, daily_rate=?, ward_id=?, bed_number=?, type=?, ward=? WHERE id=?')
            .run(status || row.status, dailyRate ?? row.daily_rate, wardId ?? row.ward_id, bedNumber ?? row.bed_number, type ?? row.type, ward ?? row.ward, req.params.id);
        const updatedRow = await db.prepare('SELECT * FROM beds WHERE id = ?').get(req.params.id);
        res.json(fmtBed(updatedRow));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/beds', async (req, res) => {
    const { ward, bedNumber, type, dailyRate, wardId } = req.body;
    if (!ward || !bedNumber) return res.status(400).json({ error: 'ward and bedNumber required' });

    try {
        const existing = await db.prepare('SELECT * FROM beds WHERE bed_number = ?').get(bedNumber);
        if (existing) return res.status(400).json({ error: 'Bed number already exists' });

        const id = uuidv4();
        await db.prepare('INSERT INTO beds (id, ward, bed_number, type, status, daily_rate, ward_id) VALUES (?, ?, ?, ?, ?, ?, ?)')
            .run(id, ward, bedNumber, type || 'General', 'available', dailyRate || 0, wardId || null);

        const wardObj = await db.prepare('SELECT * FROM wards WHERE name = ?').get(ward);
        if (wardObj) {
            await db.prepare('UPDATE wards SET total_beds = total_beds + 1 WHERE id = ?').run(wardObj.id);
        }
        const row = await db.prepare('SELECT * FROM beds WHERE id = ?').get(id);
        res.status(201).json(fmtBed(row));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/beds/:id', async (req, res) => {
    try {
        const bed = await db.prepare('SELECT * FROM beds WHERE id = ?').get(req.params.id);
        if (!bed) return res.status(404).json({ error: 'Bed not found' });
        if (bed.status === 'occupied') return res.status(400).json({ error: 'Cannot delete an occupied bed' });

        await db.prepare('DELETE FROM beds WHERE id = ?').run(req.params.id);

        const wardObj = await db.prepare('SELECT * FROM wards WHERE name = ?').get(bed.ward);
        if (wardObj) {
            await db.prepare('UPDATE wards SET total_beds = total_beds - 1 WHERE id = ?').run(wardObj.id);
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Analytics
router.get('/analytics', async (req, res) => {
    try {
        const totalBedsData = await db.prepare('SELECT COUNT(*) as c FROM beds').get();
        const occupiedBedsData = await db.prepare("SELECT COUNT(*) as c FROM beds WHERE status = 'occupied'").get();
        const totalBeds = parseInt(totalBedsData.c);
        const occupiedBeds = parseInt(occupiedBedsData.c);
        const occupancyRate = totalBeds > 0 ? (occupiedBeds / totalBeds) * 100 : 0;

        // Note: julianday is SQLite specific, using standard extraction for PG
        const avgStayData = await db.prepare(`SELECT AVG(EXTRACT(DAY FROM (COALESCE(discharge_date::timestamp, CURRENT_TIMESTAMP)) - admission_date::timestamp)) as avg FROM ipd_admissions`).get();
        const avgStay = avgStayData.avg || 0;

        const deptStats = await db.prepare(`SELECT department, COUNT(*) as count FROM ipd_admissions GROUP BY department`).all();
        const wardStats = await db.prepare(`SELECT ward, COUNT(*) as count FROM beds WHERE status = 'occupied' GROUP BY ward`).all();

        res.json({
            occupancyRate: occupancyRate.toFixed(2),
            averageStayDays: parseFloat(avgStay).toFixed(1),
            departmentAdmissions: deptStats,
            wardCurrentUsage: wardStats,
            totalBeds,
            occupiedBeds
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
