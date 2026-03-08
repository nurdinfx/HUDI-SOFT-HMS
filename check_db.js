const { Pool } = require('pg');
require('dotenv').config({ path: 'backend/.env' });
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function find() {
  const tables = ['medicines', 'patients', 'opd_visits', 'lab_tests', 'prescriptions', 'invoices'];
  for (const t of tables) {
    try {
      const res = await pool.query(`SELECT id FROM ${t} WHERE id::text LIKE '%c5d6abbb%'`);
      if (res.rows.length) console.log('Found in', t, res.rows[0]);
    } catch (e) {
        console.error("Error in", t, e.message);
    }
  }
  pool.end();
}
find();
