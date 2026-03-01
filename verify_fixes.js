const API_URL = 'http://localhost:4000/api';
const credentials = {
    email: 'admin@hospital.com',
    password: 'admin123'
};

async function verify() {
    console.log('🚀 Starting API Verification (Native Fetch)...\n');
    let token = '';

    try {
        console.log('1. Testing Login...');
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials),
            signal: AbortSignal.timeout(10000)
        });
        const loginData = await loginRes.json();
        if (!loginRes.ok) throw new Error(`Login failed: ${JSON.stringify(loginData)}`);
        token = loginData.token;
        console.log('✅ Login Successful!\n');

        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        const testEndpoint = async (name, path) => {
            console.log(`${name}...`);
            const res = await fetch(`${API_URL}${path}`, { headers });
            const data = await res.json();
            if (!res.ok) throw new Error(`${name} failed: ${JSON.stringify(data)}`);
            console.log(`✅ ${name} Successful!\n`);
            return data;
        };

        await testEndpoint('2. Testing /auth/me', '/auth/me');
        await testEndpoint('3. Testing Dashboard Stats', '/dashboard');
        const patients = await testEndpoint('4. Testing Patients List', '/patients');
        console.log(`   (Count: ${patients.length})\n`);
        const doctors = await testEndpoint('5. Testing Doctors List', '/doctors');
        console.log(`   (Count: ${doctors.length})\n`);
        await testEndpoint('6. Testing Account Summary', '/accounts/summary');
        await testEndpoint('7. Testing OPD Stats', '/opd/stats');

        console.log('✨ All critical endpoints verified successfully!');
    } catch (error) {
        console.error('❌ Verification Failed!');
        console.error(error.message);
        process.exit(1);
    }
}

verify();
