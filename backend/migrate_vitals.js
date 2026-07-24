/**
 * migrate_vitals.js
 * Creates the vitals table for recording patient clinical measurements.
 */
const db = require('./database');

async function migrate() {
    try {
        console.log('🚀 Starting Vitals Migration...');

        // Create Vitals Table
        await db.exec(`
            CREATE TABLE IF NOT EXISTS vitals (
                id UUID PRIMARY KEY,
                patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
                bp TEXT,
                temperature NUMERIC,
                pulse INTEGER,
                spo2 INTEGER,
                blood_sugar INTEGER,
                created_by UUID REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Vitals table created/verified');

        console.log('✨ Vitals migration completed successfully!');
    } catch (err) {
        console.error('❌ Vitals migration failed:', err.message);
        // Don't exit process, just throw so server.js can catch it
        throw err;
    }
}

module.exports = migrate;
if (require.main === module) {
    migrate().then(() => process.exit(0)).catch(() => process.exit(1));
}
