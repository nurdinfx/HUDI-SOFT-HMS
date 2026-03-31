const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { authenticate, authorize, logAction } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// ─── EMPLOYEES ───────────────────────────────────────────────────

// GET /api/hr/employees - List all employees
router.get('/employees', async (req, res) => {
    try {
        const employees = await db.prepare('SELECT * FROM employees ORDER BY full_name ASC').all();
        res.json(employees);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/hr/employees - Register new employee
router.post('/employees', async (req, res) => {
    const { fullName, phone, email, address, position, department, base_salary, payment_method } = req.body;
    
    if (!fullName) return res.status(400).json({ error: 'Full Name is required' });

    try {
        const id = uuidv4();
        const employeeUID = `EMP-${Math.floor(1000 + Math.random() * 9000)}`;
        
        await db.prepare(`
            INSERT INTO employees (id, employee_id, full_name, phone, email, address, position, department, base_salary, payment_method)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, employeeUID, fullName, phone, email, address, position, department, base_salary || 0, payment_method || 'cash');

        logAction(req.user.id, req.user.name, req.user.role, 'CREATE', 'HR', `Registered employee: ${fullName}`, req.ip);
        
        const newEmployee = await db.prepare('SELECT * FROM employees WHERE id = ?').get(id);
        res.status(201).json(newEmployee);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/hr/employees/:id - Get profile, ledger, and history
router.get('/employees/:id', async (req, res) => {
    try {
        const employee = await db.prepare('SELECT * FROM employees WHERE id = ?').get(req.params.id);
        if (!employee) return res.status(404).json({ error: 'Employee not found' });

        const ledger = await db.prepare('SELECT * FROM employee_ledger WHERE employee_id = ? ORDER BY date DESC, created_at DESC').all(req.params.id);
        const expenses = await db.prepare('SELECT * FROM employee_expenses WHERE employee_id = ? ORDER BY date DESC').all(req.params.id);
        const payroll = await db.prepare('SELECT * FROM employee_payroll WHERE employee_id = ? ORDER BY month_year DESC').all(req.params.id);

        res.json({ employee, ledger, expenses, payroll });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── EXPENSES / ADVANCES ────────────────────────────────────────

// POST /api/hr/expenses - Record an advance or expense
router.post('/expenses', async (req, res) => {
    const { employeeId, type, amount, date, notes } = req.body;
    
    if (!employeeId || !amount || !type) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        await db.exec('BEGIN');

        const employee = await db.prepare('SELECT * FROM employees WHERE id = ?').get(employeeId);
        if (!employee) throw new Error('Employee not found');

        const expenseId = uuidv4();
        const amt = parseFloat(amount);
        const expDate = date || new Date().toISOString().split('T')[0];

        // 1. Record expense
        await db.prepare(`
            INSERT INTO employee_expenses (id, employee_id, type, amount, date, notes, status, recorded_by)
            VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
        `).run(expenseId, employeeId, type, amt, expDate, notes, req.user.id);

        // 2. Add to ledger (as a debit - deduction)
        // Note: Running balance calculation is simplified here, in a real system we'd calculate properly
        await db.prepare(`
            INSERT INTO employee_ledger (id, employee_id, date, description, type, amount, reference_id)
            VALUES (?, ?, ?, ?, 'debit', ?, ?)
        `).run(uuidv4(), employeeId, expDate, `${type.charAt(0).toUpperCase() + type.slice(1)}: ${notes || ''}`, amt, expenseId);

        // Update employee's outstanding balance
        await db.prepare(`
            UPDATE employees
            SET outstanding_balance = COALESCE(outstanding_balance, 0) + ?
            WHERE id = ?
        `).run(amt, employeeId);

        await db.exec('COMMIT');
        
        logAction(req.user.id, req.user.name, req.user.role, 'CREATE', 'HR', `Recorded ${type}: ${amt} for ${employee.full_name}`, req.ip);
        
        res.status(201).json({ message: 'Expense recorded successfully' });
    } catch (err) {
        await db.exec('ROLLBACK');
        res.status(500).json({ error: err.message });
    }
});

// Update employee
router.put('/employees/:id', async (req, res) => {
    try {
        const { fullName, phone, email, position, department, base_salary, payment_method, address, status } = req.body;
        const { id } = req.params;
        
        await db.prepare(`
            UPDATE employees 
            SET full_name = ?, phone = ?, email = ?, position = ?, department = ?, 
                base_salary = ?, payment_method = ?, address = ?, status = ?
            WHERE id = ?
        `).run(fullName, phone, email, position, department, base_salary, payment_method, address, status || 'active', id);
        
        res.json({ message: "Employee updated successfully" });
    } catch (err) {
        console.error('❌ Update Employee Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Delete employee
router.delete('/employees/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // Also delete related records
        await db.prepare("DELETE FROM employee_ledger WHERE employee_id = ?").run(id);
        await db.prepare("DELETE FROM employee_expenses WHERE employee_id = ?").run(id);
        await db.prepare("DELETE FROM employees WHERE id = ?").run(id);
        res.json({ message: "Employee deleted successfully" });
    } catch (err) {
        console.error('❌ Delete Employee Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ─── REPAYMENTS ──────────────────────────────────────────────────

// POST /api/hr/employees/:id/repay - Record a direct repayment
router.post('/employees/:id/repay', async (req, res) => {
    const { id } = req.params;
    const { amount, method, notes, date } = req.body;

    if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Valid repayment amount is required' });
    }

    try {
        await db.exec('BEGIN');

        const employee = await db.prepare('SELECT * FROM employees WHERE id = ?').get(id);
        if (!employee) throw new Error('Employee not found');

        const repayAmt = parseFloat(amount);
        const repayDate = date || new Date().toISOString().split('T')[0];

        // Ensure we do not overpay
        let newBalance = parseFloat(employee.outstanding_balance || 0) - repayAmt;
        if (newBalance < 0) newBalance = 0;

        await db.prepare(`
            UPDATE employees 
            SET outstanding_balance = ?
            WHERE id = ?
        `).run(newBalance, id);

        const repaymentId = uuidv4();
        await db.prepare(`
            INSERT INTO employee_ledger (id, employee_id, date, description, type, amount, reference_id)
            VALUES (?, ?, ?, ?, 'credit', ?, ?)
        `).run(repaymentId, id, repayDate, `Advance Repayment: ${notes || 'Manual partial payment'}`, repayAmt, repaymentId);

        // Mark incoming cash as income
        await db.prepare(`
            INSERT INTO account_entries (id, date, type, category, description, amount, payment_method, department, status, user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?)
        `).run(
            uuidv4(), repayDate, 'income', 'Staff Repayment',
            `Advance Repayment - ${employee.full_name}`,
            repayAmt, method || 'cash', employee.department || 'HR', req.user.id
        );

        // Since they repaid directly, we can optionally credit an equal amount against their pending expenses
        // so that the next payroll doesn't over-deduct. We will achieve this safely by letting outstanding_balance
        // be the source of truth for payroll deductions.

        await db.exec('COMMIT');
        
        logAction(req.user.id, req.user.name, req.user.role, 'CREATE', 'HR', `Recorded repayment of ${repayAmt} for ${employee.full_name}`, req.ip);
        res.json({ message: 'Repayment recorded successfully' });
    } catch (err) {
        await db.exec('ROLLBACK');
        console.error('❌ Repayment Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ─── PAYROLL ───────────────────────────────────────────────────

// GET /api/hr/payroll/summary/:monthYear - Get payroll summary for a month
router.get('/payroll/summary/:monthYear', async (req, res) => {
    try {
        const monthYear = req.params.monthYear; // YYYY-MM
        
        const employees = await db.prepare("SELECT * FROM employees WHERE status = 'active'").all();
        const summary = await Promise.all(employees.map(async (emp) => {
            // Deductions are now solely based on their explicit outstanding_balance
            const totalDeductions = parseFloat(emp.outstanding_balance || 0);
            const finalSalary = parseFloat(emp.base_salary) - totalDeductions;

            return {
                id: emp.id,
                employee_id: emp.employee_id,
                full_name: emp.full_name,
                base_salary: emp.base_salary,
                total_deductions: totalDeductions,
                final_salary: finalSalary,
                status: emp.status
            };
        }));

        res.json(summary);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/hr/payroll/process - Mark payroll as paid
router.post('/payroll/process', async (req, res) => {
    const { employeeId, monthYear, paymentDate } = req.body;

    if (!employeeId || !monthYear) return res.status(400).json({ error: 'Missing required fields' });

    try {
        await db.exec('BEGIN');

        const employee = await db.prepare('SELECT * FROM employees WHERE id = ?').get(employeeId);
        if (!employee) throw new Error('Employee not found');

        // Check if already paid
        const existing = await db.prepare('SELECT * FROM employee_payroll WHERE employee_id = ? AND month_year = ?').get(employeeId, monthYear);
        if (existing) throw new Error('Salary already processed for this month');

        // Calculate deductions
        const totalDeductions = parseFloat(employee.outstanding_balance || 0);
        const finalSalary = parseFloat(employee.base_salary) - totalDeductions;
        const payDate = paymentDate || new Date().toISOString().split('T')[0];
        const payrollId = uuidv4();

        // 1. Create payroll record
        await db.prepare(`
            INSERT INTO employee_payroll (id, employee_id, month_year, base_salary, total_deductions, final_salary, payment_status, payment_date)
            VALUES (?, ?, ?, ?, ?, ?, 'paid', ?)
        `).run(payrollId, employeeId, monthYear, employee.base_salary, totalDeductions, finalSalary, payDate);

        // 2. Mark pending expenses as deducted and reset outstanding_balance
        await db.prepare(`
            UPDATE employee_expenses 
            SET status = 'deducted' 
            WHERE employee_id = ? AND status = 'pending'
        `).run(employeeId);

        await db.prepare(`
            UPDATE employees
            SET outstanding_balance = 0
            WHERE id = ?
        `).run(employeeId);

        // 3. Add to ledger (as a credit - salary payout)
        await db.prepare(`
            INSERT INTO employee_ledger (id, employee_id, date, description, type, amount, reference_id)
            VALUES (?, ?, ?, ?, 'credit', ?, ?)
        `).run(uuidv4(), employeeId, payDate, `Salary Payment: ${monthYear}`, 'credit', finalSalary, payrollId);

        // 4. Record as expense in main accounts
        await db.prepare(`
            INSERT INTO account_entries (id, date, type, category, description, amount, payment_method, department, status, user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?)
        `).run(
            uuidv4(), payDate, 'expense', 'Salary',
            `Salary Payment - ${employee.full_name} (${monthYear})`,
            finalSalary, employee.payment_method, employee.department, req.user.id
        );

        await db.exec('COMMIT');
        
        logAction(req.user.id, req.user.name, req.user.role, 'CREATE', 'HR', `Processed payroll for ${employee.full_name} (${monthYear})`, req.ip);
        
        res.status(201).json({ message: 'Payroll processed successfully' });
    } catch (err) {
        await db.exec('ROLLBACK');
        res.status(500).json({ error: err.message });
    }
});

// GET /api/hr/stats - HR Dashboard stats
router.get('/stats', async (req, res) => {
    try {
        const totalEmployees = await db.prepare("SELECT COUNT(*) as count FROM employees WHERE status = 'active'").get();
        const totalPayroll = await db.prepare("SELECT SUM(base_salary) as total FROM employees WHERE status = 'active'").get();
        const totalAdvances = await db.prepare("SELECT SUM(amount) as total FROM employee_expenses WHERE status = 'pending'").get();
        
        const recentExpenses = await db.prepare(`
            SELECT e.*, emp.full_name 
            FROM employee_expenses e
            JOIN employees emp ON e.employee_id = emp.id
            ORDER BY e.created_at DESC LIMIT 5
        `).all();

        res.json({
            stats: {
                activeEmployees: totalEmployees.count,
                monthlyPayrollBase: totalPayroll.total || 0,
                pendingAdvances: totalAdvances.total || 0
            },
            recentExpenses
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── REPORTS ─────────────────────────────────────────────────────

// GET /api/hr/reports/payroll/:monthYear - Detailed payroll report
router.get('/reports/payroll/:monthYear', async (req, res) => {
    try {
        const data = await db.prepare(`
            SELECT p.*, e.full_name, e.employee_id, e.position, e.department
            FROM employee_payroll p
            JOIN employees e ON p.employee_id = e.id
            WHERE p.month_year = ?
            ORDER BY e.full_name ASC
        `).all(req.params.monthYear);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/hr/reports/expenses - Detailed expense report
router.get('/reports/expenses', async (req, res) => {
    const { start, end, type } = req.query;
    let query = `
        SELECT ex.*, e.full_name, e.employee_id, e.position
        FROM employee_expenses ex
        JOIN employees e ON ex.employee_id = e.id
        WHERE 1=1
    `;
    const params = [];

    if (start) { query += ` AND ex.date >= ?`; params.push(start); }
    if (end) { query += ` AND ex.date <= ?`; params.push(end); }
    if (type) { query += ` AND ex.type = ?`; params.push(type); }

    query += ` ORDER BY ex.date DESC`;

    try {
        const data = await db.prepare(query).all(...params);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
