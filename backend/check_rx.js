const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function find() {
  try {
    const rx = await pool.query(`SELECT id FROM prescriptions WHERE id::text LIKE 'c5d6abbb%'`);
    if (rx.rows.length) {
      console.log("Found Prescription ID:", rx.rows[0].id);
    } else {
      console.log("Not a prescription");
    }
  } catch (e) {
    console.error(e.message);
  }
  pool.end();
}
find();
