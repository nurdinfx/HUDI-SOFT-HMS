const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

const db = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function clearData() {
  const tables = [
    'lab_audit_logs',
    'lab_tests',
    'lab_catalog',
    'appointments',
    'prescriptions',
    'medicines',
    'invoices',
    'opd_visits',
    'ipd_admissions',
    'nurse_notes',
    'doctor_rounds',
    'account_entries',
    'department_budgets',
    'audit_logs',
    'insurance_companies',
    'patient_insurance_policies',
    'insurance_claims',
    'patients',
    'doctors',
    'wards',
    'beds',
    'employees',
    'employee_ledger',
    'employee_expenses',
    'credit_customers',
    'credit_transactions'
  ];

  console.log('🚀 Starting system cleanup...');

  try {
    for (const table of tables) {
      try {
        await db.query(`TRUNCATE TABLE ${table} CASCADE`);
        console.log(`✅ Cleared ${table}`);
      } catch (err) {
        console.warn(`⚠️  Could not truncate ${table}: ${err.message}`);
      }
    }
    console.log('\n✅ System cleanup completed! All clinical/financial data removed.');
    console.log('📌 Preserved: users, hospital_settings');
  } catch (err) {
    console.error('❌ Cleanup failed:', err.message);
  } finally {
    await db.end();
  }
}

clearData();
