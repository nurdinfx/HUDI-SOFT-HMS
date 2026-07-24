const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function find() {
  try {
    const meds = await pool.query(`SELECT id, name FROM medicines`);
    console.log("Medicines:");
    meds.rows.forEach(r => console.log(` - ID: ${r.id}, Name: ${r.name}`));
  } catch (e) {
    console.error(e.message);
  }
  pool.end();
}
find();
