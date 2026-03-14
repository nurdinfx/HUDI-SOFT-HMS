const db = require('./backend/database');

async function checkSchema() {
    try {
        console.log('--- PATIENTS SCHEMA ---');
        const patients = await db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'patients'");
        console.log(patients.rows);

        console.log('--- LAB_TESTS SCHEMA ---');
        const lab_tests = await db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'lab_tests'");
        console.log(lab_tests.rows);

        console.log('--- LAB_CATALOG SCHEMA ---');
        const lab_catalog = await db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'lab_catalog'");
        console.log(lab_catalog.rows);

        console.log('--- EMPLOYEES SCHEMA ---');
        const employees = await db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'employees'");
        console.log(employees.rows);

        console.log('--- USERS SCHEMA ---');
        const users = await db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users'");
        console.log(users.rows);

        console.log('--- CHECKING DATA ---');
        const pCount = await db.prepare("SELECT COUNT(*) as c FROM patients").get();
        console.log('Patient Count:', pCount);

        const eCount = await db.prepare("SELECT COUNT(*) as c FROM employees").get();
        console.log('Employee Count:', eCount);

    } catch (err) {
        console.error('ERROR:', err);
    } finally {
        process.exit();
    }
}

checkSchema();
