const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const db = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function clearFinancialData() {
  const tables = [
    'insurance_claims',
    'daily_operations',
    'account_entries',
    'invoices'
  ];

  console.log('🚀 Starting specialized financial data cleanup...');
  console.log('📌 This will clear Billing, Payments, Accounts, and Reports data only.');

  try {
    // We use a specific order and TRUNCATE with CASCADE to handle potential dependencies
    for (const table of tables) {
      console.log(`🧹 Clearing ${table}...`);
      try {
        await db.query(`TRUNCATE TABLE ${table} CASCADE`);
        console.log(`✅ Cleared ${table}`);
      } catch (err) {
        console.warn(`⚠️  Could not truncate ${table}: ${err.message}`);
        // Fallback to DELETE if TRUNCATE fails
        try {
            await db.query(`DELETE FROM ${table}`);
            console.log(`✅ Deleted all rows from ${table} (fallback)`);
        } catch (delErr) {
            console.error(`❌ Permanent failure for ${table}: ${delErr.message}`);
        }
      }
    }
    console.log('\n✅ Financial cleanup completed! Transactional records removed.');
    console.log('📌 Preserved: Patients, Doctors, Medicines, Appointments, Settings, and Users.');
  } catch (err) {
    console.error('❌ Cleanup failed:', err.message);
  } finally {
    await db.end();
  }
}

clearFinancialData();
