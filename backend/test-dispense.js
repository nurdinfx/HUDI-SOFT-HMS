const http = require('http');

const loginData = JSON.stringify({ email: 'admin@hospital.com', password: 'admin123' });

const req1 = http.request({
    hostname: 'localhost',
    port: 4000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
    }
}, res1 => {
    let body1 = '';
    res1.on('data', chunk => body1 += chunk);
    res1.on('end', () => {
        const { token } = JSON.parse(body1);

        // Now trigger Dispense
        const req2 = http.request({
            hostname: 'localhost',
            port: 4000,
            path: '/api/pharmacy/prescriptions/f9f93910-a0d3-4583-8750-79464e0a7968/dispense',
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        }, res2 => {
            let body2 = '';
            res2.on('data', chunk => body2 += chunk);
            res2.on('end', () => {
                console.log('STATUS:', res2.statusCode);
                console.log('RESPONSE:', body2);
            });
        });
        req2.end();
    });
});
req1.write(loginData);
req1.end();
