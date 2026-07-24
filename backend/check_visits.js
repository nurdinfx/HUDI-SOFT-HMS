const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function find() {
  try {
    const visits = await pool.query(`SELECT id, visit_id FROM opd_visits WHERE visit_id IN ('OPD-0002', 'OPD-0003')`);
    console.log("OPD Visits:");
    visits.rows.forEach(r => console.log(` - ID: ${r.id}, visit_id: ${r.visit_id}`));
  } catch (e) {
    console.error(e.message);
  }
  pool.end();
}
find();
