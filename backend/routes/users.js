const express = require('express');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const db = require('../database');
const { authenticate, logAction } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const fmt = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, phone: u.phone, department: u.department, avatar: u.avatar, isActive: u.is_active === 1, createdAt: u.created_at });

router.get('/', async (req, res) => {
    const { search, role } = req.query;
    let q = 'SELECT * FROM users WHERE 1=1'; const p = [];
    if (search) { q += ` AND (name LIKE ? OR email LIKE ?)`; const s = `%${search}%`; p.push(s, s); }
    if (role) { q += ' AND role = ?'; p.push(role); }
    q += ' ORDER BY name';
    try {
        const rows = await db.prepare(q).all(...p);
        res.json(rows.map(fmt));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const row = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
        if (!row) return res.status(404).json({ error: 'User not found' });
        res.json(fmt(row));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const { name, email, password, role, phone, department } = req.body;
    if (!name || !email || !password || !role) return res.status(400).json({ error: 'name, email, password, role required' });

    try {
        const existing = await db.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existing) return res.status(409).json({ error: 'Email already exists' });
        const hash = bcrypt.hashSync(password, 10);
        const id = uuidv4();
        await db.prepare('INSERT INTO users (id, name, email, password_hash, role, phone, department, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)')
            .run(id, name, email.toLowerCase(), hash, role, phone || null, department || null, new Date().toISOString());

        logAction(req.user.id, req.user.name, req.user.role, 'CREATE', 'Users', `User created: ${email}`, req.ip);
        const row = await db.prepare('SELECT * FROM users WHERE id = ?').get(id);
        res.status(201).json(fmt(row));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    if (req.user.role !== 'admin' && req.user.id !== req.params.id) return res.status(403).json({ error: 'Forbidden' });
    try {
        const row = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
        if (!row) return res.status(404).json({ error: 'User not found' });
        const { name, email, role, phone, department, isActive, password } = req.body;
        const hash = password ? bcrypt.hashSync(password, 10) : row.password_hash;

        await db.prepare('UPDATE users SET name=?, email=?, password_hash=?, role=?, phone=?, department=?, is_active=? WHERE id=?')
            .run(name || row.name, email || row.email, hash, role || row.role, phone ?? row.phone, department ?? row.department, isActive !== undefined ? (isActive ? 1 : 0) : row.is_active, req.params.id);

        logAction(req.user.id, req.user.name, req.user.role, 'UPDATE', 'Users', `User updated: ${email || row.email}`, req.ip);
        const updatedRow = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
        res.json(fmt(updatedRow));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    if (req.params.id === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });
    try {
        const row = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
        if (!row) return res.status(404).json({ error: 'Not found' });
        await db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
        logAction(req.user.id, req.user.name, req.user.role, 'DELETE', 'Users', `User deleted: ${row.email}`, req.ip);
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
