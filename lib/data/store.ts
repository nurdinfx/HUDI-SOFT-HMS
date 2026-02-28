import type {
  Patient, Doctor, Appointment, Prescription, LabTest,
  Invoice, Medicine, InsuranceCompany, InsuranceClaim,
  OPDVisit, IPDAdmission, Bed, AuditLog, AccountEntry,
  HospitalSettings, User
} from "./types"

import * as seed from "./seed"

// In-memory data store singleton
class DataStore {
  patients: Patient[]
  doctors: Doctor[]
  appointments: Appointment[]
  prescriptions: Prescription[]
  labTests: LabTest[]
  invoices: Invoice[]
  medicines: Medicine[]
  insuranceCompanies: InsuranceCompany[]
  insuranceClaims: InsuranceClaim[]
  opdVisits: OPDVisit[]
  ipdAdmissions: IPDAdmission[]
  beds: Bed[]
  auditLogs: AuditLog[]
  accountEntries: AccountEntry[]
  users: User[]
  hospitalSettings: HospitalSettings

  constructor() {
    this.patients = [...seed.patients]
    this.doctors = [...seed.doctors]
    this.appointments = [...seed.appointments]
    this.prescriptions = [...seed.prescriptions]
    this.labTests = [...seed.labTests]
    this.invoices = [...seed.invoices]
    this.medicines = [...seed.medicines]
    this.insuranceCompanies = [...seed.insuranceCompanies]
    this.insuranceClaims = [...seed.insuranceClaims]
    this.opdVisits = [...seed.opdVisits]
    this.ipdAdmissions = [...seed.ipdAdmissions]
    this.beds = [...seed.beds]
    this.auditLogs = [...seed.auditLogs]
    this.accountEntries = [...seed.accountEntries]
    this.users = [...seed.users]
    this.hospitalSettings = { ...seed.hospitalSettings }
  }

  // --- Generic CRUD helpers ---
  private findIndex<T extends { id: string }>(collection: T[], id: string) {
    return collection.findIndex((item) => item.id === id)
  }

  // --- Patients ---
  getPatients() { return this.patients }
  getPatient(id: string) { return this.patients.find((p) => p.id === id) }
  addPatient(patient: Patient) { this.patients.push(patient); return patient }
  updatePatient(id: string, data: Partial<Patient>) {
    const idx = this.findIndex(this.patients, id)
    if (idx !== -1) { this.patients[idx] = { ...this.patients[idx], ...data }; return this.patients[idx] }
    return null
  }
  deletePatient(id: string) {
    const idx = this.findIndex(this.patients, id)
    if (idx !== -1) { return this.patients.splice(idx, 1)[0] }
    return null
  }

  // --- Doctors ---
  getDoctors() { return this.doctors }
  getDoctor(id: string) { return this.doctors.find((d) => d.id === id) }
  addDoctor(doctor: Doctor) { this.doctors.push(doctor); return doctor }
  updateDoctor(id: string, data: Partial<Doctor>) {
    const idx = this.findIndex(this.doctors, id)
    if (idx !== -1) { this.doctors[idx] = { ...this.doctors[idx], ...data }; return this.doctors[idx] }
    return null
  }

  // --- Appointments ---
  getAppointments() { return this.appointments }
  getAppointment(id: string) { return this.appointments.find((a) => a.id === id) }
  addAppointment(appointment: Appointment) { this.appointments.push(appointment); return appointment }
  updateAppointment(id: string, data: Partial<Appointment>) {
    const idx = this.findIndex(this.appointments, id)
    if (idx !== -1) { this.appointments[idx] = { ...this.appointments[idx], ...data }; return this.appointments[idx] }
    return null
  }

  // --- Prescriptions ---
  getPrescriptions() { return this.prescriptions }
  getPrescription(id: string) { return this.prescriptions.find((p) => p.id === id) }
  addPrescription(prescription: Prescription) { this.prescriptions.push(prescription); return prescription }
  updatePrescription(id: string, data: Partial<Prescription>) {
    const idx = this.findIndex(this.prescriptions, id)
    if (idx !== -1) { this.prescriptions[idx] = { ...this.prescriptions[idx], ...data }; return this.prescriptions[idx] }
    return null
  }

  // --- Lab Tests ---
  getLabTests() { return this.labTests }
  getLabTest(id: string) { return this.labTests.find((l) => l.id === id) }
  addLabTest(labTest: LabTest) { this.labTests.push(labTest); return labTest }
  updateLabTest(id: string, data: Partial<LabTest>) {
    const idx = this.findIndex(this.labTests, id)
    if (idx !== -1) { this.labTests[idx] = { ...this.labTests[idx], ...data }; return this.labTests[idx] }
    return null
  }

  // --- Invoices ---
  getInvoices() { return this.invoices }
  getInvoice(id: string) { return this.invoices.find((i) => i.id === id) }
  addInvoice(invoice: Invoice) { this.invoices.push(invoice); return invoice }
  updateInvoice(id: string, data: Partial<Invoice>) {
    const idx = this.findIndex(this.invoices, id)
    if (idx !== -1) { this.invoices[idx] = { ...this.invoices[idx], ...data }; return this.invoices[idx] }
    return null
  }

  // --- Medicines ---
  getMedicines() { return this.medicines }
  getMedicine(id: string) { return this.medicines.find((m) => m.id === id) }
  addMedicine(medicine: Medicine) { this.medicines.push(medicine); return medicine }
  updateMedicine(id: string, data: Partial<Medicine>) {
    const idx = this.findIndex(this.medicines, id)
    if (idx !== -1) { this.medicines[idx] = { ...this.medicines[idx], ...data }; return this.medicines[idx] }
    return null
  }

  // --- Insurance ---
  getInsuranceCompanies() { return this.insuranceCompanies }
  getInsuranceClaims() { return this.insuranceClaims }
  addInsuranceClaim(claim: InsuranceClaim) { this.insuranceClaims.push(claim); return claim }
  updateInsuranceClaim(id: string, data: Partial<InsuranceClaim>) {
    const idx = this.findIndex(this.insuranceClaims, id)
    if (idx !== -1) { this.insuranceClaims[idx] = { ...this.insuranceClaims[idx], ...data }; return this.insuranceClaims[idx] }
    return null
  }

  // --- OPD ---
  getOPDVisits() { return this.opdVisits }
  addOPDVisit(visit: OPDVisit) { this.opdVisits.push(visit); return visit }
  updateOPDVisit(id: string, data: Partial<OPDVisit>) {
    const idx = this.findIndex(this.opdVisits, id)
    if (idx !== -1) { this.opdVisits[idx] = { ...this.opdVisits[idx], ...data }; return this.opdVisits[idx] }
    return null
  }

  // --- IPD ---
  getIPDAdmissions() { return this.ipdAdmissions }
  addIPDAdmission(admission: IPDAdmission) { this.ipdAdmissions.push(admission); return admission }
  updateIPDAdmission(id: string, data: Partial<IPDAdmission>) {
    const idx = this.findIndex(this.ipdAdmissions, id)
    if (idx !== -1) { this.ipdAdmissions[idx] = { ...this.ipdAdmissions[idx], ...data }; return this.ipdAdmissions[idx] }
    return null
  }

  // --- Beds ---
  getBeds() { return this.beds }
  updateBed(id: string, data: Partial<Bed>) {
    const idx = this.findIndex(this.beds, id)
    if (idx !== -1) { this.beds[idx] = { ...this.beds[idx], ...data }; return this.beds[idx] }
    return null
  }

  // --- Audit Logs ---
  getAuditLogs() { return this.auditLogs }
  addAuditLog(log: AuditLog) { this.auditLogs.unshift(log); return log }

  // --- Accounts ---
  getAccountEntries() { return this.accountEntries }
  addAccountEntry(entry: AccountEntry) { this.accountEntries.push(entry); return entry }

  // --- Users ---
  getUsers() { return this.users }
  getUser(id: string) { return this.users.find((u) => u.id === id) }
  getUserByEmail(email: string) { return this.users.find((u) => u.email === email) }
  addUser(user: User) { this.users.push(user); return user }
  updateUser(id: string, data: Partial<User>) {
    const idx = this.findIndex(this.users, id)
    if (idx !== -1) { this.users[idx] = { ...this.users[idx], ...data }; return this.users[idx] }
    return null
  }

  // --- Settings ---
  getSettings() { return this.hospitalSettings }
  updateSettings(data: Partial<HospitalSettings>) {
    this.hospitalSettings = { ...this.hospitalSettings, ...data }
    return this.hospitalSettings
  }

  // --- Dashboard Stats ---
  getDashboardStats() {
    const today = new Date().toISOString().split("T")[0]
    const todayAppointments = this.appointments.filter((a) => a.date === today)
    const admittedPatients = this.ipdAdmissions.filter((a) => a.status === "admitted")
    const pendingLabTests = this.labTests.filter((l) => l.status !== "completed" && l.status !== "cancelled")
    const lowStockMedicines = this.medicines.filter((m) => m.status === "low-stock" || m.status === "out-of-stock")
    const availableDoctors = this.doctors.filter((d) => d.status === "available")
    const unpaidInvoices = this.invoices.filter((i) => i.status === "unpaid" || i.status === "partial")
    const totalRevenue = this.invoices.reduce((sum, i) => sum + i.paidAmount, 0)

    return {
      totalPatients: this.patients.length,
      todayAppointments: todayAppointments.length,
      admittedPatients: admittedPatients.length,
      totalRevenue,
      pendingLabTests: pendingLabTests.length,
      lowStockMedicines: lowStockMedicines.length,
      availableDoctors: availableDoctors.length,
      pendingBills: unpaidInvoices.length,
    }
  }
}

// Singleton
const globalForStore = globalThis as unknown as { dataStore?: DataStore }
export const dataStore = globalForStore.dataStore ?? new DataStore()
if (process.env.NODE_ENV !== "production") globalForStore.dataStore = dataStore
