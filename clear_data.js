const { Pool } = require('pg');
require('dotenv').config({ path: '../backend/.env' });

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
    'wards',
    'beds',
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
    'employees',
    'employee_ledger',
    'employee_expenses',
    'credit_customers',
    'credit_transactions'
  ];

  console.log('🚀 Starting system cleanup...');

  try {
    for (const table of tables) {
      console.log(`🧹 Clearing ${table}...`);
      try {
        await db.query(`TRUNCATE TABLE ${table} CASCADE`);
      } catch (err) {
        console.warn(`⚠️ Could not truncate ${table}: ${err.message}`);
      }
    }
    console.log('✅ System cleanup completed. All data removed except Users and Settings.');
  } catch (err) {
    console.error('❌ Cleanup failed:', err.message);
  } finally {
    await db.end();
  }
}

clearData();
