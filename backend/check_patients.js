const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function find() {
  try {
    const res = await pool.query(`SELECT id, first_name, last_name, patient_id FROM patients`);
    console.log("Patients:");
    res.rows.forEach(r => console.log(` - ID: ${r.id}, Name: ${r.first_name} ${r.last_name}`));
  } catch (e) {
    console.error(e.message);
  }
  pool.end();
}
find();
