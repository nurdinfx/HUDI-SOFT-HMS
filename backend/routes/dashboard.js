const express = require('express');
const db = require('../database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = today.slice(0, 7);

    const totalPatients = db.prepare('SELECT COUNT(*) as c FROM patients').get().c;
    const activePatients = db.prepare("SELECT COUNT(*) as c FROM patients WHERE status = 'active'").get().c;
    const todayAppointments = db.prepare('SELECT COUNT(*) as c FROM appointments WHERE date = ?').get(today).c;
    const admittedPatients = db.prepare("SELECT COUNT(*) as c FROM ipd_admissions WHERE status = 'admitted'").get().c;
    const availableDoctors = db.prepare("SELECT COUNT(*) as c FROM doctors WHERE status = 'available'").get().c;
    const totalDoctors = db.prepare('SELECT COUNT(*) as c FROM doctors').get().c;
    const pendingLabTests = db.prepare("SELECT COUNT(*) as c FROM lab_tests WHERE status NOT IN ('completed','cancelled')").get().c;
    const lowStockMedicines = db.prepare("SELECT COUNT(*) as c FROM medicines WHERE status IN ('low-stock','out-of-stock')").get().c;
    const pendingBills = db.prepare("SELECT COUNT(*) as c FROM invoices WHERE status IN ('unpaid','partial')").get().c;
    const totalRevenueRow = db.prepare('SELECT SUM(paid_amount) as total FROM invoices').get();
    const totalRevenue = totalRevenueRow.total || 0;
    const monthRevenueRow = db.prepare('SELECT SUM(paid_amount) as total FROM invoices WHERE date LIKE ?').get(thisMonth + '%');
    const monthRevenue = monthRevenueRow.total || 0;
    const availableBeds = db.prepare("SELECT COUNT(*) as c FROM beds WHERE status = 'available'").get().c;
    const totalBeds = db.prepare('SELECT COUNT(*) as c FROM beds').get().c;

    // Recent appointments
    const recentAppointments = db.prepare(`
    SELECT * FROM appointments ORDER BY created_at DESC LIMIT 5
  `).all().map(a => ({ id: a.id, appointmentId: a.appointment_id, patientName: a.patient_name, doctorName: a.doctor_name, date: a.date, time: a.time, status: a.status, type: a.type }));

    // Revenue by month (last 6 months)
    const revenueByMonth = db.prepare(`
    SELECT strftime('%Y-%m', date) as month, SUM(paid_amount) as revenue, COUNT(*) as count
    FROM invoices WHERE date >= date('now', '-6 months')
    GROUP BY month ORDER BY month
  `).all();

    // Appointment stats by status
    const apptByStatus = db.prepare(`
    SELECT status, COUNT(*) as count FROM appointments GROUP BY status
  `).all();

    // Top departments by appointments
    const topDepartments = db.prepare(`
    SELECT department, COUNT(*) as count FROM appointments GROUP BY department ORDER BY count DESC LIMIT 5
  `).all();

    res.json({
        stats: { totalPatients, activePatients, todayAppointments, admittedPatients, availableDoctors, totalDoctors, pendingLabTests, lowStockMedicines, pendingBills, totalRevenue, monthRevenue, availableBeds, totalBeds },
        recentAppointments,
        revenueByMonth,
        apptByStatus,
        topDepartments
    });
});

module.exports = router;
