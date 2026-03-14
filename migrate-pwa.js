const db = require('./backend/database');

async function migrate() {
    console.log('🚀 Starting PWA migration...');
    try {
        await db.exec(`
            CREATE TABLE IF NOT EXISTS push_subscriptions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id),
                subscription TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ push_subscriptions table created successfully.');
    } catch (error) {
        console.error('❌ Migration failed:', error);
    }
}

migrate();
