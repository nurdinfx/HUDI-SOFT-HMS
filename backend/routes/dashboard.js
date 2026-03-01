const express = require('express');
const db = require('../database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const thisMonthPattern = today.slice(0, 7) + '%';

  try {
    const totalPatients = (await db.prepare('SELECT COUNT(*) as c FROM patients').get()).c;
    const activePatients = (await db.prepare("SELECT COUNT(*) as c FROM patients WHERE status = 'active'").get()).c;
    const todayAppointments = (await db.prepare('SELECT COUNT(*) as c FROM appointments WHERE date = ?').get(today)).c;
    const admittedPatients = (await db.prepare("SELECT COUNT(*) as c FROM ipd_admissions WHERE status = 'admitted'").get()).c;
    const availableDoctors = (await db.prepare("SELECT COUNT(*) as c FROM doctors WHERE status = 'available'").get()).c;
    const totalDoctors = (await db.prepare('SELECT COUNT(*) as c FROM doctors').get()).c;
    const pendingLabTests = (await db.prepare("SELECT COUNT(*) as c FROM lab_tests WHERE status NOT IN ('completed','cancelled')").get()).c;
    const lowStockMedicines = (await db.prepare("SELECT COUNT(*) as c FROM medicines WHERE status IN ('low-stock','out-of-stock')").get()).c;
    const pendingBills = (await db.prepare("SELECT COUNT(*) as c FROM invoices WHERE status IN ('unpaid','partial')").get()).c;
    const totalRevenueRow = await db.prepare('SELECT SUM(paid_amount) as total FROM invoices').get();
    const totalRevenue = totalRevenueRow.total || 0;
    const monthRevenueRow = await db.prepare('SELECT SUM(paid_amount) as total FROM invoices WHERE date LIKE ?').get(thisMonthPattern);
    const monthRevenue = monthRevenueRow.total || 0;
    const availableBeds = (await db.prepare("SELECT COUNT(*) as c FROM beds WHERE status = 'available'").get()).c;
    const totalBeds = (await db.prepare('SELECT COUNT(*) as c FROM beds').get()).c;

    // Recent appointments
    const recentAppointmentsRows = await db.prepare(`
            SELECT * FROM appointments ORDER BY created_at DESC LIMIT 5
        `).all();
    const recentAppointments = recentAppointmentsRows.map(a => ({
      id: a.id, appointmentId: a.appointment_id, patientName: a.patient_name,
      doctorName: a.doctor_name, date: a.date, time: a.time, status: a.status, type: a.type
    }));

    // Revenue by month (last 6 months) - PostgreSQL version
    const revenueByMonth = await db.prepare(`
            SELECT TO_CHAR(date::date, 'YYYY-MM') as month, SUM(paid_amount) as revenue, COUNT(*) as count
            FROM invoices 
            WHERE date::date >= CURRENT_DATE - INTERVAL '6 months'
            GROUP BY month ORDER BY month
        `).all();

    // Appointment stats by status
    const apptByStatus = await db.prepare(`
            SELECT status, COUNT(*) as count FROM appointments GROUP BY status
        `).all();

    // Top departments by appointments
    const topDepartments = await db.prepare(`
            SELECT department, COUNT(*) as count FROM appointments GROUP BY department ORDER BY count DESC LIMIT 5
        `).all();

    res.json({
      stats: {
        totalPatients: parseInt(totalPatients),
        activePatients: parseInt(activePatients),
        todayAppointments: parseInt(todayAppointments),
        admittedPatients: parseInt(admittedPatients),
        availableDoctors: parseInt(availableDoctors),
        totalDoctors: parseInt(totalDoctors),
        pendingLabTests: parseInt(pendingLabTests),
        lowStockMedicines: parseInt(lowStockMedicines),
        pendingBills: parseInt(pendingBills),
        totalRevenue: parseFloat(totalRevenue),
        monthRevenue: parseFloat(monthRevenue),
        availableBeds: parseInt(availableBeds),
        totalBeds: parseInt(totalBeds)
      },
      recentAppointments,
      revenueByMonth,
      apptByStatus,
      topDepartments
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
