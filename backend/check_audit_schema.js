const db = require('./database');

async function main() {
    try {
        const result = await db.prepare("SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name = 'audit_logs'").all();
        console.log(result);
    } catch (e) {
        console.error(e);
    }
}
main();
