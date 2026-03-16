const jwt = require('jsonwebtoken');
const db = require('../database');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const authenticate = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await db.prepare('SELECT id, name, email, role, department FROM users WHERE id = ? AND is_active = 1').get(decoded.id);
        
        if (!user) {
            console.warn(`🔍 Auth: User not found or inactive for ID: ${decoded.id}`);
            return res.status(401).json({ error: 'User not found or inactive' });
        }
        
        req.user = user;
        next();
    } catch (err) {
        if (err.message.includes('timeout') || err.message.includes('terminated') || err.message.includes('connection')) {
            console.error('❌ Auth DB Error (Timeout/Connection):', err.message);
            return res.status(503).json({ 
                error: 'Database connection issue', 
                message: 'The server is experiencing high latency or connectivity issues with the database. Please try again in a few seconds.' 
            });
        }
        console.warn('🔍 Auth: Invalid or expired token');
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

const logAction = (userId, userName, userRole, action, module, details, ip = '127.0.0.1') => {
    try {
        db.prepare(`INSERT INTO audit_logs (id, user_id, user_name, user_role, action, module, details, timestamp, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(uuidv4(), userId, userName, userRole, action, module, details, new Date().toISOString(), ip);
    } catch (e) {
        // silent fail for audit logging
    }
};

const authorize = (allowedRoles = []) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        if (!allowedRoles.includes(req.user.role)) {
            console.warn(`🔍 Auth: Forbidden - Role ${req.user.role} not in [${allowedRoles.join(', ')}]`);
            return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
        }
        next();
    };
};

module.exports = { authenticate, logAction, authorize };
