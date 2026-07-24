const db = require('./backend/database');

async function main() {
    try {
        const tables = ['patients', 'employees', 'users', 'lab_tests', 'lab_catalog'];
        for (const table of tables) {
            console.log(`\n--- ${table.toUpperCase()} COLUMNS ---`);
            const res = await db.query(`SELECT column_name FROM information_schema.columns WHERE table_name = '${table}'`);
            console.log(res.rows.map(r => r.column_name).join(', '));
        }

        console.log('\n--- TESTING HR STATS QUERY ---');
        try {
            const res = await db.prepare("SELECT COUNT(*) as count FROM employees WHERE status = 'active'").get();
            console.log('HR Stats Count Success:', res);
        } catch (e) {
            console.error('HR Stats Query Failed:', e.message);
        }

    } catch (err) {
        console.error('ERROR:', err);
    } finally {
        process.exit();
    }
}

main();
