import type {
  User, Patient, Doctor, Appointment, Prescription, LabTest,
  Invoice, Medicine, InsuranceCompany, InsuranceClaim, OPDVisit,
  IPDAdmission, Bed, AuditLog, AccountEntry, HospitalSettings
} from "./types"

// ===== Helper =====
function id() { return crypto.randomUUID() }

// ===== Hospital Settings =====
export const hospitalSettings: HospitalSettings = {
  name: "MedCore General Hospital",
  tagline: "Excellence in Healthcare",
  address: "1234 Medical Center Drive, Suite 100, New York, NY 10001",
  phone: "+1 (212) 555-0100",
  email: "admin@medcorehospital.com",
  website: "https://medcorehospital.com",
  currency: "USD",
  taxRate: 8.5,
}

// ===== Users =====
export const users: User[] = [
  { id: "usr-001", name: "Dr. Admin User", email: "admin@medcore.com", role: "admin", phone: "212-555-0101", department: "Administration", isActive: true, createdAt: "2024-01-15" },
  { id: "usr-002", name: "Dr. Sarah Chen", email: "sarah.chen@medcore.com", role: "doctor", phone: "212-555-0102", department: "Cardiology", isActive: true, createdAt: "2024-02-01" },
  { id: "usr-003", name: "Dr. James Wilson", email: "james.wilson@medcore.com", role: "doctor", phone: "212-555-0103", department: "Orthopedics", isActive: true, createdAt: "2024-02-10" },
  { id: "usr-004", name: "Nurse Emily Park", email: "emily.park@medcore.com", role: "nurse", phone: "212-555-0104", department: "General Ward", isActive: true, createdAt: "2024-03-01" },
  { id: "usr-005", name: "Mark Thompson", email: "mark.t@medcore.com", role: "pharmacist", phone: "212-555-0105", department: "Pharmacy", isActive: true, createdAt: "2024-03-15" },
  { id: "usr-006", name: "Linda Nguyen", email: "linda.n@medcore.com", role: "lab_tech", phone: "212-555-0106", department: "Laboratory", isActive: true, createdAt: "2024-04-01" },
  { id: "usr-007", name: "Rachel Adams", email: "rachel.a@medcore.com", role: "receptionist", phone: "212-555-0107", department: "Front Desk", isActive: true, createdAt: "2024-04-10" },
  { id: "usr-008", name: "David Kim", email: "david.k@medcore.com", role: "accountant", phone: "212-555-0108", department: "Accounts", isActive: true, createdAt: "2024-05-01" },
]

// ===== Doctors =====
export const doctors: Doctor[] = [
  { id: "doc-001", doctorId: "DOC-001", name: "Dr. Sarah Chen", email: "sarah.chen@medcore.com", phone: "212-555-0102", specialization: "Cardiologist", department: "Cardiology", qualification: "MD, FACC", experience: 12, consultationFee: 200, availableDays: ["Mon","Tue","Wed","Thu","Fri"], availableTimeStart: "09:00", availableTimeEnd: "17:00", status: "available", joinedAt: "2020-06-15" },
  { id: "doc-002", doctorId: "DOC-002", name: "Dr. James Wilson", email: "james.wilson@medcore.com", phone: "212-555-0103", specialization: "Orthopedic Surgeon", department: "Orthopedics", qualification: "MD, FAAOS", experience: 15, consultationFee: 250, availableDays: ["Mon","Wed","Fri"], availableTimeStart: "10:00", availableTimeEnd: "16:00", status: "available", joinedAt: "2019-03-20" },
  { id: "doc-003", doctorId: "DOC-003", name: "Dr. Priya Patel", email: "priya.patel@medcore.com", phone: "212-555-0109", specialization: "Pediatrician", department: "Pediatrics", qualification: "MD, FAAP", experience: 8, consultationFee: 175, availableDays: ["Mon","Tue","Thu","Fri"], availableTimeStart: "08:00", availableTimeEnd: "15:00", status: "available", joinedAt: "2021-01-10" },
  { id: "doc-004", doctorId: "DOC-004", name: "Dr. Michael Torres", email: "michael.t@medcore.com", phone: "212-555-0110", specialization: "Neurologist", department: "Neurology", qualification: "MD, PhD", experience: 18, consultationFee: 300, availableDays: ["Tue","Wed","Thu"], availableTimeStart: "09:00", availableTimeEnd: "14:00", status: "busy", joinedAt: "2018-07-01" },
  { id: "doc-005", doctorId: "DOC-005", name: "Dr. Emily Rodriguez", email: "emily.r@medcore.com", phone: "212-555-0111", specialization: "Dermatologist", department: "Dermatology", qualification: "MD, FAAD", experience: 6, consultationFee: 180, availableDays: ["Mon","Tue","Wed","Thu","Fri"], availableTimeStart: "09:00", availableTimeEnd: "17:00", status: "available", joinedAt: "2022-04-15" },
  { id: "doc-006", doctorId: "DOC-006", name: "Dr. Robert Kim", email: "robert.k@medcore.com", phone: "212-555-0112", specialization: "General Surgeon", department: "Surgery", qualification: "MD, FACS", experience: 20, consultationFee: 275, availableDays: ["Mon","Wed","Fri"], availableTimeStart: "07:00", availableTimeEnd: "13:00", status: "available", joinedAt: "2017-11-20" },
  { id: "doc-007", doctorId: "DOC-007", name: "Dr. Aisha Rahman", email: "aisha.r@medcore.com", phone: "212-555-0113", specialization: "Gynecologist", department: "OB/GYN", qualification: "MD, FACOG", experience: 10, consultationFee: 200, availableDays: ["Mon","Tue","Thu","Fri"], availableTimeStart: "09:00", availableTimeEnd: "16:00", status: "on-leave", joinedAt: "2020-09-05" },
  { id: "doc-008", doctorId: "DOC-008", name: "Dr. Thomas Lee", email: "thomas.l@medcore.com", phone: "212-555-0114", specialization: "Pulmonologist", department: "Pulmonology", qualification: "MD, FCCP", experience: 14, consultationFee: 225, availableDays: ["Mon","Tue","Wed","Thu"], availableTimeStart: "08:00", availableTimeEnd: "15:00", status: "available", joinedAt: "2019-05-12" },
  { id: "doc-009", doctorId: "DOC-009", name: "Dr. Laura Martinez", email: "laura.m@medcore.com", phone: "212-555-0115", specialization: "Ophthalmologist", department: "Ophthalmology", qualification: "MD, FACS", experience: 9, consultationFee: 190, availableDays: ["Tue","Wed","Thu","Fri"], availableTimeStart: "10:00", availableTimeEnd: "17:00", status: "available", joinedAt: "2021-08-22" },
  { id: "doc-010", doctorId: "DOC-010", name: "Dr. Daniel Brown", email: "daniel.b@medcore.com", phone: "212-555-0116", specialization: "ENT Specialist", department: "ENT", qualification: "MD, FAAOA", experience: 11, consultationFee: 195, availableDays: ["Mon","Wed","Fri"], availableTimeStart: "09:00", availableTimeEnd: "16:00", status: "available", joinedAt: "2020-02-14" },
]

// ===== Patients =====
export const patients: Patient[] = [
  { id: "pat-001", patientId: "PAT-0001", firstName: "John", lastName: "Doe", dateOfBirth: "1985-03-15", gender: "male", bloodGroup: "O+", phone: "212-555-1001", email: "john.doe@email.com", address: "123 Main St, Apt 4B", city: "New York", emergencyContact: "Jane Doe", emergencyPhone: "212-555-1002", insuranceProvider: "BlueCross", insurancePolicyNumber: "BC-123456", status: "active", registeredAt: "2024-01-20", lastVisit: "2026-02-15" },
  { id: "pat-002", patientId: "PAT-0002", firstName: "Maria", lastName: "Garcia", dateOfBirth: "1990-07-22", gender: "female", bloodGroup: "A+", phone: "212-555-1003", email: "maria.g@email.com", address: "456 Oak Ave", city: "New York", emergencyContact: "Carlos Garcia", emergencyPhone: "212-555-1004", insuranceProvider: "Aetna", insurancePolicyNumber: "AE-789012", status: "active", registeredAt: "2024-02-10", lastVisit: "2026-02-18" },
  { id: "pat-003", patientId: "PAT-0003", firstName: "Robert", lastName: "Smith", dateOfBirth: "1972-11-08", gender: "male", bloodGroup: "B+", phone: "212-555-1005", email: "r.smith@email.com", address: "789 Pine Rd", city: "Brooklyn", emergencyContact: "Susan Smith", emergencyPhone: "212-555-1006", status: "active", registeredAt: "2024-03-05", lastVisit: "2026-02-10" },
  { id: "pat-004", patientId: "PAT-0004", firstName: "Emily", lastName: "Johnson", dateOfBirth: "1995-05-30", gender: "female", bloodGroup: "AB+", phone: "212-555-1007", email: "e.johnson@email.com", address: "321 Elm St", city: "Queens", emergencyContact: "Mike Johnson", emergencyPhone: "212-555-1008", insuranceProvider: "UnitedHealth", insurancePolicyNumber: "UH-345678", status: "active", registeredAt: "2024-04-12", lastVisit: "2026-02-20" },
  { id: "pat-005", patientId: "PAT-0005", firstName: "William", lastName: "Brown", dateOfBirth: "1960-09-14", gender: "male", bloodGroup: "O-", phone: "212-555-1009", email: "w.brown@email.com", address: "654 Maple Dr", city: "Bronx", emergencyContact: "Linda Brown", emergencyPhone: "212-555-1010", insuranceProvider: "Cigna", insurancePolicyNumber: "CG-901234", status: "active", registeredAt: "2024-05-20", lastVisit: "2026-01-28" },
  { id: "pat-006", patientId: "PAT-0006", firstName: "Sophia", lastName: "Lee", dateOfBirth: "1988-12-03", gender: "female", bloodGroup: "A-", phone: "212-555-1011", email: "sophia.l@email.com", address: "987 Cedar Ln", city: "Manhattan", emergencyContact: "David Lee", emergencyPhone: "212-555-1012", status: "active", registeredAt: "2024-06-15", lastVisit: "2026-02-12" },
  { id: "pat-007", patientId: "PAT-0007", firstName: "James", lastName: "Taylor", dateOfBirth: "1978-04-25", gender: "male", bloodGroup: "B-", phone: "212-555-1013", email: "j.taylor@email.com", address: "147 Birch St", city: "Staten Island", emergencyContact: "Amy Taylor", emergencyPhone: "212-555-1014", insuranceProvider: "BlueCross", insurancePolicyNumber: "BC-567890", status: "active", registeredAt: "2024-07-08", lastVisit: "2026-02-05" },
  { id: "pat-008", patientId: "PAT-0008", firstName: "Olivia", lastName: "Martinez", dateOfBirth: "2000-01-17", gender: "female", bloodGroup: "O+", phone: "212-555-1015", email: "o.martinez@email.com", address: "258 Walnut Ave", city: "New York", emergencyContact: "Rosa Martinez", emergencyPhone: "212-555-1016", insuranceProvider: "Aetna", insurancePolicyNumber: "AE-112233", status: "active", registeredAt: "2024-08-22", lastVisit: "2026-02-19" },
  { id: "pat-009", patientId: "PAT-0009", firstName: "Benjamin", lastName: "Anderson", dateOfBirth: "1965-06-11", gender: "male", bloodGroup: "AB-", phone: "212-555-1017", email: "b.anderson@email.com", address: "369 Spruce Ct", city: "Brooklyn", emergencyContact: "Carol Anderson", emergencyPhone: "212-555-1018", insuranceProvider: "UnitedHealth", insurancePolicyNumber: "UH-445566", status: "active", registeredAt: "2024-09-10", lastVisit: "2026-01-15" },
  { id: "pat-010", patientId: "PAT-0010", firstName: "Charlotte", lastName: "Thomas", dateOfBirth: "1993-08-29", gender: "female", bloodGroup: "A+", phone: "212-555-1019", email: "c.thomas@email.com", address: "480 Willow Way", city: "Queens", emergencyContact: "Mark Thomas", emergencyPhone: "212-555-1020", status: "active", registeredAt: "2024-10-05", lastVisit: "2026-02-17" },
  { id: "pat-011", patientId: "PAT-0011", firstName: "Daniel", lastName: "White", dateOfBirth: "1982-02-18", gender: "male", bloodGroup: "O+", phone: "212-555-1021", email: "d.white@email.com", address: "591 Ash Blvd", city: "Bronx", emergencyContact: "Karen White", emergencyPhone: "212-555-1022", insuranceProvider: "Cigna", insurancePolicyNumber: "CG-778899", status: "active", registeredAt: "2024-11-12", lastVisit: "2026-02-08" },
  { id: "pat-012", patientId: "PAT-0012", firstName: "Ava", lastName: "Harris", dateOfBirth: "1998-10-07", gender: "female", bloodGroup: "B+", phone: "212-555-1023", email: "a.harris@email.com", address: "702 Poplar Rd", city: "Manhattan", emergencyContact: "Steve Harris", emergencyPhone: "212-555-1024", status: "active", registeredAt: "2024-12-01", lastVisit: "2026-02-14" },
  { id: "pat-013", patientId: "PAT-0013", firstName: "Henry", lastName: "Clark", dateOfBirth: "1970-07-19", gender: "male", bloodGroup: "A-", phone: "212-555-1025", email: "h.clark@email.com", address: "813 Hickory Ln", city: "New York", emergencyContact: "Diane Clark", emergencyPhone: "212-555-1026", insuranceProvider: "BlueCross", insurancePolicyNumber: "BC-334455", status: "inactive", registeredAt: "2024-06-20", lastVisit: "2025-11-30" },
  { id: "pat-014", patientId: "PAT-0014", firstName: "Mia", lastName: "Lewis", dateOfBirth: "2005-03-12", gender: "female", bloodGroup: "O-", phone: "212-555-1027", email: "m.lewis@email.com", address: "924 Sycamore St", city: "Brooklyn", emergencyContact: "Tom Lewis", emergencyPhone: "212-555-1028", insuranceProvider: "Aetna", insurancePolicyNumber: "AE-667788", status: "active", registeredAt: "2025-01-15", lastVisit: "2026-02-21" },
  { id: "pat-015", patientId: "PAT-0015", firstName: "Alexander", lastName: "Walker", dateOfBirth: "1955-12-24", gender: "male", bloodGroup: "AB+", phone: "212-555-1029", email: "a.walker@email.com", address: "135 Chestnut Ave", city: "Staten Island", emergencyContact: "Betty Walker", emergencyPhone: "212-555-1030", insuranceProvider: "UnitedHealth", insurancePolicyNumber: "UH-990011", status: "active", registeredAt: "2025-01-28", lastVisit: "2026-02-16" },
]

// ===== Appointments =====
export const appointments: Appointment[] = [
  { id: "apt-001", appointmentId: "APT-0001", patientId: "pat-001", patientName: "John Doe", doctorId: "doc-001", doctorName: "Dr. Sarah Chen", department: "Cardiology", date: "2026-02-21", time: "09:00", type: "consultation", status: "scheduled", createdAt: "2026-02-18" },
  { id: "apt-002", appointmentId: "APT-0002", patientId: "pat-002", patientName: "Maria Garcia", doctorId: "doc-003", doctorName: "Dr. Priya Patel", department: "Pediatrics", date: "2026-02-21", time: "09:30", type: "follow-up", status: "scheduled", createdAt: "2026-02-17" },
  { id: "apt-003", appointmentId: "APT-0003", patientId: "pat-004", patientName: "Emily Johnson", doctorId: "doc-005", doctorName: "Dr. Emily Rodriguez", department: "Dermatology", date: "2026-02-21", time: "10:00", type: "consultation", status: "in-progress", createdAt: "2026-02-19" },
  { id: "apt-004", appointmentId: "APT-0004", patientId: "pat-005", patientName: "William Brown", doctorId: "doc-004", doctorName: "Dr. Michael Torres", department: "Neurology", date: "2026-02-21", time: "10:30", type: "follow-up", status: "completed", notes: "MRI results reviewed. No significant changes.", createdAt: "2026-02-15" },
  { id: "apt-005", appointmentId: "APT-0005", patientId: "pat-003", patientName: "Robert Smith", doctorId: "doc-002", doctorName: "Dr. James Wilson", department: "Orthopedics", date: "2026-02-21", time: "11:00", type: "consultation", status: "scheduled", createdAt: "2026-02-20" },
  { id: "apt-006", appointmentId: "APT-0006", patientId: "pat-006", patientName: "Sophia Lee", doctorId: "doc-001", doctorName: "Dr. Sarah Chen", department: "Cardiology", date: "2026-02-21", time: "14:00", type: "routine-checkup", status: "scheduled", createdAt: "2026-02-19" },
  { id: "apt-007", appointmentId: "APT-0007", patientId: "pat-008", patientName: "Olivia Martinez", doctorId: "doc-008", doctorName: "Dr. Thomas Lee", department: "Pulmonology", date: "2026-02-22", time: "09:00", type: "consultation", status: "scheduled", createdAt: "2026-02-20" },
  { id: "apt-008", appointmentId: "APT-0008", patientId: "pat-010", patientName: "Charlotte Thomas", doctorId: "doc-009", doctorName: "Dr. Laura Martinez", department: "Ophthalmology", date: "2026-02-22", time: "10:30", type: "follow-up", status: "scheduled", createdAt: "2026-02-19" },
  { id: "apt-009", appointmentId: "APT-0009", patientId: "pat-011", patientName: "Daniel White", doctorId: "doc-006", doctorName: "Dr. Robert Kim", department: "Surgery", date: "2026-02-22", time: "07:30", type: "consultation", status: "scheduled", createdAt: "2026-02-21" },
  { id: "apt-010", appointmentId: "APT-0010", patientId: "pat-012", patientName: "Ava Harris", doctorId: "doc-010", doctorName: "Dr. Daniel Brown", department: "ENT", date: "2026-02-20", time: "14:00", type: "consultation", status: "completed", notes: "Prescribed nasal spray.", createdAt: "2026-02-18" },
  { id: "apt-011", appointmentId: "APT-0011", patientId: "pat-007", patientName: "James Taylor", doctorId: "doc-002", doctorName: "Dr. James Wilson", department: "Orthopedics", date: "2026-02-20", time: "11:00", type: "follow-up", status: "completed", notes: "Healing well. Follow up in 4 weeks.", createdAt: "2026-02-16" },
  { id: "apt-012", appointmentId: "APT-0012", patientId: "pat-014", patientName: "Mia Lewis", doctorId: "doc-003", doctorName: "Dr. Priya Patel", department: "Pediatrics", date: "2026-02-19", time: "09:00", type: "routine-checkup", status: "completed", createdAt: "2026-02-14" },
  { id: "apt-013", appointmentId: "APT-0013", patientId: "pat-009", patientName: "Benjamin Anderson", doctorId: "doc-004", doctorName: "Dr. Michael Torres", department: "Neurology", date: "2026-02-23", time: "09:00", type: "emergency", status: "scheduled", createdAt: "2026-02-21" },
  { id: "apt-014", appointmentId: "APT-0014", patientId: "pat-015", patientName: "Alexander Walker", doctorId: "doc-001", doctorName: "Dr. Sarah Chen", department: "Cardiology", date: "2026-02-23", time: "14:00", type: "follow-up", status: "scheduled", createdAt: "2026-02-20" },
  { id: "apt-015", appointmentId: "APT-0015", patientId: "pat-001", patientName: "John Doe", doctorId: "doc-008", doctorName: "Dr. Thomas Lee", department: "Pulmonology", date: "2026-02-18", time: "10:00", type: "consultation", status: "cancelled", createdAt: "2026-02-12" },
]

// ===== Prescriptions =====
export const prescriptions: Prescription[] = [
  { id: "prx-001", prescriptionId: "PRX-0001", patientId: "pat-001", patientName: "John Doe", doctorId: "doc-001", doctorName: "Dr. Sarah Chen", appointmentId: "apt-001", date: "2026-02-15", diagnosis: "Hypertension Stage 1", medicines: [
    { medicineId: "med-001", medicineName: "Amlodipine 5mg", dosage: "5mg", frequency: "Once daily", duration: "30 days", quantity: 30, instructions: "Take in the morning" },
    { medicineId: "med-005", medicineName: "Aspirin 75mg", dosage: "75mg", frequency: "Once daily", duration: "30 days", quantity: 30, instructions: "After lunch" },
  ], status: "dispensed" },
  { id: "prx-002", prescriptionId: "PRX-0002", patientId: "pat-002", patientName: "Maria Garcia", doctorId: "doc-003", doctorName: "Dr. Priya Patel", date: "2026-02-18", diagnosis: "Acute Bronchitis", medicines: [
    { medicineId: "med-003", medicineName: "Amoxicillin 500mg", dosage: "500mg", frequency: "Three times daily", duration: "7 days", quantity: 21, instructions: "After meals" },
    { medicineId: "med-007", medicineName: "Cetirizine 10mg", dosage: "10mg", frequency: "Once daily", duration: "5 days", quantity: 5, instructions: "Before bedtime" },
  ], status: "pending" },
  { id: "prx-003", prescriptionId: "PRX-0003", patientId: "pat-004", patientName: "Emily Johnson", doctorId: "doc-005", doctorName: "Dr. Emily Rodriguez", date: "2026-02-20", diagnosis: "Contact Dermatitis", medicines: [
    { medicineId: "med-008", medicineName: "Hydrocortisone Cream 1%", dosage: "Apply thin layer", frequency: "Twice daily", duration: "14 days", quantity: 1, instructions: "Apply to affected area" },
  ], status: "pending" },
  { id: "prx-004", prescriptionId: "PRX-0004", patientId: "pat-005", patientName: "William Brown", doctorId: "doc-004", doctorName: "Dr. Michael Torres", date: "2026-02-21", diagnosis: "Migraine with aura", medicines: [
    { medicineId: "med-009", medicineName: "Sumatriptan 50mg", dosage: "50mg", frequency: "As needed", duration: "30 days", quantity: 10, instructions: "Take at onset of migraine" },
    { medicineId: "med-002", medicineName: "Ibuprofen 400mg", dosage: "400mg", frequency: "Twice daily", duration: "7 days", quantity: 14, instructions: "After meals" },
  ], status: "pending" },
  { id: "prx-005", prescriptionId: "PRX-0005", patientId: "pat-007", patientName: "James Taylor", doctorId: "doc-002", doctorName: "Dr. James Wilson", date: "2026-02-20", diagnosis: "Knee ligament sprain", medicines: [
    { medicineId: "med-002", medicineName: "Ibuprofen 400mg", dosage: "400mg", frequency: "Three times daily", duration: "10 days", quantity: 30, instructions: "After meals" },
    { medicineId: "med-010", medicineName: "Muscle Relaxant (Cyclobenzaprine)", dosage: "10mg", frequency: "Once daily", duration: "7 days", quantity: 7, instructions: "Before bedtime" },
  ], status: "dispensed" },
]

// ===== Medicines =====
export const medicines: Medicine[] = [
  { id: "med-001", name: "Amlodipine 5mg", genericName: "Amlodipine Besylate", category: "Cardiovascular", manufacturer: "Pfizer", batchNumber: "BTH-2025-001", expiryDate: "2027-06-30", quantity: 500, reorderLevel: 100, unitPrice: 0.30, sellingPrice: 0.80, unit: "tablet", status: "in-stock" },
  { id: "med-002", name: "Ibuprofen 400mg", genericName: "Ibuprofen", category: "Anti-inflammatory", manufacturer: "Abbott", batchNumber: "BTH-2025-002", expiryDate: "2027-03-15", quantity: 800, reorderLevel: 200, unitPrice: 0.15, sellingPrice: 0.50, unit: "tablet", status: "in-stock" },
  { id: "med-003", name: "Amoxicillin 500mg", genericName: "Amoxicillin", category: "Antibiotic", manufacturer: "GSK", batchNumber: "BTH-2025-003", expiryDate: "2026-12-20", quantity: 300, reorderLevel: 100, unitPrice: 0.40, sellingPrice: 1.20, unit: "capsule", status: "in-stock" },
  { id: "med-004", name: "Metformin 500mg", genericName: "Metformin HCl", category: "Antidiabetic", manufacturer: "Merck", batchNumber: "BTH-2025-004", expiryDate: "2027-09-10", quantity: 600, reorderLevel: 150, unitPrice: 0.20, sellingPrice: 0.60, unit: "tablet", status: "in-stock" },
  { id: "med-005", name: "Aspirin 75mg", genericName: "Acetylsalicylic Acid", category: "Antiplatelet", manufacturer: "Bayer", batchNumber: "BTH-2025-005", expiryDate: "2027-08-25", quantity: 1000, reorderLevel: 200, unitPrice: 0.10, sellingPrice: 0.30, unit: "tablet", status: "in-stock" },
  { id: "med-006", name: "Omeprazole 20mg", genericName: "Omeprazole", category: "Gastrointestinal", manufacturer: "AstraZeneca", batchNumber: "BTH-2025-006", expiryDate: "2027-01-15", quantity: 45, reorderLevel: 100, unitPrice: 0.35, sellingPrice: 0.90, unit: "capsule", status: "low-stock" },
  { id: "med-007", name: "Cetirizine 10mg", genericName: "Cetirizine HCl", category: "Antihistamine", manufacturer: "UCB", batchNumber: "BTH-2025-007", expiryDate: "2027-05-20", quantity: 400, reorderLevel: 100, unitPrice: 0.12, sellingPrice: 0.40, unit: "tablet", status: "in-stock" },
  { id: "med-008", name: "Hydrocortisone Cream 1%", genericName: "Hydrocortisone", category: "Topical Steroid", manufacturer: "Johnson & Johnson", batchNumber: "BTH-2025-008", expiryDate: "2026-11-30", quantity: 75, reorderLevel: 30, unitPrice: 2.50, sellingPrice: 5.99, unit: "tube", status: "in-stock" },
  { id: "med-009", name: "Sumatriptan 50mg", genericName: "Sumatriptan Succinate", category: "Antimigraine", manufacturer: "GSK", batchNumber: "BTH-2025-009", expiryDate: "2027-04-10", quantity: 120, reorderLevel: 50, unitPrice: 1.80, sellingPrice: 4.50, unit: "tablet", status: "in-stock" },
  { id: "med-010", name: "Cyclobenzaprine 10mg", genericName: "Cyclobenzaprine HCl", category: "Muscle Relaxant", manufacturer: "Teva", batchNumber: "BTH-2025-010", expiryDate: "2027-07-22", quantity: 200, reorderLevel: 60, unitPrice: 0.45, sellingPrice: 1.10, unit: "tablet", status: "in-stock" },
  { id: "med-011", name: "Lisinopril 10mg", genericName: "Lisinopril", category: "Cardiovascular", manufacturer: "Merck", batchNumber: "BTH-2025-011", expiryDate: "2027-02-28", quantity: 20, reorderLevel: 80, unitPrice: 0.25, sellingPrice: 0.70, unit: "tablet", status: "low-stock" },
  { id: "med-012", name: "Paracetamol 500mg", genericName: "Acetaminophen", category: "Analgesic", manufacturer: "GSK", batchNumber: "BTH-2025-012", expiryDate: "2026-08-15", quantity: 0, reorderLevel: 300, unitPrice: 0.08, sellingPrice: 0.25, unit: "tablet", status: "out-of-stock" },
]

// ===== Lab Tests =====
export const labTests: LabTest[] = [
  { id: "lab-001", testId: "LAB-0001", patientId: "pat-001", patientName: "John Doe", doctorId: "doc-001", doctorName: "Dr. Sarah Chen", testName: "Complete Blood Count", testCategory: "Hematology", sampleType: "Blood", priority: "normal", status: "completed", orderedAt: "2026-02-15", completedAt: "2026-02-16", results: "WBC: 7.2, RBC: 4.8, Hgb: 14.5, Plt: 250", normalRange: "WBC: 4.5-11, RBC: 4.5-5.5, Hgb: 13-17, Plt: 150-400", cost: 45 },
  { id: "lab-002", testId: "LAB-0002", patientId: "pat-001", patientName: "John Doe", doctorId: "doc-001", doctorName: "Dr. Sarah Chen", testName: "Lipid Panel", testCategory: "Chemistry", sampleType: "Blood", priority: "normal", status: "completed", orderedAt: "2026-02-15", completedAt: "2026-02-16", results: "Total Cholesterol: 220, LDL: 140, HDL: 55, Triglycerides: 180", normalRange: "TC: <200, LDL: <100, HDL: >40, TG: <150", cost: 65 },
  { id: "lab-003", testId: "LAB-0003", patientId: "pat-005", patientName: "William Brown", doctorId: "doc-004", doctorName: "Dr. Michael Torres", testName: "MRI Brain", testCategory: "Radiology", sampleType: "N/A", priority: "urgent", status: "completed", orderedAt: "2026-02-19", completedAt: "2026-02-20", results: "No acute intracranial abnormality. Mild periventricular white matter changes.", cost: 850 },
  { id: "lab-004", testId: "LAB-0004", patientId: "pat-009", patientName: "Benjamin Anderson", doctorId: "doc-004", doctorName: "Dr. Michael Torres", testName: "EEG", testCategory: "Neurophysiology", sampleType: "N/A", priority: "normal", status: "in-progress", orderedAt: "2026-02-21", cost: 300 },
  { id: "lab-005", testId: "LAB-0005", patientId: "pat-002", patientName: "Maria Garcia", doctorId: "doc-003", doctorName: "Dr. Priya Patel", testName: "Chest X-Ray", testCategory: "Radiology", sampleType: "N/A", priority: "normal", status: "completed", orderedAt: "2026-02-18", completedAt: "2026-02-18", results: "Mild bilateral peribronchial thickening. No consolidation.", cost: 120 },
  { id: "lab-006", testId: "LAB-0006", patientId: "pat-004", patientName: "Emily Johnson", doctorId: "doc-005", doctorName: "Dr. Emily Rodriguez", testName: "Allergy Panel", testCategory: "Immunology", sampleType: "Blood", priority: "normal", status: "ordered", orderedAt: "2026-02-21", cost: 180 },
  { id: "lab-007", testId: "LAB-0007", patientId: "pat-011", patientName: "Daniel White", doctorId: "doc-006", doctorName: "Dr. Robert Kim", testName: "Blood Glucose Fasting", testCategory: "Chemistry", sampleType: "Blood", priority: "normal", status: "sample-collected", orderedAt: "2026-02-21", cost: 25 },
  { id: "lab-008", testId: "LAB-0008", patientId: "pat-015", patientName: "Alexander Walker", doctorId: "doc-001", doctorName: "Dr. Sarah Chen", testName: "ECG", testCategory: "Cardiology", sampleType: "N/A", priority: "urgent", status: "ordered", orderedAt: "2026-02-21", cost: 75 },
]

// ===== Invoices =====
export const invoices: Invoice[] = [
  { id: "inv-001", invoiceId: "INV-0001", patientId: "pat-001", patientName: "John Doe", date: "2026-02-15", dueDate: "2026-03-15", items: [
    { description: "Cardiology Consultation", category: "consultation", quantity: 1, unitPrice: 200, total: 200 },
    { description: "Complete Blood Count", category: "laboratory", quantity: 1, unitPrice: 45, total: 45 },
    { description: "Lipid Panel", category: "laboratory", quantity: 1, unitPrice: 65, total: 65 },
    { description: "Amlodipine 5mg x30", category: "pharmacy", quantity: 1, unitPrice: 24, total: 24 },
    { description: "Aspirin 75mg x30", category: "pharmacy", quantity: 1, unitPrice: 9, total: 9 },
  ], subtotal: 343, tax: 29.16, discount: 0, total: 372.16, paidAmount: 372.16, status: "paid", paymentMethod: "insurance", insuranceClaim: "CLM-001" },
  { id: "inv-002", invoiceId: "INV-0002", patientId: "pat-002", patientName: "Maria Garcia", date: "2026-02-18", dueDate: "2026-03-18", items: [
    { description: "Pediatrics Consultation", category: "consultation", quantity: 1, unitPrice: 175, total: 175 },
    { description: "Chest X-Ray", category: "laboratory", quantity: 1, unitPrice: 120, total: 120 },
  ], subtotal: 295, tax: 25.08, discount: 0, total: 320.08, paidAmount: 175, status: "partial", paymentMethod: "card" },
  { id: "inv-003", invoiceId: "INV-0003", patientId: "pat-005", patientName: "William Brown", date: "2026-02-20", dueDate: "2026-03-20", items: [
    { description: "Neurology Consultation", category: "consultation", quantity: 1, unitPrice: 300, total: 300 },
    { description: "MRI Brain", category: "laboratory", quantity: 1, unitPrice: 850, total: 850 },
  ], subtotal: 1150, tax: 97.75, discount: 50, total: 1197.75, paidAmount: 0, status: "unpaid" },
  { id: "inv-004", invoiceId: "INV-0004", patientId: "pat-007", patientName: "James Taylor", date: "2026-02-20", dueDate: "2026-03-20", items: [
    { description: "Orthopedics Consultation", category: "consultation", quantity: 1, unitPrice: 250, total: 250 },
    { description: "Ibuprofen 400mg x30", category: "pharmacy", quantity: 1, unitPrice: 15, total: 15 },
    { description: "Cyclobenzaprine 10mg x7", category: "pharmacy", quantity: 1, unitPrice: 7.70, total: 7.70 },
  ], subtotal: 272.70, tax: 23.18, discount: 0, total: 295.88, paidAmount: 295.88, status: "paid", paymentMethod: "cash" },
  { id: "inv-005", invoiceId: "INV-0005", patientId: "pat-004", patientName: "Emily Johnson", date: "2026-02-21", dueDate: "2026-03-21", items: [
    { description: "Dermatology Consultation", category: "consultation", quantity: 1, unitPrice: 180, total: 180 },
    { description: "Allergy Panel", category: "laboratory", quantity: 1, unitPrice: 180, total: 180 },
    { description: "Hydrocortisone Cream 1%", category: "pharmacy", quantity: 1, unitPrice: 5.99, total: 5.99 },
  ], subtotal: 365.99, tax: 31.11, discount: 0, total: 397.10, paidAmount: 0, status: "unpaid" },
]

// ===== Insurance =====
export const insuranceCompanies: InsuranceCompany[] = [
  { id: "ins-001", name: "BlueCross BlueShield", contactPerson: "Patricia Collins", phone: "800-555-0001", email: "providers@bcbs.com", address: "225 North Michigan Ave, Chicago, IL", status: "active" },
  { id: "ins-002", name: "Aetna", contactPerson: "James Hartford", phone: "800-555-0002", email: "claims@aetna.com", address: "151 Farmington Ave, Hartford, CT", status: "active" },
  { id: "ins-003", name: "UnitedHealth Group", contactPerson: "Sarah Minnetonka", phone: "800-555-0003", email: "providers@uhg.com", address: "9900 Bren Road, Minnetonka, MN", status: "active" },
  { id: "ins-004", name: "Cigna", contactPerson: "David Bloomfield", phone: "800-555-0004", email: "claims@cigna.com", address: "900 Cottage Grove Rd, Bloomfield, CT", status: "active" },
]

export const insuranceClaims: InsuranceClaim[] = [
  { id: "clm-001", claimId: "CLM-0001", patientId: "pat-001", patientName: "John Doe", insuranceCompany: "BlueCross BlueShield", policyNumber: "BC-123456", invoiceId: "inv-001", claimAmount: 372.16, approvedAmount: 372.16, status: "settled", submittedAt: "2026-02-16", settledAt: "2026-02-20" },
  { id: "clm-002", claimId: "CLM-0002", patientId: "pat-004", patientName: "Emily Johnson", insuranceCompany: "UnitedHealth Group", policyNumber: "UH-345678", invoiceId: "inv-005", claimAmount: 397.10, status: "under-review", submittedAt: "2026-02-21" },
  { id: "clm-003", claimId: "CLM-0003", patientId: "pat-005", patientName: "William Brown", insuranceCompany: "Cigna", policyNumber: "CG-901234", invoiceId: "inv-003", claimAmount: 1197.75, status: "submitted", submittedAt: "2026-02-21" },
]

// ===== OPD =====
export const opdVisits: OPDVisit[] = [
  { id: "opd-001", visitId: "OPD-0001", patientId: "pat-001", patientName: "John Doe", doctorId: "doc-001", doctorName: "Dr. Sarah Chen", department: "Cardiology", date: "2026-02-21", time: "09:00", chiefComplaint: "Chest pain and shortness of breath", vitals: { bloodPressure: "140/90", pulse: 88, temperature: 98.6, weight: 82, height: 175, spo2: 97 }, status: "waiting", tokenNumber: 1 },
  { id: "opd-002", visitId: "OPD-0002", patientId: "pat-004", patientName: "Emily Johnson", doctorId: "doc-005", doctorName: "Dr. Emily Rodriguez", department: "Dermatology", date: "2026-02-21", time: "10:00", chiefComplaint: "Persistent skin rash on arms", vitals: { bloodPressure: "118/76", pulse: 72, temperature: 98.4, weight: 65, height: 163, spo2: 99 }, diagnosis: "Contact Dermatitis", status: "in-consultation", tokenNumber: 2 },
  { id: "opd-003", visitId: "OPD-0003", patientId: "pat-003", patientName: "Robert Smith", doctorId: "doc-002", doctorName: "Dr. James Wilson", department: "Orthopedics", date: "2026-02-21", time: "11:00", chiefComplaint: "Lower back pain for 2 weeks", vitals: { bloodPressure: "130/85", pulse: 76, temperature: 98.7, weight: 90, height: 180, spo2: 98 }, status: "waiting", tokenNumber: 3 },
  { id: "opd-004", visitId: "OPD-0004", patientId: "pat-006", patientName: "Sophia Lee", doctorId: "doc-001", doctorName: "Dr. Sarah Chen", department: "Cardiology", date: "2026-02-21", time: "14:00", chiefComplaint: "Annual cardiac checkup", vitals: { bloodPressure: "122/78", pulse: 68, temperature: 98.5, weight: 58, height: 160, spo2: 99 }, status: "waiting", tokenNumber: 4 },
]

// ===== IPD =====
export const ipdAdmissions: IPDAdmission[] = [
  { id: "ipd-001", admissionId: "IPD-0001", patientId: "pat-009", patientName: "Benjamin Anderson", doctorId: "doc-004", doctorName: "Dr. Michael Torres", department: "Neurology", ward: "General Ward A", bedNumber: "GWA-05", admissionDate: "2026-02-18", diagnosis: "Transient Ischemic Attack (TIA)", status: "admitted", nursingNotes: ["Patient stable. Monitoring vitals every 4 hours.", "Started IV fluids. Neuro checks normal."] },
  { id: "ipd-002", admissionId: "IPD-0002", patientId: "pat-015", patientName: "Alexander Walker", doctorId: "doc-001", doctorName: "Dr. Sarah Chen", department: "Cardiology", ward: "ICU", bedNumber: "ICU-02", admissionDate: "2026-02-19", diagnosis: "Acute Myocardial Infarction", status: "admitted", nursingNotes: ["Post-PCI procedure. Hemodynamically stable.", "Monitoring continuous ECG. Vitals stable.", "Started Dual Antiplatelet Therapy."] },
  { id: "ipd-003", admissionId: "IPD-0003", patientId: "pat-011", patientName: "Daniel White", doctorId: "doc-006", doctorName: "Dr. Robert Kim", department: "Surgery", ward: "Surgical Ward", bedNumber: "SW-03", admissionDate: "2026-02-20", diagnosis: "Appendicitis - Post Appendectomy", status: "admitted", nursingNotes: ["Post-op day 1. Tolerating clear liquids.", "Wound site clean and dry."] },
]

// ===== Beds =====
export const beds: Bed[] = [
  { id: "bed-001", ward: "General Ward A", bedNumber: "GWA-01", type: "general", status: "available", dailyRate: 150 },
  { id: "bed-002", ward: "General Ward A", bedNumber: "GWA-02", type: "general", status: "available", dailyRate: 150 },
  { id: "bed-003", ward: "General Ward A", bedNumber: "GWA-03", type: "general", status: "occupied", patientId: "pat-009", dailyRate: 150 },
  { id: "bed-004", ward: "General Ward A", bedNumber: "GWA-04", type: "general", status: "maintenance", dailyRate: 150 },
  { id: "bed-005", ward: "General Ward A", bedNumber: "GWA-05", type: "general", status: "occupied", patientId: "pat-009", dailyRate: 150 },
  { id: "bed-006", ward: "General Ward B", bedNumber: "GWB-01", type: "general", status: "available", dailyRate: 150 },
  { id: "bed-007", ward: "General Ward B", bedNumber: "GWB-02", type: "general", status: "available", dailyRate: 150 },
  { id: "bed-008", ward: "Semi-Private", bedNumber: "SP-01", type: "semi-private", status: "available", dailyRate: 300 },
  { id: "bed-009", ward: "Semi-Private", bedNumber: "SP-02", type: "semi-private", status: "occupied", dailyRate: 300 },
  { id: "bed-010", ward: "Private", bedNumber: "PVT-01", type: "private", status: "available", dailyRate: 500 },
  { id: "bed-011", ward: "Private", bedNumber: "PVT-02", type: "private", status: "reserved", dailyRate: 500 },
  { id: "bed-012", ward: "ICU", bedNumber: "ICU-01", type: "icu", status: "available", dailyRate: 1200 },
  { id: "bed-013", ward: "ICU", bedNumber: "ICU-02", type: "icu", status: "occupied", patientId: "pat-015", dailyRate: 1200 },
  { id: "bed-014", ward: "ICU", bedNumber: "ICU-03", type: "icu", status: "available", dailyRate: 1200 },
  { id: "bed-015", ward: "ICU", bedNumber: "ICU-04", type: "icu", status: "available", dailyRate: 1200 },
  { id: "bed-016", ward: "NICU", bedNumber: "NICU-01", type: "nicu", status: "available", dailyRate: 1500 },
  { id: "bed-017", ward: "NICU", bedNumber: "NICU-02", type: "nicu", status: "available", dailyRate: 1500 },
  { id: "bed-018", ward: "Surgical Ward", bedNumber: "SW-01", type: "general", status: "available", dailyRate: 200 },
  { id: "bed-019", ward: "Surgical Ward", bedNumber: "SW-02", type: "general", status: "available", dailyRate: 200 },
  { id: "bed-020", ward: "Surgical Ward", bedNumber: "SW-03", type: "general", status: "occupied", patientId: "pat-011", dailyRate: 200 },
]

// ===== Audit Logs =====
export const auditLogs: AuditLog[] = [
  { id: "log-001", userId: "usr-001", userName: "Dr. Admin User", userRole: "admin", action: "CREATE", module: "Patients", details: "Registered new patient: Mia Lewis (PAT-0014)", timestamp: "2025-01-15T10:30:00Z", ipAddress: "192.168.1.10" },
  { id: "log-002", userId: "usr-002", userName: "Dr. Sarah Chen", userRole: "doctor", action: "CREATE", module: "Prescriptions", details: "Created prescription PRX-0001 for John Doe", timestamp: "2026-02-15T11:00:00Z", ipAddress: "192.168.1.22" },
  { id: "log-003", userId: "usr-005", userName: "Mark Thompson", userRole: "pharmacist", action: "UPDATE", module: "Pharmacy", details: "Dispensed prescription PRX-0001 for John Doe", timestamp: "2026-02-15T14:30:00Z", ipAddress: "192.168.1.35" },
  { id: "log-004", userId: "usr-007", userName: "Rachel Adams", userRole: "receptionist", action: "CREATE", module: "Appointments", details: "Booked appointment APT-0001 for John Doe with Dr. Sarah Chen", timestamp: "2026-02-18T09:15:00Z", ipAddress: "192.168.1.40" },
  { id: "log-005", userId: "usr-006", userName: "Linda Nguyen", userRole: "lab_tech", action: "UPDATE", module: "Laboratory", details: "Completed lab test LAB-0001 (CBC) for John Doe", timestamp: "2026-02-16T16:45:00Z", ipAddress: "192.168.1.50" },
  { id: "log-006", userId: "usr-008", userName: "David Kim", userRole: "accountant", action: "CREATE", module: "Billing", details: "Generated invoice INV-0001 for John Doe - $372.16", timestamp: "2026-02-15T15:00:00Z", ipAddress: "192.168.1.55" },
  { id: "log-007", userId: "usr-001", userName: "Dr. Admin User", userRole: "admin", action: "UPDATE", module: "Settings", details: "Updated hospital tax rate to 8.5%", timestamp: "2026-02-10T08:00:00Z", ipAddress: "192.168.1.10" },
  { id: "log-008", userId: "usr-002", userName: "Dr. Sarah Chen", userRole: "doctor", action: "CREATE", module: "Lab Orders", details: "Ordered ECG for Alexander Walker", timestamp: "2026-02-21T09:30:00Z", ipAddress: "192.168.1.22" },
  { id: "log-009", userId: "usr-001", userName: "Dr. Admin User", userRole: "admin", action: "CREATE", module: "Users", details: "Created new user account for David Kim (Accountant)", timestamp: "2024-05-01T09:00:00Z", ipAddress: "192.168.1.10" },
  { id: "log-010", userId: "usr-004", userName: "Nurse Emily Park", userRole: "nurse", action: "UPDATE", module: "IPD", details: "Added nursing note for Benjamin Anderson (IPD-0001)", timestamp: "2026-02-21T06:00:00Z", ipAddress: "192.168.1.60" },
]

// ===== Accounts =====
export const accountEntries: AccountEntry[] = [
  { id: "acc-001", date: "2026-02-15", type: "income", category: "Consultation", description: "Consultation fees - 8 patients", amount: 1680, paymentMethod: "Mixed" },
  { id: "acc-002", date: "2026-02-15", type: "income", category: "Pharmacy", description: "Pharmacy sales", amount: 450, paymentMethod: "Mixed" },
  { id: "acc-003", date: "2026-02-15", type: "income", category: "Laboratory", description: "Lab test charges", amount: 890, paymentMethod: "Mixed" },
  { id: "acc-004", date: "2026-02-15", type: "expense", category: "Salaries", description: "Staff payroll - February", amount: 45000, paymentMethod: "Bank Transfer" },
  { id: "acc-005", date: "2026-02-16", type: "income", category: "Consultation", description: "Consultation fees - 6 patients", amount: 1350, paymentMethod: "Mixed" },
  { id: "acc-006", date: "2026-02-16", type: "expense", category: "Supplies", description: "Medical supplies restock", amount: 3200, paymentMethod: "Bank Transfer" },
  { id: "acc-007", date: "2026-02-17", type: "income", category: "IPD", description: "IPD room charges", amount: 2800, paymentMethod: "Mixed" },
  { id: "acc-008", date: "2026-02-18", type: "income", category: "Consultation", description: "Consultation fees - 10 patients", amount: 2100, paymentMethod: "Mixed" },
  { id: "acc-009", date: "2026-02-18", type: "expense", category: "Utilities", description: "Electricity and water bill", amount: 1800, paymentMethod: "Bank Transfer" },
  { id: "acc-010", date: "2026-02-19", type: "income", category: "Laboratory", description: "MRI and lab charges", amount: 1580, paymentMethod: "Mixed" },
  { id: "acc-011", date: "2026-02-19", type: "expense", category: "Maintenance", description: "Equipment maintenance", amount: 950, paymentMethod: "Cash" },
  { id: "acc-012", date: "2026-02-20", type: "income", category: "Consultation", description: "Consultation fees - 12 patients", amount: 2650, paymentMethod: "Mixed" },
  { id: "acc-013", date: "2026-02-20", type: "income", category: "Pharmacy", description: "Pharmacy sales", amount: 680, paymentMethod: "Mixed" },
  { id: "acc-014", date: "2026-02-21", type: "income", category: "Consultation", description: "Consultation fees - 9 patients", amount: 1875, paymentMethod: "Mixed" },
  { id: "acc-015", date: "2026-02-21", type: "expense", category: "Supplies", description: "Lab reagents purchase", amount: 2400, paymentMethod: "Bank Transfer" },
]
