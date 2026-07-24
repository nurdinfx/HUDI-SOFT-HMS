// using global fetch

async function test() {
    try {
        console.log('--- Logging in ---');
        const loginRes = await fetch('http://localhost:4000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@hospital.com', password: 'admin123' })
        });
        const loginData = await loginRes.json();
        const token = loginData.token;
        if (!token) {
            console.error('Login failed:', loginData);
            return;
        }
        console.log('✅ Login successful, token received');

        console.log('\n--- Testing /api/patients?status=active ---');
        const res = await fetch('http://localhost:4000/api/patients?status=active', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        console.log('Response:', data);
        
        console.log('\n--- Testing /api/hr/stats ---');
        const res2 = await fetch('http://localhost:4000/api/hr/stats', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data2 = await res2.json();
        console.log('Response:', data2);

    } catch (err) {
        console.error('CRITICAL ERROR:', err);
    }
}

test();
