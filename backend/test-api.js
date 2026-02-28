// Quick API test script
const BASE = 'http://localhost:4000/api';

async function test() {
    console.log('=== Hospital Management API Tests ===\n');

    // 1. Health check
    const health = await fetch(`${BASE}/health`).then(r => r.json());
    console.log('✅ Health:', health.status);

    // 2. Login
    const loginRes = await fetch(`${BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@hospital.com', password: 'admin123' })
    }).then(r => r.json());
    const token = loginRes.token;
    console.log('✅ Login:', loginRes.user ? loginRes.user.name : 'FAILED');
    if (!token) { console.error('❌ No token received'); process.exit(1); }

    const auth = { Authorization: `Bearer ${token}` };

    // 3. Test each endpoint
    const endpoints = [
        ['GET', '/patients', 'Patients'],
        ['GET', '/doctors', 'Doctors'],
        ['GET', '/appointments', 'Appointments'],
        ['GET', '/pharmacy/medicines', 'Medicines'],
        ['GET', '/pharmacy/prescriptions', 'Prescriptions'],
        ['GET', '/laboratory', 'Lab Tests'],
        ['GET', '/billing', 'Invoices'],
        ['GET', '/opd', 'OPD Visits'],
        ['GET', '/ipd/admissions', 'IPD Admissions'],
        ['GET', '/ipd/beds', 'Beds'],
        ['GET', '/insurance/companies', 'Insurance Companies'],
        ['GET', '/insurance/claims', 'Insurance Claims'],
        ['GET', '/inventory', 'Inventory'],
        ['GET', '/accounts', 'Accounts'],
        ['GET', '/users', 'Users'],
        ['GET', '/audit', 'Audit Logs'],
        ['GET', '/dashboard', 'Dashboard'],
        ['GET', '/settings', 'Settings'],
    ];

    for (const [method, path, name] of endpoints) {
        try {
            const res = await fetch(`${BASE}${path}`, { headers: auth });
            const data = await res.json();
            const count = Array.isArray(data) ? data.length : (data.entries ? data.entries.length : 'obj');
            console.log(`✅ ${name}: ${res.status} (${count} items)`);
        } catch (e) {
            console.log(`❌ ${name}: ${e.message}`);
        }
    }

    // 4. Test auth/me
    const me = await fetch(`${BASE}/auth/me`, { headers: auth }).then(r => r.json());
    console.log(`\n✅ Auth/me: ${me.name} (${me.role})`);

    console.log('\n=== All tests complete ===');
}

test().catch(console.error);
