const db = require('./database');

async function createDailyOperationsTable() {
    console.log('Creating daily_operations table...');
    
    try {
        await db.prepare(`
            CREATE TABLE IF NOT EXISTS daily_operations (
                id UUID PRIMARY KEY,
                employee_id UUID REFERENCES employees(id),
                employee_name TEXT NOT NULL,
                department TEXT,
                transaction_type TEXT NOT NULL,
                lab_test_id UUID REFERENCES lab_catalog(id),
                lab_test_name TEXT,
                amount NUMERIC DEFAULT 0,
                description TEXT,
                date DATE DEFAULT CURRENT_DATE,
                recorded_by TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP
            )
        `).run();

        console.log('Successfully created daily_operations table.');
    } catch (err) {
        console.error('Error creating daily_operations table:', err.message);
    }
}

createDailyOperationsTable();
