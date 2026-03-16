const db = require('./database');

async function migrateMultiTest() {
    console.log('Adding selected_tests to daily_operations table...');
    try {
        await db.prepare('ALTER TABLE daily_operations ADD COLUMN IF NOT EXISTS selected_tests JSONB').run();
        console.log('Successfully added selected_tests column.');
    } catch (err) {
        // In case ADD COLUMN IF NOT EXISTS is not supported by some PG versions or SQLite shims
        console.error('Migration notice:', err.message);
    }
}

migrateMultiTest();
