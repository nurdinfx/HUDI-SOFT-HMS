async function testPushRoute() {
    console.log('🧪 Testing Backend Push Route...');
    try {
        const response = await fetch('http://localhost:4000/api/push/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: '00000000-0000-0000-0000-000000000000',
                subscription: { endpoint: 'https://fcm.googleapis.com/fcm/send/test', keys: { p256dh: 'test', auth: 'test' } }
            })
        });

        const data = await response.json();
        if (response.ok) {
            console.log('✅ /api/push/subscribe matched:', data);
        } else {
            console.error('❌ /api/push/subscribe failed:', data);
        }
    } catch (error) {
        console.error('❌ Network error:', error.message);
    }
}

testPushRoute();
