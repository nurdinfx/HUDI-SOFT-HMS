const db = require('./database');

async function migrateReturnsV2() {
    console.log('🚀 Starting Returns V2 Migration (Adding medicine_id)...');
    try {
        await db.query(`
            ALTER TABLE pharmacy_supplier_returns ADD COLUMN medicine_id UUID REFERENCES medicines(id);
        `);
        console.log('✨ Returns V2 Migration completed successfully!');
    } catch (err) {
        if (err.message.includes('duplicate column name')) {
            console.log('ℹ️ Column medicine_id already exists.');
        } else {
            console.error('❌ Returns V2 Migration Error:', err.message);
            throw err;
        }
    }
}

if (require.main === module) {
    migrateReturnsV2();
}

module.exports = migrateReturnsV2;
