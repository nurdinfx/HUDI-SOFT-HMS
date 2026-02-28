const express = require('express');
const db = require('../database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', (req, res) => {
    const { module, userId, startDate, endDate, limit } = req.query;
    let q = 'SELECT * FROM audit_logs WHERE 1=1'; const p = [];
    if (module) { q += ' AND module = ?'; p.push(module); }
    if (userId) { q += ' AND user_id = ?'; p.push(userId); }
    if (startDate) { q += ' AND timestamp >= ?'; p.push(startDate); }
    if (endDate) { q += ' AND timestamp <= ?'; p.push(endDate + 'T23:59:59'); }
    q += ' ORDER BY timestamp DESC';
    if (limit) { q += ' LIMIT ?'; p.push(parseInt(limit)); }
    const rows = db.prepare(q).all(...p);
    res.json(rows.map(l => ({ id: l.id, userId: l.user_id, userName: l.user_name, userRole: l.user_role, action: l.action, module: l.module, details: l.details, timestamp: l.timestamp, ipAddress: l.ip_address })));
});

module.exports = router;
