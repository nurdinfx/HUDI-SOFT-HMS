const db = require('./backend/database');

async function main() {
    try {
        const res = await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        const tables = res.rows.map(r => r.table_name);
        
        for (const table of tables) {
            console.log(`\n--- ${table.toUpperCase()} COLUMNS ---`);
            const colRes = await db.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${table}'`);
            console.log(colRes.rows.map(r => `${r.column_name} (${r.data_type})`).join(', '));
        }

    } catch (err) {
        console.error('ERROR:', err);
    } finally {
        process.exit();
    }
}

main();
