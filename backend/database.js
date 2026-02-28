/**
 * database.js – pure-JS SQLite via sql.js (no Python/node-gyp required)
 * Persists to disk as a binary .db file on every write.
 */
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const DB_PATH = path.resolve(process.env.DB_PATH || './hospital.db');

let SQL, db;
let rawSqlDb; // raw sql.js Database instance for export()

function saveDb() {
  const data = rawSqlDb.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// ------------------------------------------------------------------
// Synchronous-like wrapper over sql.js (mimics better-sqlite3 API)
// ------------------------------------------------------------------
function wrapDb(sqlDb) {
  rawSqlDb = sqlDb; // keep raw reference
  return {
    prepare(sql) {
      return {
        run(...params) {
          sqlDb.run(sql, params);
          saveDb();
          return { changes: sqlDb.getRowsModified() };
        },
        get(...params) {
          const stmt = sqlDb.prepare(sql);
          stmt.bind(params);
          if (stmt.step()) {
            const row = stmt.getAsObject();
            stmt.free();
            return row;
          }
          stmt.free();
          return undefined;
        },
        all(...params) {
          const stmt = sqlDb.prepare(sql);
          stmt.bind(params);
          const rows = [];
          while (stmt.step()) rows.push(stmt.getAsObject());
          stmt.free();
          return rows;
        }
      };
    },
    exec(sql) {
      sqlDb.run(sql);
      saveDb();
    },
    pragma() { } // no-op for sql.js
  };
}

// ------------------------------------------------------------------
// SCHEMA
// ------------------------------------------------------------------
const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'receptionist',
  phone TEXT, department TEXT, avatar TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY, patient_id TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL, last_name TEXT NOT NULL,
  date_of_birth TEXT NOT NULL, gender TEXT NOT NULL,
  blood_group TEXT, phone TEXT NOT NULL, email TEXT,
  address TEXT, city TEXT, emergency_contact TEXT, emergency_phone TEXT,
  insurance_provider TEXT, insurance_policy_number TEXT,
  allergies TEXT DEFAULT '[]', chronic_conditions TEXT DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active',
  registered_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_visit TEXT, notes TEXT
);
CREATE TABLE IF NOT EXISTS doctors (
  id TEXT PRIMARY KEY, doctor_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, phone TEXT,
  specialization TEXT NOT NULL, department TEXT NOT NULL,
  qualification TEXT, experience INTEGER DEFAULT 0,
  consultation_fee REAL DEFAULT 0,
  available_days TEXT DEFAULT '[]',
  available_time_start TEXT DEFAULT '09:00',
  available_time_end TEXT DEFAULT '17:00',
  status TEXT NOT NULL DEFAULT 'available',
  avatar TEXT, joined_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY, appointment_id TEXT UNIQUE NOT NULL,
  patient_id TEXT NOT NULL, patient_name TEXT NOT NULL,
  doctor_id TEXT NOT NULL, doctor_name TEXT NOT NULL,
  department TEXT NOT NULL, date TEXT NOT NULL, time TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'consultation',
  status TEXT NOT NULL DEFAULT 'scheduled',
  notes TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS prescriptions (
  id TEXT PRIMARY KEY, prescription_id TEXT UNIQUE NOT NULL,
  patient_id TEXT NOT NULL, patient_name TEXT NOT NULL,
  doctor_id TEXT NOT NULL, doctor_name TEXT NOT NULL,
  appointment_id TEXT,
  date TEXT NOT NULL DEFAULT (date('now')),
  diagnosis TEXT NOT NULL, medicines TEXT NOT NULL DEFAULT '[]',
  notes TEXT, status TEXT NOT NULL DEFAULT 'pending'
);
CREATE TABLE IF NOT EXISTS lab_tests (
  id TEXT PRIMARY KEY, test_id TEXT UNIQUE NOT NULL,
  patient_id TEXT NOT NULL, patient_name TEXT NOT NULL,
  doctor_id TEXT NOT NULL, doctor_name TEXT NOT NULL,
  test_name TEXT NOT NULL, test_category TEXT NOT NULL,
  sample_type TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'ordered',
  ordered_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT, results TEXT, normal_range TEXT,
  sample_collected_at TEXT, sample_collected_by TEXT, sample_barcode TEXT,
  critical_flag INTEGER DEFAULT 0, technician_id TEXT, clinical_notes TEXT,
  is_billed INTEGER DEFAULT 0, invoice_id TEXT,
  report_url TEXT, cost REAL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS lab_audit_logs (
  id TEXT PRIMARY KEY,
  lab_test_id TEXT NOT NULL,
  action TEXT NOT NULL,
  performed_by TEXT NOT NULL,
  details TEXT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS lab_catalog (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  sample_type TEXT NOT NULL,
  normal_range TEXT,
  cost REAL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY, invoice_id TEXT UNIQUE NOT NULL,
  patient_id TEXT NOT NULL, patient_name TEXT NOT NULL,
  date TEXT NOT NULL DEFAULT (date('now')), due_date TEXT NOT NULL,
  items TEXT NOT NULL DEFAULT '[]',
  subtotal REAL DEFAULT 0, tax REAL DEFAULT 0,
  discount REAL DEFAULT 0, total REAL DEFAULT 0,
  paid_amount REAL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'unpaid',
  payment_method TEXT, insurance_claim TEXT, notes TEXT
);
CREATE TABLE IF NOT EXISTS medicines (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, generic_name TEXT,
  category TEXT NOT NULL, manufacturer TEXT, batch_number TEXT,
  expiry_date TEXT, quantity INTEGER DEFAULT 0,
  reorder_level INTEGER DEFAULT 10,
  unit_price REAL DEFAULT 0, selling_price REAL DEFAULT 0,
  unit TEXT DEFAULT 'tablet', status TEXT NOT NULL DEFAULT 'in-stock'
);
CREATE TABLE IF NOT EXISTS insurance_companies (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, contact_person TEXT,
  phone TEXT, email TEXT, address TEXT,
  status TEXT NOT NULL DEFAULT 'active'
);
CREATE TABLE IF NOT EXISTS insurance_claims (
  id TEXT PRIMARY KEY, claim_id TEXT UNIQUE NOT NULL,
  patient_id TEXT NOT NULL, patient_name TEXT NOT NULL,
  insurance_company TEXT NOT NULL, policy_number TEXT NOT NULL,
  invoice_id TEXT NOT NULL, claim_amount REAL DEFAULT 0,
  approved_amount REAL,
  status TEXT NOT NULL DEFAULT 'submitted',
  submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
  settled_at TEXT,
  policy_id TEXT -- Link to policy
);
CREATE TABLE IF NOT EXISTS patient_insurance_policies (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  company_name TEXT NOT NULL,
  policy_number TEXT NOT NULL,
  coverage_type TEXT NOT NULL DEFAULT 'partial', -- full, partial, co-pay
  coverage_limit REAL DEFAULT 0,
  balance_remaining REAL DEFAULT 0,
  co_pay_percent REAL DEFAULT 0,
  expiry_date TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- active, expired, inactive
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS opd_visits (
  id TEXT PRIMARY KEY, visit_id TEXT UNIQUE NOT NULL,
  patient_id TEXT NOT NULL, patient_name TEXT NOT NULL,
  doctor_id TEXT NOT NULL, doctor_name TEXT NOT NULL,
  department TEXT NOT NULL,
  date TEXT NOT NULL DEFAULT (date('now')),
  time TEXT NOT NULL, chief_complaint TEXT NOT NULL,
  history_illness TEXT, past_history TEXT, family_history TEXT,
  physical_examination TEXT, clinical_notes TEXT,
  vitals TEXT NOT NULL DEFAULT '{}', diagnosis TEXT,
  status TEXT NOT NULL DEFAULT 'waiting',
  visit_type TEXT NOT NULL DEFAULT 'New', -- New, Follow-Up, Emergency
  token_number INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS ipd_admissions (
  id TEXT PRIMARY KEY, admission_id TEXT UNIQUE NOT NULL,
  patient_id TEXT NOT NULL, patient_name TEXT NOT NULL,
  doctor_id TEXT NOT NULL, doctor_name TEXT NOT NULL,
  department TEXT NOT NULL, ward TEXT NOT NULL,
  bed_number TEXT NOT NULL,
  admission_date TEXT NOT NULL DEFAULT (date('now')),
  discharge_date TEXT, diagnosis TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'admitted',
  nursing_notes TEXT NOT NULL DEFAULT '[]'
);
CREATE TABLE IF NOT EXISTS beds (
  id TEXT PRIMARY KEY, ward TEXT NOT NULL,
  bed_number TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'available', -- available, occupied, cleaning, maintenance
  patient_id TEXT, daily_rate REAL DEFAULT 0,
  ward_id TEXT -- Optional formal link
);
CREATE TABLE IF NOT EXISTS wards (
  id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL, -- General, ICU, Private, etc.
  department TEXT NOT NULL,
  total_beds INTEGER DEFAULT 0,
  daily_rate REAL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS nurse_notes (
  id TEXT PRIMARY KEY, admission_id TEXT NOT NULL,
  patient_id TEXT NOT NULL, patient_name TEXT NOT NULL,
  nurse_id TEXT NOT NULL, nurse_name TEXT NOT NULL,
  vitals TEXT NOT NULL DEFAULT '{}',
  observations TEXT, medications TEXT DEFAULT '[]',
  shift TEXT, -- Day, Night, etc.
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS doctor_rounds (
  id TEXT PRIMARY KEY, admission_id TEXT NOT NULL,
  patient_id TEXT NOT NULL, patient_name TEXT NOT NULL,
  doctor_id TEXT NOT NULL, doctor_name TEXT NOT NULL,
  observations TEXT, treatment_updates TEXT,
  procedure_orders TEXT DEFAULT '[]',
  timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL,
  user_name TEXT NOT NULL, user_role TEXT NOT NULL,
  action TEXT NOT NULL, module TEXT NOT NULL,
  details TEXT NOT NULL,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  ip_address TEXT NOT NULL DEFAULT '127.0.0.1'
);
CREATE TABLE IF NOT EXISTS account_entries (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL DEFAULT (date('now')),
  type TEXT NOT NULL, -- income, expense
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  reference_id TEXT,
  department TEXT NOT NULL DEFAULT 'General',
  status TEXT NOT NULL DEFAULT 'completed', -- completed, pending, cancelled
  user_id TEXT -- The user who recorded this
);
CREATE TABLE IF NOT EXISTS department_budgets (
  id TEXT PRIMARY KEY,
  department TEXT NOT NULL UNIQUE,
  budget_amount REAL NOT NULL,
  period TEXT NOT NULL, -- Monthly, Yearly
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS hospital_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  name TEXT NOT NULL DEFAULT 'City General Hospital',
  tagline TEXT DEFAULT 'Excellence in Healthcare',
  address TEXT DEFAULT '123 Medical Drive, Healthcare City',
  phone TEXT DEFAULT '+1 (555) 000-1234',
  email TEXT DEFAULT 'info@citygeneralhospital.com',
  website TEXT DEFAULT 'www.citygeneralhospital.com',
  currency TEXT DEFAULT 'USD',
  tax_rate REAL DEFAULT 10, logo TEXT
);
CREATE TABLE IF NOT EXISTS inventory_items (
  id TEXT PRIMARY KEY, item_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL, category TEXT NOT NULL,
  description TEXT, quantity INTEGER DEFAULT 0,
  unit TEXT DEFAULT 'pcs', reorder_level INTEGER DEFAULT 5,
  unit_cost REAL DEFAULT 0, supplier TEXT,
  last_restocked TEXT, status TEXT NOT NULL DEFAULT 'in-stock'
);
`;

// ------------------------------------------------------------------
// SEED
// ------------------------------------------------------------------
function seedIfEmpty() {
  const count = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (count && count.count > 0) {
    console.log('✅ Database already seeded.');
    return;
  }
  console.log('🌱 Seeding database with initial production data...');

  // 1. Initial Admin User
  const insertUser = db.prepare('INSERT INTO users (id,name,email,password_hash,role,phone,department,is_active,created_at) VALUES (?,?,?,?,?,?,?,?,?)');
  const adminData = {
    name: 'Admin User',
    email: 'admin@hospital.com',
    pass: 'admin123',
    role: 'admin',
    phone: '+1-555-0001',
    dept: 'Administration'
  };

  insertUser.run(
    uuidv4(),
    adminData.name,
    adminData.email,
    bcrypt.hashSync(adminData.pass, 10),
    adminData.role,
    adminData.phone,
    adminData.dept,
    1,
    new Date().toISOString()
  );
  saveDb();

  // 2. Default Hospital Settings
  db.prepare("INSERT OR IGNORE INTO hospital_settings (id,name,tagline,address,phone,email,website,currency,tax_rate) VALUES (1,'City General Hospital','Excellence in Healthcare','123 Medical Drive, Healthcare City, HC 10001','+1 (555) 000-1234','info@citygeneralhospital.com','www.citygeneralhospital.com','USD',10)").run();
  saveDb();

  // 3. Lab Catalog Seed
  const labTests = [
    { name: 'Complete Blood Count (CBC)', cat: 'Hematology', sample: 'Blood', range: 'WBC: 4-11, RBC: 4.5-5.5, Hb: 13-17', cost: 15 },
    { name: 'Lipid Profile', cat: 'Biochemistry', sample: 'Blood (Fasting)', range: 'Cholesterol: <200, HDL: >40, LDL: <100', cost: 25 },
    { name: 'Liver Function Test (LFT)', cat: 'Biochemistry', sample: 'Blood', range: 'ALT: 7-55, AST: 8-48, ALP: 40-129', cost: 30 },
    { name: 'Kidney Function Test (KFT)', cat: 'Biochemistry', sample: 'Blood', range: 'Creatinine: 0.7-1.3, BUN: 7-20', cost: 28 },
    { name: 'Blood Sugar (Random)', cat: 'Biochemistry', sample: 'Blood', range: '70-140 mg/dL', cost: 10 },
    { name: 'Malaria Parasite (MP)', cat: 'Microbiology', sample: 'Blood', range: 'Negative', cost: 12 },
    { name: 'Urinalysis', cat: 'Clinical Pathology', sample: 'Urine', range: 'Normal', cost: 15 },
    { name: 'Thyroid Profile (T3, T4, TSH)', cat: 'Endocrinology', sample: 'Blood', range: 'TSH: 0.4-4.0', cost: 45 }
  ];
  const insLab = db.prepare('INSERT OR IGNORE INTO lab_catalog (id, name, category, sample_type, normal_range, cost) VALUES (?, ?, ?, ?, ?, ?)');
  labTests.forEach(t => insLab.run(uuidv4(), t.name, t.cat, t.sample, t.range, t.cost));
  saveDb();

  console.log('✅ Database seeded successfully with initial Admin account!');
}

// ------------------------------------------------------------------
// INIT (async because sql.js uses WASM)
// ------------------------------------------------------------------
let dbReady = false;
let dbPromise = null;

async function initDb() {
  if (dbReady) return;
  const SQLjs = await initSqlJs();
  SQL = SQLjs;

  if (fs.existsSync(DB_PATH)) {
    const fileData = fs.readFileSync(DB_PATH);
    const sqlDb = new SQL.Database(fileData);
    db = wrapDb(sqlDb);
    console.log('✅ Loaded existing database from', DB_PATH);
  } else {
    const sqlDb = new SQL.Database();
    db = wrapDb(sqlDb);
    console.log('✅ Created new database at', DB_PATH);
  }

  // ALWAYS run schema to create any missing tables
  db.exec(SCHEMA);

  try { db.exec("ALTER TABLE opd_visits ADD COLUMN visit_type TEXT DEFAULT 'Consultation'"); } catch (e) { /* ignore if exists */ }
  try { db.exec("ALTER TABLE patients ADD COLUMN allergies TEXT DEFAULT '[]'"); } catch (e) { /* ignore if exists */ }
  try { db.exec("ALTER TABLE patients ADD COLUMN chronic_conditions TEXT DEFAULT '[]'"); } catch (e) { /* ignore if exists */ }
  try { db.exec("ALTER TABLE patients ADD COLUMN emergency_contact TEXT"); } catch (e) { /* ignore if exists */ }
  try { db.exec("ALTER TABLE patients ADD COLUMN emergency_phone TEXT"); } catch (e) { /* ignore if exists */ }
  try { db.exec("ALTER TABLE patients ADD COLUMN insurance_provider TEXT"); } catch (e) { /* ignore if exists */ }
  try { db.exec("ALTER TABLE patients ADD COLUMN insurance_policy_number TEXT"); } catch (e) { /* ignore if exists */ }

  // Laboratory Migrations
  try { db.exec("ALTER TABLE lab_tests ADD COLUMN sample_collected_at TEXT"); } catch (e) { }
  try { db.exec("ALTER TABLE lab_tests ADD COLUMN sample_collected_by TEXT"); } catch (e) { }
  try { db.exec("ALTER TABLE lab_tests ADD COLUMN sample_barcode TEXT"); } catch (e) { }
  try { db.exec("ALTER TABLE lab_tests ADD COLUMN critical_flag INTEGER DEFAULT 0"); } catch (e) { }
  try { db.exec("ALTER TABLE lab_tests ADD COLUMN technician_id TEXT"); } catch (e) { }
  try { db.exec("ALTER TABLE lab_tests ADD COLUMN clinical_notes TEXT"); } catch (e) { }
  try { db.exec("ALTER TABLE lab_tests ADD COLUMN is_billed INTEGER DEFAULT 0"); } catch (e) { }
  try { db.exec("ALTER TABLE lab_tests ADD COLUMN invoice_id TEXT"); } catch (e) { }
  try { db.exec("ALTER TABLE lab_tests ADD COLUMN admission_id TEXT"); } catch (e) { }
  try { db.exec("ALTER TABLE lab_tests ADD COLUMN ordered_by TEXT"); } catch (e) { }
  try { db.exec("ALTER TABLE lab_tests ADD COLUMN result_entered_by TEXT"); } catch (e) { }
  try { db.exec("ALTER TABLE lab_tests ADD COLUMN result_entered_at TEXT"); } catch (e) { }

  try { db.exec("CREATE INDEX IF NOT EXISTS idx_lab_tests_admission ON lab_tests(admission_id)"); } catch (e) { }
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_lab_tests_patient ON lab_tests(patient_id)"); } catch (e) { }
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_lab_tests_status ON lab_tests(status)"); } catch (e) { }

  // Accounts Migrations
  try { db.exec("ALTER TABLE account_entries ADD COLUMN payment_method TEXT DEFAULT 'cash'"); } catch (e) { }
  try { db.exec("ALTER TABLE account_entries ADD COLUMN reference_id TEXT"); } catch (e) { }
  try { db.exec("ALTER TABLE account_entries ADD COLUMN department TEXT DEFAULT 'General'"); } catch (e) { }
  try { db.exec("ALTER TABLE account_entries ADD COLUMN status TEXT DEFAULT 'completed'"); } catch (e) { }
  try { db.exec("ALTER TABLE account_entries ADD COLUMN user_id TEXT"); } catch (e) { }

  saveDb();
  seedIfEmpty();

  dbReady = true;
}

dbPromise = initDb().catch(err => {
  console.error('❌ Failed to initialize database:', err);
  process.exit(1);
});

// Export proxy that waits for DB to be ready
module.exports = {
  prepare(sql) {
    return {
      run(...params) {
        if (!dbReady) throw new Error('DB not ready');
        return db.prepare(sql).run(...params);
      },
      get(...params) {
        if (!dbReady) throw new Error('DB not ready');
        return db.prepare(sql).get(...params);
      },
      all(...params) {
        if (!dbReady) throw new Error('DB not ready');
        return db.prepare(sql).all(...params);
      }
    };
  },
  exec(sql) {
    if (!dbReady) throw new Error('DB not ready');
    return db.exec(sql);
  },
  pragma() { },
  get ready() { return dbReady; },
  get promise() { return dbPromise; }
};
