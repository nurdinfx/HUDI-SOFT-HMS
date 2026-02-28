const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { authenticate, logAction } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const fmtCompany = (c) => ({ id: c.id, name: c.name, contactPerson: c.contact_person, phone: c.phone, email: c.email, address: c.address, status: c.status });
const fmtClaim = (c) => ({ id: c.id, claimId: c.claim_id, patientId: c.patient_id, patientName: c.patient_name, insuranceCompany: c.insurance_company, policyNumber: c.policy_number, invoiceId: c.invoice_id, claimAmount: c.claim_amount, approvedAmount: c.approved_amount, status: c.status, submittedAt: c.submitted_at, settledAt: c.settled_at, policyId: c.policy_id });
const fmtPolicy = (p) => ({ id: p.id, patientId: p.patient_id, companyId: p.company_id, companyName: p.company_name, policyNumber: p.policy_number, coverageType: p.coverage_type, coverageLimit: p.coverage_limit, balanceRemaining: p.balance_remaining, coPayPercent: p.co_pay_percent, expiry_date: p.expiry_date, status: p.status, createdAt: p.created_at });

// Companies
router.get('/companies', (req, res) => res.json(db.prepare('SELECT * FROM insurance_companies ORDER BY name').all().map(fmtCompany)));

router.post('/companies', (req, res) => {
    const { name, contactPerson, phone, email, address } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const id = uuidv4();
    db.prepare('INSERT INTO insurance_companies (id, name, contact_person, phone, email, address, status) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, name, contactPerson || null, phone || null, email || null, address || null, 'active');
    logAction(req.user.id, req.user.name, req.user.role, 'CREATE', 'Insurance', `Company added: ${name}`, req.ip);
    res.status(201).json(fmtCompany(db.prepare('SELECT * FROM insurance_companies WHERE id = ?').get(id)));
});

router.put('/companies/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM insurance_companies WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    const { name, contactPerson, phone, email, address, status } = req.body;
    db.prepare('UPDATE insurance_companies SET name=?, contact_person=?, phone=?, email=?, address=?, status=? WHERE id=?').run(name || row.name, contactPerson ?? row.contact_person, phone ?? row.phone, email ?? row.email, address ?? row.address, status || row.status, req.params.id);
    res.json(fmtCompany(db.prepare('SELECT * FROM insurance_companies WHERE id = ?').get(req.params.id)));
});

router.delete('/companies/:id', (req, res) => {
    db.prepare('DELETE FROM insurance_companies WHERE id = ?').run(req.params.id);
    res.json({ message: 'Deleted' });
});

// Policies
router.get('/policies', (req, res) => {
    const { patientId } = req.query;
    let q = 'SELECT * FROM patient_insurance_policies'; const p = [];
    if (patientId) { q += ' WHERE patient_id = ?'; p.push(patientId); }
    res.json(db.prepare(q).all(...p).map(fmtPolicy));
});

router.post('/policies', (req, res) => {
    const { patientId, companyId, policyNumber, coverageType, coverageLimit, coPayPercent, expiryDate } = req.body;
    if (!patientId || !companyId || !policyNumber) return res.status(400).json({ error: 'patientId, companyId, policyNumber required' });
    const company = db.prepare('SELECT name FROM insurance_companies WHERE id = ?').get(companyId);
    if (!company) return res.status(404).json({ error: 'Insurance company not found' });
    const id = uuidv4();
    db.prepare(`INSERT INTO patient_insurance_policies (id, patient_id, company_id, company_name, policy_number, coverage_type, coverage_limit, balance_remaining, co_pay_percent, expiry_date, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(id, patientId, companyId, company.name, policyNumber, coverageType || 'partial', coverageLimit || 0, coverageLimit || 0, coPayPercent || 0, expiryDate || null, 'active');
    logAction(req.user.id, req.user.name, req.user.role, 'CREATE', 'Insurance', `Policy added: ${policyNumber}`, req.ip);
    res.status(201).json(fmtPolicy(db.prepare('SELECT * FROM patient_insurance_policies WHERE id = ?').get(id)));
});

router.delete('/policies/:id', (req, res) => {
    db.prepare('DELETE FROM patient_insurance_policies WHERE id = ?').run(req.params.id);
    res.json({ message: 'Deleted' });
});

// Claims
router.get('/claims', (req, res) => {
    const { search, status, patientId } = req.query;
    let q = 'SELECT * FROM insurance_claims WHERE 1=1'; const p = [];
    if (search) { q += ` AND (patient_name LIKE ? OR claim_id LIKE ?)`; const s = `%${search}%`; p.push(s, s); }
    if (status) { q += ' AND status = ?'; p.push(status); }
    if (patientId) { q += ' AND patient_id = ?'; p.push(patientId); }
    q += ' ORDER BY submitted_at DESC';
    res.json(db.prepare(q).all(...p).map(fmtClaim));
});

router.post('/claims', (req, res) => {
    const { patientId, insuranceCompany, policyNumber, invoiceId, claimAmount, policyId } = req.body;
    if (!patientId || !insuranceCompany || !claimAmount) return res.status(400).json({ error: 'patientId, insuranceCompany, claimAmount required' });
    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId);
    const count = db.prepare('SELECT COUNT(*) as c FROM insurance_claims').get().c;
    const claimId = `CLM-${String(count + 1).padStart(4, '0')}`;
    const id = uuidv4();
    db.prepare(`INSERT INTO insurance_claims (id, claim_id, patient_id, patient_name, insurance_company, policy_number, invoice_id, claim_amount, status, submitted_at, policy_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(id, claimId, patientId, patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown', insuranceCompany, policyNumber || '', invoiceId || '', parseFloat(claimAmount), 'submitted', new Date().toISOString(), policyId || null);
    logAction(req.user.id, req.user.name, req.user.role, 'CREATE', 'Insurance', `Claim submitted: ${claimId}`, req.ip);
    res.status(201).json(fmtClaim(db.prepare('SELECT * FROM insurance_claims WHERE id = ?').get(id)));
});

router.put('/claims/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM insurance_claims WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    const { status, approvedAmount } = req.body;
    const newStatus = status || row.status;
    const settled = newStatus === 'settled' || newStatus === 'approved' ? new Date().toISOString() : row.settled_at;
    db.prepare('UPDATE insurance_claims SET status=?, approved_amount=?, settled_at=? WHERE id=?').run(newStatus, approvedAmount ?? row.approved_amount, settled, req.params.id);

    // If approved/settled, deduct from policy balance if linked
    if ((newStatus === 'approved' || newStatus === 'settled') && row.policy_id && approvedAmount) {
        db.prepare('UPDATE patient_insurance_policies SET balance_remaining = balance_remaining - ? WHERE id = ?')
            .run(approvedAmount, row.policy_id);
    }

    res.json(fmtClaim(db.prepare('SELECT * FROM insurance_claims WHERE id = ?').get(req.params.id)));
});

module.exports = router;

module.exports = router;
