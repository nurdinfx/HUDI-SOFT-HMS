/**
 * backend/migrate_vitals.js
 * Migration script to create the vitals table.
 */
const db = require('./database');

async function migrateVitals() {
  console.log('👷 Migrating: Vitals Table...');
  try {
    const sql = `
      CREATE TABLE IF NOT EXISTS vitals (
        id UUID PRIMARY KEY,
        patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
        bp TEXT,
        temperature NUMERIC,
        pulse INTEGER,
        spo2 INTEGER,
        blood_sugar INTEGER,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await db.exec(sql);
    console.log('✅ Vitals table migration completed.');
  } catch (err) {
    console.error('❌ Vitals migration failed:', err.message);
    throw err;
  }
}

module.exports = migrateVitals;

if (require.main === module) {
  migrateVitals().then(() => process.exit(0)).catch(() => process.exit(1));
}
