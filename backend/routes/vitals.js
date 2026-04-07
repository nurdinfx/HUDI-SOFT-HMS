const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { authenticate, logAction } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// POST /api/vitals - Record vitals
router.post('/', async (req, res) => {
    const { patientId, bp, temperature, pulse, spo2, bloodSugar } = req.body;
    if (!patientId) return res.status(400).json({ error: 'Patient ID is required' });

    // Restrict to nurse and admin
    if (req.user.role !== 'nurse' && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only nurses can record vitals' });
    }

    try {
        const id = uuidv4();
        await db.prepare(`
            INSERT INTO vitals (id, patient_id, bp, temperature, pulse, spo2, blood_sugar, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, patientId, bp || null, temperature || null, pulse || null, spo2 || null, bloodSugar || null, req.user.id, new Date().toISOString());

        logAction(req.user.id, req.user.name, req.user.role, 'CREATE', 'Vitals', `Vitals recorded for patient ${patientId}`, req.ip);
        
        const row = await db.prepare('SELECT * FROM vitals WHERE id = ?').get(id);
        res.status(201).json(row);
    } catch (err) {
        console.error('Vitals creation error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/vitals/patient/:patientId - Get vitals history
router.get('/patient/:patientId', async (req, res) => {
    try {
        const rows = await db.prepare(`
            SELECT v.*, u.name as created_by_name 
            FROM vitals v 
            LEFT JOIN users u ON v.created_by = u.id 
            WHERE v.patient_id = ? 
            ORDER BY v.created_at DESC
        `).all(req.params.patientId);
        
        res.json(rows);
    } catch (err) {
        console.error('Vitals fetch error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
