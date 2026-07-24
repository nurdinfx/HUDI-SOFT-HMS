const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function find() {
  try {
    const labs = await pool.query(`SELECT id, test_name FROM lab_tests WHERE test_name = 'hjh' OR test_name LIKE '%hjh%'`);
    console.log("Lab Tests:");
    labs.rows.forEach(r => console.log(` - ID: ${r.id}, test_name: ${r.test_name}`));
  } catch (e) {
    console.error(e.message);
  }
  pool.end();
}
find();
