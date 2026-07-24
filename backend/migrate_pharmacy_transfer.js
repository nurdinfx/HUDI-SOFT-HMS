/**
 * migrate_pharmacy_transfer.js
 * Adds is_transferred column to pharmacy_transactions.
 */
const db = require('./database');

async function migrate() {
    try {
        console.log('🚀 Starting Pharmacy Transfer Migration...');

        try {
            await db.exec(`ALTER TABLE pharmacy_transactions ADD COLUMN IF NOT EXISTS is_transferred INTEGER DEFAULT 0`);
            console.log(`✅ Added column is_transferred to pharmacy_transactions`);
        } catch (err) {
            // Ignore if it already exists
            if (err.message.includes('already exists') || err.message.includes('duplicate column name') || err.message.includes('duplicate column')) {
                console.log(`ℹ️ Column is_transferred already exists`);
            } else {
                console.warn(`⚠️ Warning adding is_transferred: ${err.message}`);
            }
        }

        console.log('✨ Pharmacy Transfer Migration completed successfully!');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        throw err;
    }
}

module.exports = migrate;

if (require.main === module) {
    migrate();
}
