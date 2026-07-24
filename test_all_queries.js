const db = require('./backend/database');

async function testQuery(name, sql, params = []) {
    try {
        console.log(`Testing [${name}]: ${sql}`);
        const res = await db.prepare(sql).all(...params);
        console.log(`✅ [${name}] Success: ${res.length} rows`);
    } catch (e) {
        console.error(`❌ [${name}] FAILED: ${e.message}`);
    }
}

async function testGet(name, sql, params = []) {
    try {
        console.log(`Testing [${name}]: ${sql}`);
        const res = await db.prepare(sql).get(...params);
        console.log(`✅ [${name}] Success:`, res);
    } catch (e) {
        console.error(`❌ [${name}] FAILED: ${e.message}`);
    }
}

async function run() {
    try {
        await testQuery('HR Employees List', 'SELECT * FROM employees ORDER BY full_name ASC');
        await testQuery('HR Payroll Summary Employees', "SELECT * FROM employees WHERE status = 'active'");
        await testGet('HR Stats Count', "SELECT COUNT(*) as count FROM employees WHERE status = 'active'");
        await testGet('Dashboard Patients Active', "SELECT COUNT(*) as c FROM patients WHERE status = 'active'");
        await testGet('Dashboard Doctors Available', "SELECT COUNT(*) as c FROM doctors WHERE status = 'available'");
        await testGet('Dashboard Invoices Unpaid', "SELECT COUNT(*) as c FROM invoices WHERE status IN ('unpaid','partial')");
        
        console.log('\n--- TESTING AUTH/USER QUERIES ---');
        await testGet('Auth User by Email', 'SELECT * FROM users WHERE email = ? AND is_active = 1', ['admin@test.com']);
        await testGet('Auth Middleware Query', 'SELECT id, name, email, role, department FROM users WHERE id = ? AND is_active = 1', ['98616fa8-4f10-4828-98e8-d6e4b868a38b']);
        
        console.log('\n--- INSPECTING COLUMNS ---');
        const pRow = await db.prepare('SELECT * FROM patients LIMIT 1').get();
        console.log('Patient Columns:', Object.keys(pRow || {}));

        const uRow = await db.prepare('SELECT * FROM users LIMIT 1').get();
        console.log('User Columns:', Object.keys(uRow || {}));

        const eRow = await db.prepare('SELECT * FROM employees LIMIT 1').get();
        console.log('Employee Columns:', Object.keys(eRow || {}));
        
    } catch (err) {
        console.error('CRITICAL ERROR:', err);
    } finally {
        process.exit();
    }
}

run();
