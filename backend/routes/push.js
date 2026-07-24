const express = require('express');
const router = express.Router();
const webpush = require('web-push');
const db = require('../database');

// Configure web-push
webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

// Store subscription
router.post('/subscribe', async (req, res) => {
    const { subscription, userId } = req.body;

    try {
        if (!subscription) {
            return res.status(400).json({ error: 'Subscription is required.' });
        }

        console.log('✅ New Push Subscription received for user:', userId || 'anonymous');

        // Store in DB
        const sql = `
            INSERT INTO push_subscriptions (user_id, subscription)
            VALUES (?, ?)
            ON CONFLICT DO NOTHING
        `;
        
        await db.prepare(sql).run(userId || null, JSON.stringify(subscription));

        res.status(201).json({ message: 'Subscription stored successfully.' });
    } catch (error) {
        console.error('❌ Error storing subscription:', error);
        res.status(500).json({ error: 'Failed to store subscription.' });
    }
});

// Broadcast notification to all stored subscriptions
router.post('/notify', async (req, res) => {
    const { title, message, type, url } = req.body;

    const payload = JSON.stringify({
        title: title || 'HUDI_SOFT // HSM Notification',
        body: message || 'System event occurred.',
        icon: '/logo.jpg',
        badge: '/logo.jpg',
        data: {
            url: url || '/',
            timestamp: Date.now()
        }
    });

    try {
        // Fetch all subscriptions from DB
        const sql = `SELECT subscription FROM push_subscriptions`;
        const rows = await db.prepare(sql).all();
        
        console.log(`📡 Broadcasting to ${rows.length} subscriptions...`);

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
        res.status(200).json({ success: true, count: rows.length });
    } catch (error) {
        console.error('❌ Error in broadcast:', error);
        res.status(500).json({ error: 'Failed to broadcast notification.' });
    }
});

module.exports = router;
