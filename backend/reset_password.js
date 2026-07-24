const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const databaseUrl = 'postgresql://postgres.orllnfrrslwedeqrosxh:Laascaanood45%40@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true';

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false }
});

async function reset() {
  try {
    const password = 'admin123';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    
    // Using password_hash and is_active as seen in backend/routes/auth.js
    const result = await pool.query(
      "UPDATE users SET password_hash = $1, is_active = 1 WHERE email = $2 RETURNING *",
      [hash, 'bootaan795@gmail.com']
    );
    
    if (result.rowCount > 0) {
      console.log('✅ Password reset successfully for:', result.rows[0].email);
      console.log('Your new password is: admin123');
    } else {
      console.log('❌ User not found with email: bootaan795@gmail.com');
      const users = await pool.query("SELECT email, role FROM users");
      console.log('Current users in DB:', users.rows);
      
      console.log('Creating admin user...');
      await pool.query(
          "INSERT INTO users (id, email, password_hash, role, name, is_active) VALUES ($1, $2, $3, $4, $5, 1)",
          [require('uuid').v4(), 'bootaan795@gmail.com', hash, 'admin', 'System Admin']
      );
      console.log('✅ Admin user created successfully.');
      console.log('Login Email: bootaan795@gmail.com');
      console.log('Password: admin123');
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

reset();
