const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { authenticate, logAction } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const fmt = (p) => ({
    id: p.id, patientId: p.patient_id, firstName: p.first_name, lastName: p.last_name,
    dateOfBirth: p.date_of_birth, gender: p.gender, bloodGroup: p.blood_group,
    phone: p.phone, email: p.email, address: p.address, city: p.city,
    emergencyContact: p.emergency_contact, emergencyPhone: p.emergency_phone,
    insuranceProvider: p.insurance_provider, insurancePolicyNumber: p.insurance_policy_number,
    allergies: JSON.parse(p.allergies || '[]'), chronicConditions: JSON.parse(p.chronic_conditions || '[]'),
    status: p.status, registeredAt: p.registered_at, lastVisit: p.last_visit, notes: p.notes
});

// GET all patients
router.get('/', (req, res) => {
    const { search, status } = req.query;
    let q = 'SELECT * FROM patients WHERE 1=1';
    const params = [];
    if (search) { q += ` AND (first_name LIKE ? OR last_name LIKE ? OR patient_id LIKE ? OR phone LIKE ?)`; const s = `%${search}%`; params.push(s, s, s, s); }
    if (status) { q += ' AND status = ?'; params.push(status); }
    q += ' ORDER BY registered_at DESC';
    const rows = db.prepare(q).all(...params);
    res.json(rows.map(fmt));
});

// GET single patient
router.get('/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Patient not found' });
    res.json(fmt(row));
});

// POST create patient
router.post('/', (req, res) => {
    const { firstName, lastName, dateOfBirth, gender, bloodGroup, phone, email, address, city, emergencyContact, emergencyPhone, insuranceProvider, insurancePolicyNumber, status, notes, allergies, chronicConditions } = req.body;
    if (!firstName || !lastName || !dateOfBirth || !gender || !phone) {
        return res.status(400).json({ error: 'Required fields: firstName, lastName, dateOfBirth, gender, phone' });
    }
    const count = db.prepare('SELECT COUNT(*) as c FROM patients').get().c;
    const patientId = `PAT-${String(count + 1).padStart(4, '0')}`;
    const id = uuidv4();
    db.prepare(`INSERT INTO patients (id, patient_id, first_name, last_name, date_of_birth, gender, blood_group, phone, email, address, city, emergency_contact, emergency_phone, insurance_provider, insurance_policy_number, allergies, chronic_conditions, status, registered_at, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(id, patientId, firstName, lastName, dateOfBirth, gender, bloodGroup || null, phone, email || null, address || null, city || null, emergencyContact || null, emergencyPhone || null, insuranceProvider || null, insurancePolicyNumber || null, JSON.stringify(allergies || []), JSON.stringify(chronicConditions || []), status || 'active', new Date().toISOString(), notes || null);
    const row = db.prepare('SELECT * FROM patients WHERE id = ?').get(id);
    logAction(req.user.id, req.user.name, req.user.role, 'CREATE', 'Patients', `New patient registered: ${firstName} ${lastName}`, req.ip);
    res.status(201).json(fmt(row));
});

// PUT update patient
router.put('/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Patient not found' });
    const { firstName, lastName, dateOfBirth, gender, bloodGroup, phone, email, address, city, emergencyContact, emergencyPhone, insuranceProvider, insurancePolicyNumber, status, notes, lastVisit, allergies, chronicConditions } = req.body;
    db.prepare(`UPDATE patients SET first_name=?, last_name=?, date_of_birth=?, gender=?, blood_group=?, phone=?, email=?, address=?, city=?, emergency_contact=?, emergency_phone=?, insurance_provider=?, insurance_policy_number=?, allergies=?, chronic_conditions=?, status=?, notes=?, last_visit=? WHERE id=?`)
        .run(
            firstName || row.first_name,
            lastName || row.last_name,
            dateOfBirth || row.date_of_birth,
            gender || row.gender,
            bloodGroup ?? row.blood_group,
            phone || row.phone,
            email ?? row.email,
            address ?? row.address,
            city ?? row.city,
            emergencyContact ?? row.emergency_contact,
            emergencyPhone ?? row.emergency_phone,
            insuranceProvider ?? row.insurance_provider,
            insurancePolicyNumber ?? row.insurance_policy_number,
            allergies ? JSON.stringify(allergies) : row.allergies,
            chronicConditions ? JSON.stringify(chronicConditions) : row.chronic_conditions,
            status || row.status,
            notes ?? row.notes,
            lastVisit ?? row.last_visit,
            req.params.id
        );
    logAction(req.user.id, req.user.name, req.user.role, 'UPDATE', 'Patients', `Patient updated: ${req.params.id}`, req.ip);
    res.json(fmt(db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id)));
});

// DELETE patient
router.delete('/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Patient not found' });
    db.prepare('DELETE FROM patients WHERE id = ?').run(req.params.id);
    logAction(req.user.id, req.user.name, req.user.role, 'DELETE', 'Patients', `Patient deleted: ${row.first_name} ${row.last_name}`, req.ip);
    res.json({ message: 'Patient deleted successfully' });
});

module.exports = router;
