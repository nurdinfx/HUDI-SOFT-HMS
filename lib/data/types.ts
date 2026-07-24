// ===== Hospital Management System - Type Definitions =====

export type UserRole = "admin" | "doctor" | "nurse" | "pharmacist" | "lab_tech" | "receptionist" | "accountant"

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  phone: string
  avatar?: string
  department?: string
  isActive: boolean
  createdAt: string
}

export interface Patient {
  id: string
  patientId: string // e.g., "PAT-0001"
  firstName: string
  lastName: string
  dateOfBirth: string
  gender: "male" | "female" | "other"
  bloodGroup: string
  phone: string
  email: string
  address: string
  city: string
  emergencyContact: string
  emergencyPhone: string
  insuranceProvider?: string
  insurancePolicyNumber?: string
  status: "active" | "inactive" | "deceased"
  registeredAt: string
  lastVisit?: string
  notes?: string
}

export interface Doctor {
  id: string
  doctorId: string // e.g., "DOC-001"
  name: string
  email: string
  phone: string
  specialization: string
  department: string
  qualification: string
  experience: number // years
  consultationFee: number
  availableDays: string[]
  availableTimeStart: string
  availableTimeEnd: string
  status: "available" | "on-leave" | "busy"
  avatar?: string
  joinedAt: string
}

export interface Appointment {
  id: string
  appointmentId: string
  patientId: string
  patientName: string
  doctorId: string
  doctorName: string
  department: string
  date: string
  time: string
  type: "consultation" | "follow-up" | "emergency" | "routine-checkup"
  status: "scheduled" | "in-progress" | "completed" | "cancelled" | "no-show"
  notes?: string
  createdAt: string
}

export interface Prescription {
  id: string
  prescriptionId: string
  patientId: string
  patientName: string
  doctorId: string
  doctorName: string
  appointmentId?: string
  date: string
  diagnosis: string
  medicines: PrescriptionMedicine[]
  notes?: string
  status: "pending" | "dispensed" | "partially-dispensed"
}

export interface PrescriptionMedicine {
  medicineId: string
  medicineName: string
  dosage: string
  frequency: string
  duration: string
  quantity: number
  instructions?: string
}

export interface LabTest {
  id: string
  testId: string
  patientId: string
  patientName: string
  doctorId: string
  doctorName: string
  testName: string
  testCategory: string
  sampleType: string
  priority: "normal" | "urgent" | "critical"
  status: "ordered" | "sample-collected" | "in-progress" | "completed" | "cancelled"
  orderedAt: string
  completedAt?: string
  results?: string
  normalRange?: string
  reportUrl?: string
  cost: number
}

export interface Invoice {
  id: string
  invoiceId: string
  patientId: string
  patientName: string
  date: string
  dueDate: string
  items: InvoiceItem[]
  subtotal: number
  tax: number
  discount: number
  total: number
  paidAmount: number
  status: "paid" | "partial" | "unpaid" | "overdue"
  paymentMethod?: "cash" | "card" | "insurance" | "online"
  insuranceClaim?: string
  notes?: string
}

export interface InvoiceItem {
  description: string
  category: "consultation" | "pharmacy" | "laboratory" | "room" | "procedure" | "other"
  quantity: number
  unitPrice: number
  total: number
}

export interface Medicine {
  id: string
  name: string
  genericName: string
  category: string
  manufacturer: string
  batchNumber: string
  expiryDate: string
  quantity: number
  reorderLevel: number
  unitPrice: number
  sellingPrice: number
  unit: string
  status: "in-stock" | "low-stock" | "out-of-stock" | "expired"
}

export interface InsuranceCompany {
  id: string
  name: string
  contactPerson: string
  phone: string
  email: string
  address: string
  status: "active" | "inactive"
}

export interface InsuranceClaim {
  id: string
  claimId: string
  patientId: string
  patientName: string
  insuranceCompany: string
  policyNumber: string
  invoiceId: string
  claimAmount: number
  approvedAmount?: number
  status: "submitted" | "under-review" | "approved" | "rejected" | "settled"
  submittedAt: string
  settledAt?: string
}

export interface OPDVisit {
  id: string
  visitId: string
  patientId: string
  patientName: string
  doctorId: string
  doctorName: string
  department: string
  date: string
  time: string
  chiefComplaint: string
  vitals: {
    bloodPressure: string
    pulse: number
    temperature: number
    weight: number
    height: number
    spo2: number
  }
  diagnosis?: string
  status: "waiting" | "in-consultation" | "completed"
  tokenNumber: number
}

export interface IPDAdmission {
  id: string
  admissionId: string
  patientId: string
  patientName: string
  doctorId: string
  doctorName: string
  department: string
  ward: string
  bedNumber: string
  admissionDate: string
  dischargeDate?: string
  diagnosis: string
  status: "admitted" | "discharged" | "transferred"
  nursingNotes: string[]
}

export interface Bed {
  id: string
  ward: string
  bedNumber: string
  type: "general" | "semi-private" | "private" | "icu" | "nicu"
  status: "available" | "occupied" | "maintenance" | "reserved"
  patientId?: string
  dailyRate: number
}

export interface AuditLog {
  id: string
  userId: string
  userName: string
  userRole: UserRole
  action: string
  module: string
  details: string
  timestamp: string
  ipAddress: string
}

export interface AccountEntry {
  id: string
  date: string
  type: "income" | "expense"
  category: string
  description: string
  amount: number
  paymentMethod: string
  referenceId?: string
}

export interface HospitalSettings {
  name: string
  tagline: string
  address: string
  phone: string
  email: string
  website: string
  currency: string
  taxRate: number
  logo?: string
}
