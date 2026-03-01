require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'https://hudi-soft-hms.vercel.app'
];

if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        const isAllowed = allowedOrigins.indexOf(origin) !== -1 ||
            allowedOrigins.some(o => origin.startsWith(o)) ||
            (origin.includes('hudi-soft-hms') && origin.endsWith('.vercel.app'));

        if (isAllowed) {
            return callback(null, true);
        }
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Wait for DB to be ready, then mount routes
const dbModule = require('./database');
dbModule.promise.then(() => {
    // Routes
    app.use('/api/auth', require('./routes/auth'));
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
    app.use('/api/audit', require('./routes/audit'));
    app.use('/api/reports', require('./routes/reports'));
    app.use('/api/settings', require('./routes/settings'));
    app.use('/api/dashboard', require('./routes/dashboard'));

    // Health check
    app.get('/api/health', (req, res) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime(), version: '1.0.0' });
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
