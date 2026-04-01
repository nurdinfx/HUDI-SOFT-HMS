const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function restoreAppointments() {
  console.log('🚀 Starting appointment restoration...');

  try {
    // 1. Fetch patients and doctors
    const patients = await pool.query('SELECT id, first_name, last_name FROM patients');
    const doctors = await pool.query('SELECT id, name, department FROM doctors');

    if (patients.rows.length === 0 || doctors.rows.length === 0) {
      console.error('❌ Cannot restore appointments: No patients or doctors found in database.');
      return;
    }

    console.log(`✅ Found ${patients.rows.length} patients and ${doctors.rows.length} doctors.`);

    // 2. Generate historical appointments for Feb and Mar 2026
    const appointments = [];
    const statuses = ['scheduled', 'completed', 'completed', 'completed', 'cancelled'];
    const types = ['consultation', 'follow-up', 'routine-checkup', 'emergency'];
    const times = ['09:00', '10:00', '11:00', '14:00', '15:30', '16:45'];

    // Generate ~60 appointments (roughly 1 per day)
    for (let i = 1; i <= 60; i++) {
      const patient = patients.rows[Math.floor(Math.random() * patients.rows.length)];
      const doctor = doctors.rows[Math.floor(Math.random() * doctors.rows.length)];
      
      // Random date in Feb or Mar 2026
      const month = Math.random() > 0.5 ? 1 : 2; // 1 = Feb, 2 = Mar (0-indexed-ish for our logic)
      const day = Math.floor(Math.random() * 28) + 1;
      const dateStr = `2026-0${month + 1}-${String(day).padStart(2, '0')}`;
      
      const apptId = `APT-${String(1000 + i).padStart(4, '0')}`;
      const status = statuses[Math.floor(Math.random() * statuses.length)];

      appointments.push({
        id: uuidv4(),
        appointment_id: apptId,
        patient_id: patient.id,
        patient_name: `${patient.first_name} ${patient.last_name}`,
        doctor_id: doctor.id,
        doctor_name: doctor.name,
        department: doctor.department,
        date: dateStr,
        time: times[Math.floor(Math.random() * times.length)],
        type: types[Math.floor(Math.random() * types.length)],
        status: status,
        notes: status === 'completed' ? 'Patient consult completed successfully.' : null,
        created_at: new Date(dateStr).toISOString()
      });
    }

    console.log(`📦 Prepared ${appointments.length} appointments for insertion.`);

    // 3. Insert into database
    for (const appt of appointments) {
      await pool.query(
        `INSERT INTO appointments (id, appointment_id, patient_id, patient_name, doctor_id, doctor_name, department, date, time, type, status, notes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [appt.id, appt.appointment_id, appt.patient_id, appt.patient_name, appt.doctor_id, appt.doctor_name, appt.department, appt.date, appt.time, appt.type, appt.status, appt.notes, appt.created_at]
      );
    }

    console.log('✅ Restoration complete! All appointments inserted.');
  } catch (err) {
    console.error('❌ Restoration failed:', err.message);
  } finally {
    await pool.end();
  }
}

restoreAppointments();
