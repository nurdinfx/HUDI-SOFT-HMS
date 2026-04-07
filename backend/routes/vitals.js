const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { authenticate, logAction } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const fmt = (v) => ({
    id: v.id,
    patientId: v.patient_id,
    bp: v.bp,
    temperature: v.temperature,
    pulse: v.pulse,
    spo2: v.spo2,
    bloodSugar: v.blood_sugar,
    createdBy: v.created_by,
    createdByName: v.created_by_name,
    createdAt: v.created_at
});

// GET vitals for a patient
router.get('/patient/:patientId', async (req, res) => {
    try {
        const rows = await db.prepare(`
            SELECT v.*, u.name as created_by_name 
            FROM vitals v 
            LEFT JOIN users u ON v.created_by = u.id 
            WHERE v.patient_id = ? 
            ORDER BY v.created_at DESC
        `).all(req.params.patientId);
        res.json(rows.map(fmt));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST create vitals
router.post('/', async (req, res) => {
    const { patientId, bp, temperature, pulse, spo2, bloodSugar } = req.body;
    
    // Only nurse and admin can create/edit vitals
    if (req.user.role !== 'nurse' && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied. Only nurses can record vitals.' });
    }

    if (!patientId) {
        return res.status(400).json({ error: 'patientId is required' });
    }

    try {
        const id = uuidv4();
        await db.prepare(`
            INSERT INTO vitals (id, patient_id, bp, temperature, pulse, spo2, blood_sugar, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            id, 
            patientId, 
            bp || null, 
            temperature || null, 
            pulse || null, 
            spo2 || null, 
            bloodSugar || null, 
            req.user.id, 
            new Date().toISOString()
        );

        logAction(req.user.id, req.user.name, req.user.role, 'CREATE', 'Vitals', `Vitals recorded for patient ${patientId}`, req.ip);
        
        const row = await db.prepare(`
            SELECT v.*, u.name as created_by_name 
            FROM vitals v 
            LEFT JOIN users u ON v.created_by = u.id 
            WHERE v.id = ?
        `).get(id);
        
        res.status(201).json(fmt(row));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
