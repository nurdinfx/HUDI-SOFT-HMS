const webpush = require('web-push');
const db = require('../database');

// Configure web-push
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:admin@hudi-soft.com',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
}

async function sendPushNotification({ title, message, url }) {
    const payload = JSON.stringify({
        title: title || 'HUDI_SOFT // HSM Alert',
        body: message || 'A system update occurred.',
        icon: '/logo.jpg',
        badge: '/logo.jpg',
        data: {
            url: url || '/',
            timestamp: Date.now()
        }
    });

    try {
        const sql = `SELECT subscription FROM push_subscriptions`;
        const rows = await db.prepare(sql).all();
        
        console.log(`📡 [Push Utility] Broadcasting to ${rows.length} subscriptions...`);

        const pushPromises = rows.map(row => {
            const sub = JSON.parse(row.subscription);
            return webpush.sendNotification(sub, payload).catch(err => {
                if (err.statusCode === 404 || err.statusCode === 410) {
                    console.log('🗑️ Removing expired subscription');
                    db.prepare(`DELETE FROM push_subscriptions WHERE subscription = ?`).run(row.subscription);
                } else {
                    console.error('❌ Push error:', err.message);
                }
            });
        });

        await Promise.all(pushPromises);
        return { success: true, count: rows.length };
    } catch (error) {
        console.error('❌ Error in push utility:', error);
        return { success: false, error: error.message };
    }
}

module.exports = { sendPushNotification };
