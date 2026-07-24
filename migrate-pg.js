const db = require('./backend/database');

async function migrate() {
    console.log("🚀 Starting database migration...");

    const tables = {
        patients: [
            "patient_id TEXT UNIQUE",
            "date_of_birth DATE",
            "blood_group TEXT",
            "city TEXT",
            "registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
            "last_visit TIMESTAMP",
            "notes TEXT"
        ],
        doctors: [
            "doctor_id TEXT UNIQUE",
            "qualification TEXT",
            "experience INTEGER DEFAULT 0",
            "available_days TEXT DEFAULT '[]'",
            "available_time_start TEXT DEFAULT '09:00'",
            "available_time_end TEXT DEFAULT '17:00'",
            "joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
        ],
        opd_visits: [
            "visit_type TEXT DEFAULT 'New'"
        ]
    };

    try {
        console.log("Fixing audit_logs table...");
        try {
            // Check if id is serial by checking type
            const colType = await db.prepare("SELECT data_type FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'id'").get();
            if (colType && colType.data_type === 'integer') {
                console.log("Dropping audit_logs table to change id from SERIAL to UUID...");
                await db.exec("DROP TABLE audit_logs;");
                await db.exec(`CREATE TABLE audit_logs (
                    id UUID PRIMARY KEY,
                    user_id UUID,
                    user_name TEXT,
                    user_role TEXT,
                    action TEXT,
                    module TEXT,
                    details TEXT,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    ip_address TEXT
                );`);
                console.log("✅ audit_logs table recreated with UUID id");
            }
        } catch (e) {
            console.warn("Could not fix audit_logs table:", e.message);
        }
        for (const [table, columns] of Object.entries(tables)) {
            console.log(`Checking table: ${table}`);
            for (const colDef of columns) {
                const colName = colDef.split(' ')[0];
                try {
                    await db.exec(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${colDef};`);
                    console.log(`✅ Column ${colName} added/verified in ${table}`);
                } catch (err) {
                    console.error(`❌ Failed to add ${colName} to ${table}:`, err.message);
                }
            }
        }
        console.log("✨ Migration completed successfully!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Migration process failed:", error);
        process.exit(1);
    }
}

migrate();
