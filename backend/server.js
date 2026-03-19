const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 4000;

// 1. CORS - MUST BE FIRST
app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    optionsSuccessStatus: 200
}));

// Handle preflight globally
app.options('*', cors());

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
    console.log(`📡 [${new Date().toLocaleTimeString()}] ${req.method} ${req.originalUrl}`);
    next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/pos', require('./routes/pos'));
app.use('/api/push', require('./routes/push'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/doctors', require('./routes/doctors'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/pharmacy', require('./routes/pharmacy'));
app.use('/api/laboratory', require('./routes/laboratory'));
app.use('/api/billing', require('./routes/billing'));
app.use('/api/opd', require('./routes/opd'));
app.use('/api/ipd', require('./routes/ipd'));
app.use('/api/insurance', require('./routes/insurance'));
app.use('/api/users', require('./routes/users'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/accounts', require('./routes/accounts'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/audit', require('./routes/audit'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/credit', require('./routes/credit'));
app.use('/api/hr', require('./routes/hr'));
app.use('/api/daily-operations', require('./routes/daily_operations'));
app.use('/api/revenue-analytics', require('./routes/revenue_analytics'));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime(), version: '1.1.0' });
});

// Wait for DB to be ready, then start listening
const dbModule = require('./database');
dbModule.promise.then(async () => {
    console.log('📦 Running Database Migrations...');
    try {
        await require('./migrate_revenue_analytics')();
        await require('./migrate_multi_test')();
    } catch (err) {
        console.error('⚠️ Migration warning:', err.message);
    }

    app.listen(PORT, () => {
        console.log(`\n🏥 Hospital Management API ready at http://localhost:${PORT}`);
        console.log(`   Health: http://localhost:${PORT}/api/health`);
    });
}).catch(err => {
    console.error('❌ Failed to connect to database:', err);
    // Still listen so we can return errors/health status
    app.listen(PORT, () => {
        console.log(`\n⚠️ API running in ERROR mode (No DB) at http://localhost:${PORT}`);
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('❌ Server Error:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
});

module.exports = app;

module.exports = app;
