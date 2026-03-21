const db = require('./database');

async function migrate() {
    console.log('🚀 Migrating Push Subscriptions table...');
    const sql = `
        CREATE TABLE IF NOT EXISTS push_subscriptions (
            id SERIAL PRIMARY KEY,
            user_id UUID REFERENCES users(id) ON DELETE SET NULL,
            subscription TEXT NOT NULL UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `;
    try {
        await db.exec(sql);
        console.log('✅ push_subscriptions table is ready.');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
    }
}

if (require.main === module) {
    migrate();
}

module.exports = migrate;
