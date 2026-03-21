const db = require('./database');

try {
    console.log("Adding is_viewed_by_doctor column to appointments table...");
    db.prepare('ALTER TABLE appointments ADD COLUMN is_viewed_by_doctor INTEGER DEFAULT 0').run();
    console.log("Column added successfully.");
} catch (error) {
    if (error.message.includes("duplicate column name")) {
        console.log("Column already exists.");
    } else {
        console.error("Error modifying database:", error.message);
    }
}
