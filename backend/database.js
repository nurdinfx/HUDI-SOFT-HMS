/**
 * database.js – PostgreSQL implementation for Supabase
 * Connects to a cloud database for persistence on free tiers.
 */
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const databaseUrl = process.env.DATABASE_URL;
if (databaseUrl && (databaseUrl.includes('base') || databaseUrl.startsWith('YOUR_'))) {
  console.warn('⚠️ Potential misconfiguration in DATABASE_URL:', databaseUrl.substring(0, 20) + '...');
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err.message);
});

// Helper to convert SQLite SQL to PostgreSQL SQL
function convertSql(sql) {
  if (!sql) return sql;
  return sql
    .replace(/datetime\('now'\)/g, 'CURRENT_TIMESTAMP')
    .replace(/date\('now'\)/g, 'CURRENT_DATE')
    .replace(/INSERT OR IGNORE/gi, 'INSERT')
    .replace(/BEGIN TRANSACTION/gi, 'BEGIN')
    .replace(/\?/g, (match, offset, string) => {
      // Simple replacement for ? to $1, $2 etc.
      let count = (string.substring(0, offset).match(/\?/g) || []).length + 1;
      return '$' + count;
    });
}

// ------------------------------------------------------------------
// Wrapper for compatibility with existing code
// ------------------------------------------------------------------
module.exports = {
  prepare(sql) {
    const pgSql = convertSql(sql);
    return {
      async run(...params) {
        try {
          const result = await pool.query(pgSql, params);
          return { changes: result.rowCount };
        } catch (err) {
          console.error('❌ DB Run Error:', err.message, '\nSQL:', pgSql);
          throw err;
        }
      },
      async get(...params) {
        try {
          const result = await pool.query(pgSql, params);
          return result.rows[0];
        } catch (err) {
          console.error('❌ DB Get Error:', err.message, '\nSQL:', pgSql);
          throw err;
        }
      },
      async all(...params) {
        try {
          const result = await pool.query(pgSql, params);
          return result.rows;
        } catch (err) {
          console.error('❌ DB All Error:', err.message, '\nSQL:', pgSql);
          throw err;
        }
      }
    };
  },
  async exec(sql) {
    const pgSql = convertSql(sql);
    try {
      await pool.query(pgSql);
    } catch (err) {
      console.error('❌ DB Exec Error:', err.message, '\nSQL:', pgSql);
      throw err;
    }
  },
  async query(sql, params = []) {
    return pool.query(sql, params);
  },
  get ready() { return true; }, // Pool is ready on creation
  get promise() { return Promise.resolve(); } // Shim for server.js
};
