const db = require('./database');

async function migrate_hr_credit() {
    console.log("🚀 Starting Employee Credit Migration...");
    try {
        await db.exec('BEGIN');

        try {
            await db.prepare('ALTER TABLE employees ADD COLUMN outstanding_balance DECIMAL(12, 2) DEFAULT 0.00').run();
            console.log("✅ Added `outstanding_balance` column to `employees`");
        } catch (e) {
            if (e.message.includes('duplicate column name')) {
                console.log("⚠️ `outstanding_balance` column already exists.");
            } else {
                throw e;
            }
        }

        // Backfill outstanding_balance for existing employees based on their pending employee_expenses (advances)
        console.log("🔄 Recalculating outstanding balances from pending advances...");
        const employees = await db.prepare("SELECT id FROM employees").all();
        
        let updatedCount = 0;
        for (const emp of employees) {
            const deductions = await db.prepare(`
                SELECT SUM(amount) as total 
                FROM employee_expenses 
                WHERE employee_id = ? AND status = 'pending'
            `).get(emp.id);
            
            const total = parseFloat(deductions?.total || 0);
            if (total > 0) {
                await db.prepare("UPDATE employees SET outstanding_balance = ? WHERE id = ?").run(total, emp.id);
                updatedCount++;
            }
        }
        
        console.log(`✅ Updated balances for ${updatedCount} employees with pending advances.`);

        await db.exec('COMMIT');
        console.log("🎉 Employee Credit Migration completed successfully.");
    } catch (err) {
        await db.exec('ROLLBACK');
        console.error("❌ Migration failed:", err.message);
        process.exit(1);
    }
}

migrate_hr_credit();
