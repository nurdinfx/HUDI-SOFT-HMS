const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { authenticate, logAction } = require('../middleware/auth');
const { sendPushNotification } = require('../utils/push-notify');

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
router.get('/', async (req, res) => {
    const { search, status } = req.query;
    let q = 'SELECT * FROM patients WHERE 1=1';
    const params = [];
    if (search) { q += ` AND (first_name LIKE ? OR last_name LIKE ? OR patient_id LIKE ? OR phone LIKE ?)`; const s = `%${search}%`; params.push(s, s, s, s); }
    if (status) { q += ' AND status = ?'; params.push(status); }
    q += ' ORDER BY registered_at DESC';
    try {
        const rows = await db.prepare(q).all(...params);
        res.json(rows.map(fmt));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET single patient
router.get('/:id', async (req, res) => {
    try {
        const row = await db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
        if (!row) return res.status(404).json({ error: 'Patient not found' });
        res.json(fmt(row));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST create patient
router.post('/', async (req, res) => {
    const { firstName, lastName, dateOfBirth, gender, bloodGroup, phone, email, address, city, emergencyContact, emergencyPhone, insuranceProvider, insurancePolicyNumber, status, notes, allergies, chronicConditions } = req.body;
    if (!firstName || !lastName || !dateOfBirth || !gender || !phone) {
        return res.status(400).json({ error: 'Required fields: firstName, lastName, dateOfBirth, gender, phone' });
    }
    try {
        const maxIdData = await db.prepare('SELECT patient_id FROM patients ORDER BY patient_id DESC LIMIT 1').get();
        let nextNumber = 1;
        if (maxIdData && maxIdData.patient_id) {
            const lastNumber = parseInt(maxIdData.patient_id.split('-')[1]);
            if (!isNaN(lastNumber)) nextNumber = lastNumber + 1;
        }
        const patientId = `PAT-${String(nextNumber).padStart(4, '0')}`;

        const id = uuidv4();
        await db.prepare(`INSERT INTO patients (id, patient_id, first_name, last_name, date_of_birth, gender, blood_group, phone, email, address, city, emergency_contact, emergency_phone, insurance_provider, insurance_policy_number, allergies, chronic_conditions, status, registered_at, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(id, patientId, firstName, lastName, dateOfBirth, gender, bloodGroup || null, phone, email || null, address || null, city || null, emergencyContact || null, emergencyPhone || null, insuranceProvider || null, insurancePolicyNumber || null, JSON.stringify(allergies || []), JSON.stringify(chronicConditions || []), status || 'active', new Date().toISOString(), notes || null);
        const row = await db.prepare('SELECT * FROM patients WHERE id = ?').get(id);
        logAction(req.user.id, req.user.name, req.user.role, 'CREATE', 'Patients', `New patient registered: ${firstName} ${lastName}`, req.ip);
        
        // Trigger social push notification
        sendPushNotification({
            title: '🏥 New Patient Registered',
            message: `${firstName} ${lastName} has been successfully added to the system.`,
            url: `/patients/${id}`
        });

        res.status(201).json(fmt(row));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT update patient
router.put('/:id', async (req, res) => {
    try {
        const row = await db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
        if (!row) return res.status(404).json({ error: 'Patient not found' });
        const { firstName, lastName, dateOfBirth, gender, bloodGroup, phone, email, address, city, emergencyContact, emergencyPhone, insuranceProvider, insurancePolicyNumber, status, notes, lastVisit, allergies, chronicConditions } = req.body;
        await db.prepare(`UPDATE patients SET first_name=?, last_name=?, date_of_birth=?, gender=?, blood_group=?, phone=?, email=?, address=?, city=?, emergency_contact=?, emergency_phone=?, insurance_provider=?, insurance_policy_number=?, allergies=?, chronic_conditions=?, status=?, notes=?, last_visit=? WHERE id=?`)
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
        const updatedRow = await db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
        res.json(fmt(updatedRow));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE patient
router.delete('/:id', async (req, res) => {
    try {
        const row = await db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
        if (!row) return res.status(404).json({ error: 'Patient not found' });
        
        // Manual cascade delete for all dependent tables
        const pid = req.params.id;
        db.prepare('BEGIN TRANSACTION').run();
        
        // 1. Audit Logs for Lab Tests
        await db.prepare('DELETE FROM lab_audit_logs WHERE lab_test_id IN (SELECT id FROM lab_tests WHERE patient_id = ?)').run(pid);
        
        // 2. Pharmacy Returns and Items
        await db.prepare('DELETE FROM pharmacy_returns WHERE transaction_id IN (SELECT id FROM pharmacy_transactions WHERE patient_id = ?)').run(pid);
        await db.prepare('DELETE FROM pharmacy_transaction_items WHERE transaction_id IN (SELECT id FROM pharmacy_transactions WHERE patient_id = ?)').run(pid);
        await db.prepare('DELETE FROM pharmacy_transactions WHERE patient_id = ?').run(pid);
        
        // 3. Other clinical records
        await db.prepare('DELETE FROM appointments WHERE patient_id = ?').run(pid);
        await db.prepare('DELETE FROM prescriptions WHERE patient_id = ?').run(pid);
        await db.prepare('DELETE FROM lab_tests WHERE patient_id = ?').run(pid);
        await db.prepare('DELETE FROM invoices WHERE patient_id = ?').run(pid);
        await db.prepare('DELETE FROM opd_visits WHERE patient_id = ?').run(pid);
        await db.prepare('DELETE FROM ipd_admissions WHERE patient_id = ?').run(pid);
        await db.prepare('UPDATE beds SET status = \'available\', patient_id = NULL WHERE patient_id = ?').run(pid);
        await db.prepare('DELETE FROM nurse_notes WHERE patient_id = ?').run(pid);
        await db.prepare('DELETE FROM doctor_rounds WHERE patient_id = ?').run(pid);
        await db.prepare('DELETE FROM patient_insurance_policies WHERE patient_id = ?').run(pid);
        await db.prepare('DELETE FROM insurance_claims WHERE patient_id = ?').run(pid);
        await db.prepare('DELETE FROM patient_credits WHERE patient_id = ?').run(pid);
        
        // 4. Finally delete patient
        await db.prepare('DELETE FROM patients WHERE id = ?').run(pid);
        
        db.prepare('COMMIT').run();

        logAction(req.user.id, req.user.name, req.user.role, 'DELETE', 'Patients', `Patient deleted: ${row.first_name} ${row.last_name}`, req.ip);
        res.json({ message: 'Patient deleted successfully' });
    } catch (err) {
        db.prepare('ROLLBACK').run();
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
