-- Migration script for Employee Management & Payroll Module

-- 1. Employees Table
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    position VARCHAR(100),
    department VARCHAR(100),
    date_joined DATE DEFAULT CURRENT_DATE,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'resigned')),
    base_salary DECIMAL(12, 2) DEFAULT 0.00,
    payment_method VARCHAR(50) DEFAULT 'cash',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Employee Expenses / Advances Table
CREATE TABLE IF NOT EXISTS employee_expenses (
    id UUID PRIMARY KEY,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    type VARCHAR(50) CHECK (type IN ('advance', 'expense', 'loan')),
    amount DECIMAL(12, 2) NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'deducted', 'cancelled')),
    recorded_by UUID, -- Link to users table if needed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Employee Payroll Table
CREATE TABLE IF NOT EXISTS employee_payroll (
    id UUID PRIMARY KEY,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    month_year VARCHAR(10) NOT NULL, -- Format: YYYY-MM
    base_salary DECIMAL(12, 2) NOT NULL,
    total_advances DECIMAL(12, 2) DEFAULT 0.00,
    total_deductions DECIMAL(12, 2) DEFAULT 0.00,
    final_salary DECIMAL(12, 2) NOT NULL,
    payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid')),
    payment_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Employee Ledger Table
CREATE TABLE IF NOT EXISTS employee_ledger (
    id UUID PRIMARY KEY,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    date DATE DEFAULT CURRENT_DATE,
    description TEXT,
    type VARCHAR(50) CHECK (type IN ('debit', 'credit')), -- debit = subtraction (advance), credit = addition (salary/bonus)
    amount DECIMAL(12, 2) NOT NULL,
    running_balance DECIMAL(12, 2),
    reference_id UUID, -- Link to expense or payroll
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_employee_expenses_emp_id ON employee_expenses(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_payroll_emp_id ON employee_payroll(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_ledger_emp_id ON employee_ledger(employee_id);
