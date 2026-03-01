-- HMS PostgreSQL Schema for Supabase

-- 1. Users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    phone TEXT,
    department TEXT,
    avatar TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Patients
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    gender TEXT,
    dob DATE,
    address TEXT,
    status TEXT DEFAULT 'active',
    allergies TEXT DEFAULT '[]',
    chronic_conditions TEXT DEFAULT '[]',
    emergency_contact TEXT,
    emergency_phone TEXT,
    insurance_provider TEXT,
    insurance_policy_number TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Doctors
CREATE TABLE IF NOT EXISTS doctors (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    specialization TEXT,
    email TEXT,
    phone TEXT,
    status TEXT DEFAULT 'available',
    department TEXT,
    consultation_fee NUMERIC DEFAULT 50,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Appointments
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY,
    appointment_id TEXT UNIQUE,
    patient_id UUID REFERENCES patients(id),
    patient_name TEXT,
    doctor_id UUID REFERENCES doctors(id),
    doctor_name TEXT,
    department TEXT,
    date DATE,
    time TEXT,
    type TEXT DEFAULT 'consultation',
    status TEXT DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Medicines
CREATE TABLE IF NOT EXISTS medicines (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    generic_name TEXT,
    category TEXT,
    manufacturer TEXT,
    batch_number TEXT,
    expiry_date DATE,
    quantity INTEGER DEFAULT 0,
    reorder_level INTEGER DEFAULT 10,
    unit_price NUMERIC DEFAULT 0,
    selling_price NUMERIC DEFAULT 0,
    unit TEXT DEFAULT 'tablet',
    status TEXT DEFAULT 'in-stock'
);

-- 6. Prescriptions
CREATE TABLE IF NOT EXISTS prescriptions (
    id UUID PRIMARY KEY,
    prescription_id TEXT UNIQUE,
    patient_id UUID REFERENCES patients(id),
    patient_name TEXT,
    doctor_id UUID REFERENCES doctors(id),
    doctor_name TEXT,
    appointment_id UUID,
    date DATE DEFAULT CURRENT_DATE,
    diagnosis TEXT,
    medicines TEXT DEFAULT '[]', -- JSON string
    notes TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Lab Tests
CREATE TABLE IF NOT EXISTS lab_tests (
    id UUID PRIMARY KEY,
    test_id TEXT UNIQUE,
    patient_id UUID REFERENCES patients(id),
    patient_name TEXT,
    doctor_id UUID REFERENCES doctors(id),
    doctor_name TEXT,
    test_name TEXT,
    test_category TEXT,
    sample_type TEXT,
    priority TEXT DEFAULT 'normal',
    status TEXT DEFAULT 'ordered',
    results TEXT,
    normal_range TEXT,
    report_url TEXT,
    cost NUMERIC DEFAULT 0,
    critical_flag INTEGER DEFAULT 0,
    technician_id UUID,
    clinical_notes TEXT,
    is_billed INTEGER DEFAULT 0,
    invoice_id UUID,
    admission_id UUID,
    ordered_by TEXT,
    ordered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    sample_collected_at TIMESTAMP,
    sample_collected_by TEXT,
    sample_barcode TEXT,
    result_entered_by TEXT,
    result_entered_at TIMESTAMP
);

-- 8. Lab Catalog
CREATE TABLE IF NOT EXISTS lab_catalog (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    sample_type TEXT,
    normal_range TEXT,
    cost NUMERIC DEFAULT 0
);

-- 9. Lab Audit Logs
CREATE TABLE IF NOT EXISTS lab_audit_logs (
    id UUID PRIMARY KEY,
    lab_test_id UUID REFERENCES lab_tests(id),
    action TEXT,
    performed_by TEXT,
    details TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Invoices
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY,
    invoice_id TEXT UNIQUE,
    patient_id UUID REFERENCES patients(id),
    patient_name TEXT,
    date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    items TEXT DEFAULT '[]', -- JSON string
    subtotal NUMERIC DEFAULT 0,
    tax NUMERIC DEFAULT 0,
    discount NUMERIC DEFAULT 0,
    total NUMERIC DEFAULT 0,
    paid_amount NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'unpaid',
    payment_method TEXT,
    notes TEXT,
    insurance_claim TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. OPD Visits
CREATE TABLE IF NOT EXISTS opd_visits (
    id UUID PRIMARY KEY,
    visit_id TEXT UNIQUE,
    patient_id UUID REFERENCES patients(id),
    patient_name TEXT,
    doctor_id UUID REFERENCES doctors(id),
    doctor_name TEXT,
    department TEXT,
    date DATE DEFAULT CURRENT_DATE,
    time TEXT,
    chief_complaint TEXT,
    history_illness TEXT,
    past_history TEXT,
    family_history TEXT,
    physical_examination TEXT,
    clinical_notes TEXT,
    vitals TEXT DEFAULT '{}', -- JSON string
    diagnosis TEXT,
    status TEXT DEFAULT 'waiting',
    token_number INTEGER,
    visit_type TEXT DEFAULT 'New',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. IPD Admissions
CREATE TABLE IF NOT EXISTS ipd_admissions (
    id UUID PRIMARY KEY,
    admission_id TEXT UNIQUE,
    patient_id UUID REFERENCES patients(id),
    patient_name TEXT,
    doctor_id UUID REFERENCES doctors(id),
    doctor_name TEXT,
    department TEXT,
    ward UUID,
    bed_number TEXT,
    admission_date DATE DEFAULT CURRENT_DATE,
    discharge_date DATE,
    diagnosis TEXT,
    status TEXT DEFAULT 'admitted',
    nursing_notes TEXT DEFAULT '[]', -- JSON string
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13. Wards
CREATE TABLE IF NOT EXISTS wards (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT,
    department TEXT,
    total_beds INTEGER DEFAULT 0,
    daily_rate NUMERIC DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 14. Beds
CREATE TABLE IF NOT EXISTS beds (
    id UUID PRIMARY KEY,
    ward TEXT,
    bed_number TEXT UNIQUE,
    type TEXT,
    status TEXT DEFAULT 'available',
    patient_id UUID,
    daily_rate NUMERIC DEFAULT 0,
    ward_id UUID REFERENCES wards(id)
);

-- 15. Nurse Notes
CREATE TABLE IF NOT EXISTS nurse_notes (
    id UUID PRIMARY KEY,
    admission_id UUID REFERENCES ipd_admissions(id),
    patient_id UUID,
    patient_name TEXT,
    nurse_id UUID,
    nurse_name TEXT,
    vitals TEXT DEFAULT '{}',
    observations TEXT,
    medications TEXT DEFAULT '[]',
    shift TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 16. Doctor Rounds
CREATE TABLE IF NOT EXISTS doctor_rounds (
    id UUID PRIMARY KEY,
    admission_id UUID REFERENCES ipd_admissions(id),
    patient_id UUID,
    patient_name TEXT,
    doctor_id UUID,
    doctor_name TEXT,
    observations TEXT,
    treatment_updates TEXT,
    procedure_orders TEXT DEFAULT '[]',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 17. Account Entries
CREATE TABLE IF NOT EXISTS account_entries (
    id UUID PRIMARY KEY,
    date DATE DEFAULT CURRENT_DATE,
    type TEXT NOT NULL, -- 'income' or 'expense'
    category TEXT,
    description TEXT,
    amount NUMERIC DEFAULT 0,
    payment_method TEXT DEFAULT 'cash',
    reference_id TEXT,
    department TEXT,
    status TEXT DEFAULT 'completed',
    user_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 18. Department Budgets
CREATE TABLE IF NOT EXISTS department_budgets (
    id UUID PRIMARY KEY,
    department TEXT UNIQUE,
    budget_amount NUMERIC DEFAULT 0,
    period TEXT DEFAULT 'Monthly'
);

-- 19. Hospital Settings
CREATE TABLE IF NOT EXISTS hospital_settings (
    id INTEGER PRIMARY KEY,
    name TEXT DEFAULT 'Hospital',
    tagline TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    currency TEXT DEFAULT 'USD',
    tax_rate NUMERIC DEFAULT 10,
    logo TEXT
);

-- 20. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID,
    user_name TEXT,
    user_role TEXT,
    action TEXT,
    module TEXT,
    details TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT
);

-- 21. Insurance Companies
CREATE TABLE IF NOT EXISTS insurance_companies (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    status TEXT DEFAULT 'active'
);

-- 22. Patient Insurance Policies
CREATE TABLE IF NOT EXISTS patient_insurance_policies (
    id UUID PRIMARY KEY,
    patient_id UUID REFERENCES patients(id),
    company_id UUID REFERENCES insurance_companies(id),
    company_name TEXT,
    policy_number TEXT,
    coverage_type TEXT,
    coverage_limit NUMERIC DEFAULT 0,
    balance_remaining NUMERIC DEFAULT 0,
    co_pay_percent NUMERIC DEFAULT 0,
    expiry_date DATE,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 23. Insurance Claims
CREATE TABLE IF NOT EXISTS insurance_claims (
    id UUID PRIMARY KEY,
    claim_id TEXT UNIQUE,
    patient_id UUID REFERENCES patients(id),
    patient_name TEXT,
    insurance_company TEXT,
    policy_number TEXT,
    invoice_id UUID,
    claim_amount NUMERIC DEFAULT 0,
    approved_amount NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'submitted',
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    settled_at TIMESTAMP,
    policy_id UUID
);

-- Initial Admin Seed
-- Password: admin123
INSERT INTO users (id, name, email, password_hash, role, is_active, created_at)
VALUES ('00000000-0000-0000-0000-000000000000', 'Admin', 'admin@hospital.com', '$2y$10$R8.Xo1J.yX1YyX1YyX1YyOxeYdXyeXeYdXyeXeYdXyeXeYdXyeXeY', 'admin', 1, CURRENT_TIMESTAMP)
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;

INSERT INTO hospital_settings (id, name, tagline, currency, tax_rate)
VALUES (1, 'Hudi Hospital', 'Care with Excellence', 'USD', 10)
ON CONFLICT (id) DO NOTHING;
