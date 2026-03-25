const db = require('./database');

async function main() {
    try {
        const result = await db.prepare("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_logs') as exists").get();
        console.log(result);
    } catch (e) {
        console.error(e);
    }
}
main();
