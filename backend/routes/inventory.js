const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { authenticate, logAction } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const fmt = (i) => ({ id: i.id, itemId: i.item_id, name: i.name, category: i.category, description: i.description, quantity: i.quantity, unit: i.unit, reorderLevel: i.reorder_level, unitCost: i.unit_cost, supplier: i.supplier, lastRestocked: i.last_restocked, status: i.status });

router.get('/', (req, res) => {
    const { search, category, status } = req.query;
    let q = 'SELECT * FROM inventory_items WHERE 1=1'; const p = [];
    if (search) { q += ` AND (name LIKE ? OR item_id LIKE ? OR category LIKE ?)`; const s = `%${search}%`; p.push(s, s, s); }
    if (category) { q += ' AND category = ?'; p.push(category); }
    if (status) { q += ' AND status = ?'; p.push(status); }
    q += ' ORDER BY name';
    res.json(db.prepare(q).all(...p).map(fmt));
});

router.get('/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM inventory_items WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(fmt(row));
});

router.post('/', (req, res) => {
    const { name, category, description, quantity, unit, reorderLevel, unitCost, supplier } = req.body;
    if (!name || !category) return res.status(400).json({ error: 'name and category required' });
    const count = db.prepare('SELECT COUNT(*) as c FROM inventory_items').get().c;
    const itemId = `INV-${String(count + 1).padStart(4, '0')}`;
    const id = uuidv4();
    const qty = parseInt(quantity) || 0;
    const rl = parseInt(reorderLevel) || 5;
    const status = qty === 0 ? 'out-of-stock' : qty <= rl ? 'low-stock' : 'in-stock';
    db.prepare(`INSERT INTO inventory_items (id, item_id, name, category, description, quantity, unit, reorder_level, unit_cost, supplier, last_restocked, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(id, itemId, name, category, description || null, qty, unit || 'pcs', rl, unitCost || 0, supplier || null, new Date().toISOString().split('T')[0], status);
    logAction(req.user.id, req.user.name, req.user.role, 'CREATE', 'Inventory', `Item added: ${name}`, req.ip);
    res.status(201).json(fmt(db.prepare('SELECT * FROM inventory_items WHERE id = ?').get(id)));
});

router.put('/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM inventory_items WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    const { name, category, description, quantity, unit, reorderLevel, unitCost, supplier } = req.body;
    const qty = quantity !== undefined ? parseInt(quantity) : row.quantity;
    const rl = reorderLevel !== undefined ? parseInt(reorderLevel) : row.reorder_level;
    const status = qty === 0 ? 'out-of-stock' : qty <= rl ? 'low-stock' : 'in-stock';
    const restocked = quantity !== undefined && parseInt(quantity) > row.quantity ? new Date().toISOString().split('T')[0] : row.last_restocked;
    db.prepare('UPDATE inventory_items SET name=?, category=?, description=?, quantity=?, unit=?, reorder_level=?, unit_cost=?, supplier=?, last_restocked=?, status=? WHERE id=?')
        .run(name || row.name, category || row.category, description ?? row.description, qty, unit || row.unit, rl, unitCost ?? row.unit_cost, supplier ?? row.supplier, restocked, status, req.params.id);
    logAction(req.user.id, req.user.name, req.user.role, 'UPDATE', 'Inventory', `Item updated: ${name || row.name}`, req.ip);
    res.json(fmt(db.prepare('SELECT * FROM inventory_items WHERE id = ?').get(req.params.id)));
});

router.delete('/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM inventory_items WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    db.prepare('DELETE FROM inventory_items WHERE id = ?').run(req.params.id);
    logAction(req.user.id, req.user.name, req.user.role, 'DELETE', 'Inventory', `Item deleted: ${row.name}`, req.ip);
    res.json({ message: 'Deleted' });
});

module.exports = router;
