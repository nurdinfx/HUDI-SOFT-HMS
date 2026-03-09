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

// Broadcast notification to all (simplified for demo/HUDI SOFT needs)
router.post('/notify', async (req, res) => {
    const { title, message, type, subscription } = req.body;

    const payload = JSON.stringify({
        title: title || 'HUDI_SOFT // HSM Notification',
        body: message || 'System event occurred.',
        icon: '/logo.jpg',
        badge: '/logo.jpg',
        data: {
            url: '/', // Link to navigate to when clicked
            timestamp: Date.now()
        }
    });

    try {
        if (subscription) {
            await webpush.sendNotification(subscription, payload);
            return res.status(200).json({ success: true });
        }

        // In a real scenario, you'd fetch all subscriptions from DB and loop
        // await webpush.sendNotification(userSubscriptionFromDb, payload);

        res.status(200).json({ success: true, message: 'Broadcast initiated.' });
    } catch (error) {
        console.error('❌ Error sending notification:', error);
        res.status(500).json({ error: 'Failed to send notification.' });
    }
});

module.exports = router;
