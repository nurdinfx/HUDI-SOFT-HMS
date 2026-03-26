/**
 * backend/add_trial_column.js
 * Migration script to add trial_started_at column to hospital_settings.
 */
const db = require('./database');

async function migrate() {
    console.log('🚀 Starting trial_started_at migration...');
    try {
        // 1. Add column if not exists
        await db.exec(`
            ALTER TABLE hospital_settings 
            ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        `);
        console.log('✅ Column trial_started_at added or already exists.');

        // 2. Initialize if null
        const settings = await db.prepare('SELECT id, trial_started_at FROM hospital_settings WHERE id = 1').get();
        if (settings && !settings.trial_started_at) {
            await db.prepare('UPDATE hospital_settings SET trial_started_at = CURRENT_TIMESTAMP WHERE id = 1').run();
            console.log('✅ Initialized trial_started_at for existing settings.');
        }

        console.log('🎉 Migration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    }
}

migrate();
