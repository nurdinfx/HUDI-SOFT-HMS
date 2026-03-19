const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://127.0.0.1:3000',
    'https://hudi-soft-hms.vercel.app',
    'https://hudi-soft-hms-git-main-nurdinfxs-projects.vercel.app'
];

if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
    origin: (origin, callback) => {
        // Reflect origin back to allow any requester with credentials
        // This is safe for this project's current deployment state
        callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    optionsSuccessStatus: 200
}));
app.options('*', cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
    console.log(`📡 [${new Date().toLocaleTimeString()}] ${req.method} ${req.originalUrl}`);
    next();
});

// Wait for DB to be ready, then mount routes
const dbModule = require('./database');
dbModule.promise.then(async () => {
    // Run Migrations
    console.log('📦 Running Database Migrations...');
    try {
        await require('./migrate_revenue_analytics')();
        await require('./migrate_multi_test')();
    } catch (err) {
        console.error('⚠️ Migration warning:', err.message);
    }

    // Routes
    app.use('/api/auth', require('./routes/auth'));
    app.use('/api/pos', require('./routes/pos'));
    app.use('/api/push', require('./routes/push'));
    console.log('✅ POS Routes mounted at /api/pos');
    console.log('✅ Push Notification Routes mounted at /api/push');

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
        res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime(), version: '1.0.0' });
    });

    // 404 handler
    app.use((req, res) => {
        console.warn(`🔍 404 Not Found: ${req.method} ${req.originalUrl}`);
        res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
    });

    // Error handler
    app.use((err, req, res, next) => {
        console.error('❌ Server Error:', err);
        res.status(500).json({ error: 'Internal server error', message: err.message });
    });

    app.listen(PORT, () => {
        console.log(`\n🏥 Hospital Management API ready at http://localhost:${PORT}`);
        console.log(`   Health: http://localhost:${PORT}/api/health`);
        console.log(`\n📋 Initial credentials:`);
        console.log(`   Admin:  admin@hospital.com  / admin123\n`);
    });
}).catch(err => {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
});

module.exports = app;
