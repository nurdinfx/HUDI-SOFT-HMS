/**
 * migrate_revenue_analytics.js
 * Creates departments and service_categories tables for dynamic reporting.
 */
const db = require('./database');
const { v4: uuidv4 } = require('uuid');

async function migrate() {
    try {
        console.log('🚀 Starting Revenue Analytics Migration...');

        // 1. Create Departments Table
        await db.exec(`
            CREATE TABLE IF NOT EXISTS departments (
                id UUID PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                code TEXT,
                is_active INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Departments table created/verified');

        // 2. Create Service Categories Table
        await db.exec(`
            CREATE TABLE IF NOT EXISTS service_categories (
                id UUID PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                description TEXT,
                is_active INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Service Categories table created/verified');

        // 3. Seed Initial Departments
        const initialDepts = [
            'Cardiology', 'Laboratory', 'Radiology', 'Pharmacy', 'Emergency', 'Surgery', 'OPD', 'IPD'
        ];
        for (const name of initialDepts) {
            await db.prepare(`
                INSERT INTO departments (id, name, is_active)
                VALUES (?, ?, 1)
                ON CONFLICT (name) DO NOTHING
            `).run(uuidv4(), name);
        }
        console.log('✅ Initial departments seeded');

        // 4. Seed Initial Service Categories
        const initialServices = [
            'Consultation', 'Lab Tests', 'Radiology Exams', 'Procedures', 'Medicines', 'Ward Charges', 'Vaccination', 'Physiotherapy'
        ];
        for (const name of initialServices) {
            await db.prepare(`
                INSERT INTO service_categories (id, name, is_active)
                VALUES (?, ?, 1)
                ON CONFLICT (name) DO NOTHING
            `).run(uuidv4(), name);
        }
        console.log('✅ Initial service categories seeded');

        console.log('✨ Migration completed successfully!');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    }
}

module.exports = migrate;
if (require.main === module) {
    migrate();
}
