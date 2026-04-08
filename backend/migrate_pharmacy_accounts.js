/**
 * migrate_pharmacy_accounts.js
 * Adds pharmacy_zaad, pharmacy_sahal, pharmacy_edahab, pharmacy_mycash columns to hospital_settings.
 */
const db = require('./database');

async function migrate() {
    try {
        console.log('🚀 Starting Pharmacy Accounts Migration...');

        // In SQLite (local) and PostgreSQL (production), adding a column gracefully
        const columns = ['pharmacy_zaad', 'pharmacy_sahal', 'pharmacy_edahab', 'pharmacy_mycash'];
        
        for (const col of columns) {
            try {
                await db.exec(`ALTER TABLE hospital_settings ADD COLUMN IF NOT EXISTS ${col} TEXT DEFAULT ''`);
                console.log(`✅ Added column ${col}`);
            } catch (err) {
                // Ignore if it already exists (Postgres throws "column already exists", SQLite throws "duplicate column name")
                if (err.message.includes('already exists') || err.message.includes('duplicate column name')) {
                    console.log(`ℹ️ Column ${col} already exists`);
                } else {
                    console.warn(`⚠️ Warning adding ${col}: ${err.message}`);
                }
            }
        }

        console.log('✨ Pharmacy Accounts Migration completed successfully!');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    }
}

module.exports = migrate;

if (require.main === module) {
    migrate();
}
