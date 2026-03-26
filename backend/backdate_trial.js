const db = require('./database');
db.promise.then(async () => {
    try {
        await db.prepare("UPDATE hospital_settings SET trial_started_at = $1 WHERE id = 1")
                .run('2026-03-24 09:00:00');
        console.log('✅ Backdated trial_started_at to 2026-03-24');
        process.exit(0);
    } catch (err) {
        console.error('❌ Failed:', err.message);
        process.exit(1);
    }
});
