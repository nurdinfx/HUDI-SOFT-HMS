const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function find() {
  try {
    const labs = await pool.query(`SELECT id, name FROM lab_catalog`);
    console.log("Lab Catalog:");
    labs.rows.forEach(r => console.log(` - ID: ${r.id}, Name: ${r.name}`));
  } catch (e) {
    console.error(e.message);
  }
  pool.end();
}
find();
