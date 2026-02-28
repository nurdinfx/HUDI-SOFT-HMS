const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { authenticate, logAction } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const fmt = (t) => ({
    id: t.id, testId: t.test_id, patientId: t.patient_id, patientName: t.patient_name,
    doctorId: t.doctor_id, doctorName: t.doctor_name, testName: t.test_name,
    testCategory: t.test_category, sampleType: t.sample_type, priority: t.priority,
    status: t.status, orderedAt: t.ordered_at, completedAt: t.completed_at,
    results: t.results, normalRange: t.normal_range, reportUrl: t.report_url, cost: t.cost,
    sampleCollectedAt: t.sample_collected_at, sampleCollectedBy: t.sample_collected_by, sampleBarcode: t.sample_barcode,
    criticalFlag: t.critical_flag === 1, technicianId: t.technician_id, clinicalNotes: t.clinical_notes,
    isBilled: t.is_billed === 1, invoiceId: t.invoice_id,
    admissionId: t.admission_id, orderedBy: t.ordered_by,
    resultEnteredBy: t.result_entered_by, resultEnteredAt: t.result_entered_at,
    ward: t.ward_name || t.ward, bedNumber: t.bed_number
});

router.get('/stats', (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const stats = {
        totalToday: db.prepare("SELECT COUNT(*) as c FROM lab_tests WHERE ordered_at LIKE ?").get(today + '%').c,
        pending: db.prepare("SELECT COUNT(*) as c FROM lab_tests WHERE status = 'ordered'").get().c,
        inProgress: db.prepare("SELECT COUNT(*) as c FROM lab_tests WHERE status IN ('sample-collected', 'in-progress')").get().c,
        completed: db.prepare("SELECT COUNT(*) as c FROM lab_tests WHERE status = 'completed' AND ordered_at LIKE ?").get(today + '%').c,
        critical: db.prepare("SELECT COUNT(*) as c FROM lab_tests WHERE critical_flag = 1").get().c,
        revenueToday: db.prepare("SELECT SUM(cost) as s FROM lab_tests WHERE ordered_at LIKE ?").get(today + '%').s || 0
    };
    res.json(stats);
});

router.get('/catalog', (req, res) => {
    const rows = db.prepare('SELECT * FROM lab_catalog ORDER BY category, name').all();
    res.json(rows.map(r => ({
        id: r.id, name: r.name, category: r.category,
        sampleType: r.sample_type, normalRange: r.normal_range, cost: r.cost
    })));
});

router.post('/catalog', (req, res) => {
    const { name, category, sampleType, normalRange, cost } = req.body;
    if (!name || !category) return res.status(400).json({ error: 'name and category required' });

    const id = uuidv4();
    try {
        db.prepare('INSERT INTO lab_catalog (id, name, category, sample_type, normal_range, cost) VALUES (?, ?, ?, ?, ?, ?)')
            .run(id, name, category, sampleType || 'Blood', normalRange || null, cost || 0);

        logAction(req.user.id, req.user.name, req.user.role, 'CREATE', 'Laboratory', `Catalog item added: ${name}`, req.ip);
        res.status(201).json({ id, name, category, sampleType, normalRange, cost });
    } catch (e) {
        res.status(400).json({ error: 'Failed to add catalog item (maybe duplicate name?)' });
    }
});

router.put('/catalog/:id', (req, res) => {
    const { name, category, sampleType, normalRange, cost } = req.body;
    try {
        db.prepare('UPDATE lab_catalog SET name=?, category=?, sample_type=?, normal_range=?, cost=? WHERE id=?')
            .run(name, category, sampleType, normalRange, cost, req.params.id);

        logAction(req.user.id, req.user.name, req.user.role, 'UPDATE', 'Laboratory', `Catalog item updated: ${name}`, req.ip);
        res.json({ id: req.params.id, name, category, sampleType, normalRange, cost });
    } catch (e) {
        res.status(400).json({ error: 'Failed to update catalog item' });
    }
});

router.delete('/catalog/:id', (req, res) => {
    const row = db.prepare('SELECT name FROM lab_catalog WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Item not found' });

    db.prepare('DELETE FROM lab_catalog WHERE id = ?').run(req.params.id);
    logAction(req.user.id, req.user.name, req.user.role, 'DELETE', 'Laboratory', `Catalog item deleted: ${row.name}`, req.ip);
    res.json({ message: 'Deleted' });
});

router.get('/', (req, res) => {
    const { search, status, priority, patientId, admissionId, critical } = req.query;
    let q = `
        SELECT lt.*, a.ward, a.bed_number, w.name as ward_name
        FROM lab_tests lt
        LEFT JOIN ipd_admissions a ON lt.admission_id = a.id
        LEFT JOIN wards w ON a.ward = w.id
        WHERE 1=1
    `;
    const p = [];
    if (search) {
        q += ` AND (lt.patient_name LIKE ? OR lt.test_name LIKE ? OR lt.test_id LIKE ?)`;
        const s = `%${search}%`;
        p.push(s, s, s);
    }
    if (status) { q += ' AND lt.status = ?'; p.push(status); }
    if (priority) { q += ' AND lt.priority = ?'; p.push(priority); }
    if (patientId) { q += ' AND lt.patient_id = ?'; p.push(patientId); }
    if (admissionId) { q += ' AND lt.admission_id = ?'; p.push(admissionId); }
    if (critical === '1' || critical === 'true') { q += ' AND lt.critical_flag = 1'; }
    q += ' ORDER BY lt.ordered_at DESC';
    res.json(db.prepare(q).all(...p).map(fmt));
});

router.get('/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM lab_tests WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Lab test not found' });
    res.json(fmt(row));
});

router.post('/', (req, res) => {
    const { patientId, admissionId, doctorId, testName, testCategory, sampleType, priority, cost, clinicalNotes } = req.body;
    if (!patientId || !testName || !testCategory) return res.status(400).json({ error: 'patientId, testName, testCategory required' });

    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    const doctor = doctorId ? db.prepare('SELECT * FROM doctors WHERE id = ?').get(doctorId) : null;

    const count = db.prepare('SELECT COUNT(*) as c FROM lab_tests').get().c;
    const testId = `LAB-${String(count + 1).padStart(4, '0')}`;
    const id = uuidv4();

    // Auto-Billing Check
    let invoiceId = null;
    if (cost > 0) {
        const invCount = db.prepare('SELECT COUNT(*) as c FROM invoices').get().c;
        const invIdStr = `INV-${String(invCount + 1).padStart(4, '0')}`;
        const invUuid = uuidv4();
        const settings = db.prepare('SELECT tax_rate FROM hospital_settings WHERE id = 1').get();
        const taxRate = settings ? settings.tax_rate : 10;
        const tax = cost * (taxRate / 100);
        const total = cost + tax;
        const items = [{ description: `Lab Test: ${testName}`, category: 'Laboratory', quantity: 1, unitPrice: cost, total: cost }];

        db.prepare(`INSERT INTO invoices (id, invoice_id, patient_id, patient_name, date, due_date, items, subtotal, tax, discount, total, paid_amount, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(invUuid, invIdStr, patientId, `${patient.first_name} ${patient.last_name}`, new Date().toISOString().split('T')[0], new Date().toISOString().split('T')[0], JSON.stringify(items), cost, tax, 0, total, 0, 'unpaid');
        invoiceId = invUuid;
    }

    db.prepare(`INSERT INTO lab_tests (id, test_id, patient_id, patient_name, doctor_id, doctor_name, test_name, test_category, sample_type, priority, status, ordered_at, cost, clinical_notes, is_billed, invoice_id, admission_id, ordered_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(id, testId, patientId, `${patient.first_name} ${patient.last_name}`, doctorId || '', doctor ? doctor.name : '', testName, testCategory, sampleType || 'Blood', priority || 'normal', 'ordered', new Date().toISOString(), cost || 0, clinicalNotes || null, invoiceId ? 1 : 0, invoiceId, admissionId || null, req.user.name);

    logAction(req.user.id, req.user.name, req.user.role, 'CREATE', 'Laboratory', `Lab test ordered: ${testName} (ID: ${testId}) ${admissionId ? '(IPD)' : '(OPD)'}`, req.ip);
    res.status(201).json(fmt(db.prepare(`
        SELECT lt.*, a.ward, a.bed_number, w.name as ward_name
        FROM lab_tests lt
        LEFT JOIN ipd_admissions a ON lt.admission_id = a.id
        LEFT JOIN wards w ON a.ward = w.id
        WHERE lt.id = ?
    `).get(id)));
});

router.put('/:id/collect', (req, res) => {
    const { collectedBy, barcode } = req.body;
    const row = db.prepare('SELECT * FROM lab_tests WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });

    db.prepare('UPDATE lab_tests SET status=?, sample_collected_at=?, sample_collected_by=?, sample_barcode=? WHERE id=?')
        .run('sample-collected', new Date().toISOString(), collectedBy || req.user.name, barcode || `BC-${row.test_id}`, req.params.id);

    db.prepare('INSERT INTO lab_audit_logs (id, lab_test_id, action, performed_by, details) VALUES (?, ?, ?, ?, ?)')
        .run(uuidv4(), req.params.id, 'COLLECT_SAMPLE', req.user.name, `Sample collected with barcode ${barcode}`);

    res.json(fmt(db.prepare('SELECT * FROM lab_tests WHERE id = ?').get(req.params.id)));
});

router.put('/:id', (req, res) => {
    const row = db.prepare('SELECT lt.* FROM lab_tests lt WHERE lt.id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    const { status, results, normalRange, completedAt, reportUrl, priority, criticalFlag, clinicalNotes, technicianId } = req.body;

    const newStatus = status || row.status;
    const completedTs = newStatus === 'completed' ? (completedAt || new Date().toISOString()) : row.completed_at;
    const crit = criticalFlag !== undefined ? (criticalFlag ? 1 : 0) : row.critical_flag;

    let resultEnteredBy = row.result_entered_by;
    let resultEnteredAt = row.result_entered_at;

    if (newStatus === 'completed' && row.status !== 'completed') {
        resultEnteredBy = req.user.name;
        resultEnteredAt = new Date().toISOString();
    }

    db.prepare('UPDATE lab_tests SET status=?, results=?, normal_range=?, completed_at=?, report_url=?, priority=?, critical_flag=?, clinical_notes=?, technician_id=?, result_entered_by=?, result_entered_at=? WHERE id=?')
        .run(newStatus, results ?? row.results, normalRange ?? row.normal_range, completedTs, reportUrl ?? row.report_url, priority || row.priority, crit, clinicalNotes ?? row.clinical_notes, technicianId ?? row.technician_id, resultEnteredBy, resultEnteredAt, req.params.id);

    db.prepare('INSERT INTO lab_audit_logs (id, lab_test_id, action, performed_by, details) VALUES (?, ?, ?, ?, ?)')
        .run(uuidv4(), req.params.id, 'UPDATE_TEST', req.user.name, `Updated status to ${newStatus}, results: ${results ? 'entered' : 'n/a'}`);

    logAction(req.user.id, req.user.name, req.user.role, 'UPDATE', 'Laboratory', `Lab test ${row.test_id} updated to ${newStatus}`, req.ip);
    res.json(fmt(db.prepare(`
        SELECT lt.*, a.ward, a.bed_number, w.name as ward_name
        FROM lab_tests lt
        LEFT JOIN ipd_admissions a ON lt.admission_id = a.id
        LEFT JOIN wards w ON a.ward = w.id
        WHERE lt.id = ?
    `).get(req.params.id)));
});

router.delete('/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM lab_tests WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    db.prepare('DELETE FROM lab_tests WHERE id = ?').run(req.params.id);
    logAction(req.user.id, req.user.name, req.user.role, 'DELETE', 'Laboratory', `Lab test deleted: ${row.test_id}`, req.ip);
    res.json({ message: 'Deleted' });
});

module.exports = router;
