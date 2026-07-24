const db = require('./database');

async function migrate() {
    try {
        await db.promise;
        db.exec("ALTER TABLE opd_visits ADD COLUMN visit_type TEXT NOT NULL DEFAULT 'New';");
        console.log("Migration successful: added visit_type to opd_visits");
    } catch (error) {
        if (error.message.includes("duplicate column name")) {
            console.log("Column already exists.");
        } else {
            console.error("Migration failed:", error);
        }
    }
}

migrate();
