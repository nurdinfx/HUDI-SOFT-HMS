const db = require('./database');
(async () => {
    try {
        const rows = await db.prepare("SELECT invoice_id FROM invoices WHERE invoice_id LIKE 'INV-POS-%' ORDER BY LENGTH(invoice_id), invoice_id").all();
        console.log('--- ALL INV-POS IDs ---');
        console.log(JSON.stringify(rows.map(r => r.invoice_id), null, 2));
        
        const latest = await db.prepare("SELECT invoice_id FROM invoices WHERE invoice_id LIKE 'INV-POS-%' ORDER BY LENGTH(invoice_id) DESC, invoice_id DESC LIMIT 1").get();
        console.log('\n--- NEW LOGIC WOULD FIND ---');
        console.log(latest);
        
        const schema = await db.prepare("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'invoices'").all();
        console.log('\n--- INVOICES SCHEMA ---');
        console.log(schema);
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();
