const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function clearPagesData() {
  const transactionalTables = [
    'invoices',
    'account_entries',
    'insurance_claims',
    'daily_operations',
    'manual_daily_revenue',
    'credit_transactions',
    'credit_ledger',
    'credit_payments',
    'employee_ledger',
    'employee_expenses',
    'employee_payroll',
    'department_budgets',
    'lab_tests',
    'appointments',
    'prescriptions',
    'opd_visits',
    'ipd_admissions',
    'nurse_notes',
    'doctor_rounds',
    'lab_audit_logs',
    'audit_logs',
    'patient_credits',
    'pharmacy_transactions',
    'pharmacy_transaction_items',
    'pharmacy_purchase_orders',
    'pharmacy_purchase_items',
    'pharmacy_returns',
    'pharmacy_supplier_returns',
    'push_subscriptions'
  ];

  console.log('🚀 Starting system cleanup for Billing, Payment, Accounts, and Reports...');

  try {
    await db.query('BEGIN');

    for (const table of transactionalTables) {
      console.log(`🧹 Clearing ${table}...`);
      try {
        // Using TRUNCATE with CASCADE for Postgres
        await db.query(`TRUNCATE TABLE ${table} CASCADE`);
        console.log(`✅ Cleared ${table}`);
      } catch (err) {
        console.warn(`⚠️  Could not truncate ${table}, falling back to DELETE: ${err.message}`);
        try {
          await db.query(`DELETE FROM ${table}`);
          console.log(`✅ Deleted all rows from ${table}`);
        } catch (delErr) {
          console.error(`❌ Permanent failure for ${table}: ${delErr.message}`);
        }
      }
    }

    console.log('🔄 Resetting balances and statuses in master tables...');
    
    // Reset Credit Customer balances
    await db.query('UPDATE credit_customers SET outstanding_balance = 0, total_credit_taken = 0');
    console.log('✅ Reset credit_customers balances');

    // Reset Employee balances
    await db.query('UPDATE employees SET outstanding_balance = 0');
    console.log('✅ Reset employees balances');

    // Reset Bed statuses
    await db.query("UPDATE beds SET status = 'available', patient_id = NULL");
    console.log('✅ Reset beds status');

    // Reset Patient last_visit
    await db.query('UPDATE patients SET last_visit = NULL');
    console.log('✅ Reset patients last_visit');

    await db.query('COMMIT');
    console.log('\n✨ System cleanup completed successfully!');
    console.log('📌 Preserved: Patients, Doctors, Medicines, Users, Settings, and Departments.');
    
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('❌ Cleanup failed:', err.message);
  } finally {
    await db.end();
  }
}

clearPagesData();
