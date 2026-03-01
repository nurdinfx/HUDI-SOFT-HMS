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
router.get('/companies', async (req, res) => {
    try {
        const rows = await db.prepare('SELECT * FROM insurance_companies ORDER BY name').all();
        res.json(rows.map(fmtCompany));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/companies', async (req, res) => {
    const { name, contactPerson, phone, email, address } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const id = uuidv4();
    try {
        await db.prepare('INSERT INTO insurance_companies (id, name, contact_person, phone, email, address, status) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, name, contactPerson || null, phone || null, email || null, address || null, 'active');
        logAction(req.user.id, req.user.name, req.user.role, 'CREATE', 'Insurance', `Company added: ${name}`, req.ip);
        const row = await db.prepare('SELECT * FROM insurance_companies WHERE id = ?').get(id);
        res.status(201).json(fmtCompany(row));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/companies/:id', async (req, res) => {
    try {
        const row = await db.prepare('SELECT * FROM insurance_companies WHERE id = ?').get(req.params.id);
        if (!row) return res.status(404).json({ error: 'Not found' });
        const { name, contactPerson, phone, email, address, status } = req.body;
        await db.prepare('UPDATE insurance_companies SET name=?, contact_person=?, phone=?, email=?, address=?, status=? WHERE id=?').run(name || row.name, contactPerson ?? row.contact_person, phone ?? row.phone, email ?? row.email, address ?? row.address, status || row.status, req.params.id);
        const updatedRow = await db.prepare('SELECT * FROM insurance_companies WHERE id = ?').get(req.params.id);
        res.json(fmtCompany(updatedRow));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/companies/:id', async (req, res) => {
    try {
        await db.prepare('DELETE FROM insurance_companies WHERE id = ?').run(req.params.id);
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Policies
router.get('/policies', async (req, res) => {
    const { patientId } = req.query;
    let q = 'SELECT * FROM patient_insurance_policies'; const p = [];
    if (patientId) { q += ' WHERE patient_id = ?'; p.push(patientId); }
    try {
        const rows = await db.prepare(q).all(...p);
        res.json(rows.map(fmtPolicy));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/policies', async (req, res) => {
    const { patientId, companyId, policyNumber, coverageType, coverageLimit, coPayPercent, expiryDate } = req.body;
    if (!patientId || !companyId || !policyNumber) return res.status(400).json({ error: 'patientId, companyId, policyNumber required' });
    try {
        const company = await db.prepare('SELECT name FROM insurance_companies WHERE id = ?').get(companyId);
        if (!company) return res.status(404).json({ error: 'Insurance company not found' });
        const id = uuidv4();
        await db.prepare(`INSERT INTO patient_insurance_policies (id, patient_id, company_id, company_name, policy_number, coverage_type, coverage_limit, balance_remaining, co_pay_percent, expiry_date, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(id, patientId, companyId, company.name, policyNumber, coverageType || 'partial', coverageLimit || 0, coverageLimit || 0, coPayPercent || 0, expiryDate || null, 'active');
        logAction(req.user.id, req.user.name, req.user.role, 'CREATE', 'Insurance', `Policy added: ${policyNumber}`, req.ip);
        const row = await db.prepare('SELECT * FROM patient_insurance_policies WHERE id = ?').get(id);
        res.status(201).json(fmtPolicy(row));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/policies/:id', async (req, res) => {
    try {
        await db.prepare('DELETE FROM patient_insurance_policies WHERE id = ?').run(req.params.id);
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Claims
router.get('/claims', async (req, res) => {
    const { search, status, patientId } = req.query;
    let q = 'SELECT * FROM insurance_claims WHERE 1=1'; const p = [];
    if (search) { q += ` AND (patient_name LIKE ? OR claim_id LIKE ?)`; const s = `%${search}%`; p.push(s, s); }
    if (status) { q += ' AND status = ?'; p.push(status); }
    if (patientId) { q += ' AND patient_id = ?'; p.push(patientId); }
    q += ' ORDER BY submitted_at DESC';
    try {
        const rows = await db.prepare(q).all(...p);
        res.json(rows.map(fmtClaim));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/claims', async (req, res) => {
    const { patientId, insuranceCompany, policyNumber, invoiceId, claimAmount, policyId } = req.body;
    if (!patientId || !insuranceCompany || !claimAmount) return res.status(400).json({ error: 'patientId, insuranceCompany, claimAmount required' });
    try {
        const patient = await db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId);
        const countData = await db.prepare('SELECT COUNT(*) as c FROM insurance_claims').get();
        const claimId = `CLM-${String(parseInt(countData.c) + 1).padStart(4, '0')}`;
        const id = uuidv4();
        await db.prepare(`INSERT INTO insurance_claims (id, claim_id, patient_id, patient_name, insurance_company, policy_number, invoice_id, claim_amount, status, submitted_at, policy_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(id, claimId, patientId, patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown', insuranceCompany, policyNumber || '', invoiceId || '', parseFloat(claimAmount), 'submitted', new Date().toISOString(), policyId || null);
        logAction(req.user.id, req.user.name, req.user.role, 'CREATE', 'Insurance', `Claim submitted: ${claimId}`, req.ip);
        const row = await db.prepare('SELECT * FROM insurance_claims WHERE id = ?').get(id);
        res.status(201).json(fmtClaim(row));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/claims/:id', async (req, res) => {
    try {
        const row = await db.prepare('SELECT * FROM insurance_claims WHERE id = ?').get(req.params.id);
        if (!row) return res.status(404).json({ error: 'Not found' });
        const { status, approvedAmount } = req.body;
        const newStatus = status || row.status;
        const settled = newStatus === 'settled' || newStatus === 'approved' ? new Date().toISOString() : row.settled_at;
        await db.prepare('UPDATE insurance_claims SET status=?, approved_amount=?, settled_at=? WHERE id=?').run(newStatus, approvedAmount ?? row.approved_amount, settled, req.params.id);

        if ((newStatus === 'approved' || newStatus === 'settled') && row.policy_id && approvedAmount) {
            await db.prepare('UPDATE patient_insurance_policies SET balance_remaining = balance_remaining - ? WHERE id = ?')
                .run(approvedAmount, row.policy_id);
        }

        const updatedRow = await db.prepare('SELECT * FROM insurance_claims WHERE id = ?').get(req.params.id);
        res.json(fmtClaim(updatedRow));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
