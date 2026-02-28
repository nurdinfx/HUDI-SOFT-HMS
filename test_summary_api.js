const path = require('path');
const fs = require('fs');

// Add backend node_modules to path
const backendModules = path.join(__dirname, 'backend', 'node_modules');
if (fs.existsSync(backendModules)) {
    module.paths.push(backendModules);
}

const express = require('express');

// Mock req/res
const req = {
    query: {},
    headers: {},
    ip: '127.0.0.1',
    user: { id: 'test-admin', name: 'Test Admin', role: 'admin' }
};

const res = {
    statusCode: 200,
    status(code) {
        this.statusCode = code;
        return this;
    },
    json(data) {
        if (this.statusCode >= 400) {
            console.error("❌ ERROR RESPONSE (" + this.statusCode + "):", JSON.stringify(data, null, 2));
        } else {
            console.log("✅ SUCCESS RESPONSE:", JSON.stringify(data, null, 2));
        }
        return this;
    }
};

async function testSummary() {
    console.log("--- Testing Accounts Summary API ---");

    // Set environment
    process.env.DB_PATH = path.resolve(__dirname, 'backend/hospital.db');
    process.env.JWT_SECRET = 'hospital_mgmt_super_secret_key_2024';

    try {
        const db = require('./backend/database');
        await db.promise;
        console.log("DB Ready.");

        const accountsRouter = require('./backend/routes/accounts');

        // Find the summary route handler
        // Express Router stores routes in 'stack'
        const summaryLayer = accountsRouter.stack.find(l => l.route && l.route.path === '/summary');
        if (!summaryLayer) {
            console.error("❌ Summary route not found in router stack");
            return;
        }

        const handler = summaryLayer.route.stack.find(s => s.method === 'get').handle;

        if (!handler) {
            console.error("❌ Handler not found");
            return;
        }

        console.log("Calling summary handler...");
        await handler(req, res);

    } catch (err) {
        console.error("❌ Test CRASHED with error:", err.message);
        console.error(err.stack);
    }
}

testSummary();
