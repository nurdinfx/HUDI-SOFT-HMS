const axios = require('axios');
const API_BASE = 'http://localhost:4000/api';

async function testVitals() {
    try {
        console.log('🔍 Testing Vitals API...');
        // We'll need a token, but let's just check if the route is registered (401 is expected, 404 is fail)
        const res = await axios.get(`${API_BASE}/vitals/patient/test`).catch(err => err.response);
        if (res.status === 401) {
            console.log('✅ Route /api/vitals is registered (401 Unauthorized as expected)');
        } else if (res.status === 404) {
            console.error('❌ Route /api/vitals not found (404)');
        } else {
            console.log(`📡 Response: ${res.status} ${res.statusText}`);
        }
    } catch (err) {
        console.error('❌ Test failed:', err.message);
    }
}

testVitals();
