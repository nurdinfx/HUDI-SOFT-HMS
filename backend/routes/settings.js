const express = require('express');
const db = require('../database');
const { authenticate, logAction } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const fmt = (s) => ({ name: s.name, tagline: s.tagline, address: s.address, phone: s.phone, email: s.email, website: s.website, currency: s.currency, taxRate: s.tax_rate, logo: s.logo });

router.get('/', async (req, res) => {
    try {
        const row = await db.prepare('SELECT * FROM hospital_settings WHERE id = 1').get();
        if (!row) return res.status(404).json({ error: 'Settings not found' });
        res.json(fmt(row));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/', async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    try {
        const existing = await db.prepare('SELECT * FROM hospital_settings WHERE id = 1').get();
        const { name, tagline, address, phone, email, website, currency, taxRate, logo } = req.body;
        if (!existing) {
            await db.prepare('INSERT INTO hospital_settings (id, name, tagline, address, phone, email, website, currency, tax_rate, logo) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
                .run(name || 'Hospital', tagline || '', address || '', phone || '', email || '', website || '', currency || 'USD', taxRate || 10, logo || null);
        } else {
            await db.prepare('UPDATE hospital_settings SET name=?, tagline=?, address=?, phone=?, email=?, website=?, currency=?, tax_rate=?, logo=? WHERE id=1')
                .run(name || existing.name, tagline ?? existing.tagline, address || existing.address, phone || existing.phone, email || existing.email, website ?? existing.website, currency || existing.currency, taxRate ?? existing.tax_rate, logo ?? existing.logo);
        }
        logAction(req.user.id, req.user.name, req.user.role, 'UPDATE', 'Settings', 'Hospital settings updated', req.ip);
        const updatedRow = await db.prepare('SELECT * FROM hospital_settings WHERE id = 1').get();
        res.json(fmt(updatedRow));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
