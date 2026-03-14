const express = require('express');
const db = require('../database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const thisMonthPattern = today.slice(0, 7) + '%';

    try {
        const [
            totalPatients,
            activePatients,
            todayAppointments,
            admittedPatients,
            availableDoctors,
            totalDoctors,
            pendingLabTests,
            lowStockMedicines,
            pendingBills,
            totalRevenueRow,
            monthRevenueRow,
            availableBeds,
            totalBeds,
            recentAppointmentsRows,
            revenueByMonth,
            apptByStatus,
            topDepartments
        ] = await Promise.all([
            db.prepare('SELECT COUNT(*) as c FROM patients').get().then(r => r.c),
            db.prepare("SELECT COUNT(*) as c FROM patients WHERE status = 'active'").get().then(r => r.c),
            db.prepare('SELECT COUNT(*) as c FROM appointments WHERE date = ?').get(today).then(r => r.c),
            db.prepare("SELECT COUNT(*) as c FROM ipd_admissions WHERE status = 'admitted'").get().then(r => r.c),
            db.prepare("SELECT COUNT(*) as c FROM doctors WHERE status = 'available'").get().then(r => r.c),
            db.prepare('SELECT COUNT(*) as c FROM doctors').get().then(r => r.c),
            db.prepare("SELECT COUNT(*) as c FROM lab_tests WHERE status NOT IN ('completed','cancelled')").get().then(r => r.c),
            db.prepare("SELECT COUNT(*) as c FROM medicines WHERE status IN ('low-stock','out-of-stock')").get().then(r => r.c),
            db.prepare("SELECT COUNT(*) as c FROM invoices WHERE status IN ('unpaid','partial')").get().then(r => r.c),
            db.prepare('SELECT SUM(paid_amount) as total FROM invoices').get(),
            db.prepare("SELECT SUM(paid_amount) as total FROM invoices WHERE TO_CHAR(date, 'YYYY-MM') LIKE ?").get(thisMonthPattern),
            db.prepare("SELECT COUNT(*) as c FROM beds WHERE status = 'available'").get().then(r => r.c),
            db.prepare('SELECT COUNT(*) as c FROM beds').get().then(r => r.c),
            db.prepare('SELECT * FROM appointments ORDER BY created_at DESC LIMIT 5').all(),
            db.prepare(`
                SELECT TO_CHAR(date::date, 'YYYY-MM') as month, SUM(paid_amount) as revenue, COUNT(*) as count
                FROM invoices 
                WHERE date::date >= CURRENT_DATE - INTERVAL '6 months'
                GROUP BY month ORDER BY month
            `).all(),
            db.prepare('SELECT status, COUNT(*) as count FROM appointments GROUP BY status').all(),
            db.prepare('SELECT department, COUNT(*) as count FROM appointments GROUP BY department ORDER BY count DESC LIMIT 5').all()
        ]);

        const recentAppointments = recentAppointmentsRows.map(a => ({
            id: a.id, appointmentId: a.appointment_id, patientName: a.patient_name,
            doctorName: a.doctor_name, date: a.date, time: a.time, status: a.status, type: a.type
        }));

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
                totalRevenue: parseFloat(totalRevenueRow?.total || 0),
                monthRevenue: parseFloat(monthRevenueRow?.total || 0),
                availableBeds: parseInt(availableBeds),
                totalBeds: parseInt(totalBeds)
            },
            recentAppointments,
            revenueByMonth,
            apptByStatus,
            topDepartments
        });
    } catch (err) {
        console.error('❌ Dashboard Data Error:', err.message);
        res.status(500).json({ error: `Dashboard Error: ${err.message}` });
    }
});

module.exports = router;
