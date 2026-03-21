const db = require('./database');

async function migratePurchasePayment() {
    console.log('🚀 Starting Purchase Payment Migration (Adding payment_type)...');
    try {
        await db.query(`
            ALTER TABLE pharmacy_purchase_orders ADD COLUMN payment_type TEXT DEFAULT 'cash';
        `);
        console.log('✨ Purchase Payment Migration completed successfully!');
    } catch (err) {
        if (err.message.includes('duplicate column name')) {
            console.log('ℹ️ Column payment_type already exists.');
        } else {
            console.error('❌ Purchase Payment Migration Error:', err.message);
            throw err;
        }
    }
}

if (require.main === module) {
    migratePurchasePayment();
}

module.exports = migratePurchasePayment;
