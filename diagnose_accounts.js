const path = require('path');
const fs = require('fs');

// Mock dotenv for the script
process.env.DB_PATH = path.resolve(__dirname, 'backend/hospital.db');

async function runDiagnosis() {
    console.log("--- HMS Accounts Diagnosis ---");
    console.log("Database Path:", process.env.DB_PATH);

    if (!fs.existsSync(process.env.DB_PATH)) {
        console.error("❌ Database file NOT FOUND at " + process.env.DB_PATH);
        return;
    }

    try {
        const db = require('./backend/database');
        console.log("Waiting for DB promise...");
        await db.promise;
        console.log("✅ DB Ready.");

        console.log("\n1. Verifying Table Presence...");
        const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
        console.log("Tables found:", tables.map(t => t.name).join(', '));

        console.log("\n2. Inspecting 'account_entries' Schema...");
        const columns = db.prepare("PRAGMA table_info(account_entries)").all();
        console.log("Columns in account_entries:");
        columns.forEach(c => console.log(` - ${c.name} (${c.type})` || '??'));

        console.log("\n3. Testing Problematic Queries...");
        try {
            const stats = db.prepare(`
                SELECT 
                    SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as totalIncome,
                    SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as totalExpense
                FROM account_entries
            `).get();
            console.log("✅ Stats Query Success:", stats);
        } catch (e) {
            console.error("❌ Stats Query FAILED:", e.message);
        }

        try {
            const deptBreakdown = db.prepare(`
                SELECT department, SUM(amount) as amount 
                FROM account_entries 
                WHERE type = 'income' 
                GROUP BY department
            `).all();
            console.log("✅ Dept Breakdown Success. Rows:", deptBreakdown.length);
        } catch (e) {
            console.error("❌ Dept Breakdown FAILED:", e.message);
        }

        try {
            const recent = db.prepare('SELECT * FROM account_entries ORDER BY date DESC LIMIT 5').all();
            console.log("✅ Recent Entries Success. Rows:", recent.length);
        } catch (e) {
            console.error("❌ Recent Entries FAILED:", e.message);
        }

    } catch (err) {
        console.error("❌ CRITICAL DIAGNOSTIC ERROR:", err);
    }
}

runDiagnosis();
