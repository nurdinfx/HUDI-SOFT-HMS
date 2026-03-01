/**
 * lib/api.ts
 * Centralized API client for the Hospital Management backend.
 * Base URL: http://localhost:4000/api
 */

const API_BASE = '/api';

// ─── Token management ────────────────────────────────────────────
function getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('hms_token');
}

export function setToken(token: string) {
    if (typeof window !== 'undefined') localStorage.setItem('hms_token', token);
}

export function clearToken() {
    if (typeof window !== 'undefined') localStorage.removeItem('hms_token');
}

// ─── Core fetch wrapper ──────────────────────────────────────────
async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = getToken();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        if (res.status === 401) clearToken();
        throw new Error(data.error || data.message || `Request failed: ${res.status}`);
    }
    return data as T;
}

const get = <T>(path: string) => apiFetch<T>(path);
const post = <T>(path: string, body: unknown) => apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) });
const put = <T>(path: string, body: unknown) => apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(body) });
const del = <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' });

// ─── Auth ────────────────────────────────────────────────────────
export const authApi = {
    login: (email: string, password: string) => post<{ token: string; user: User }>('/auth/login', { email, password }),
    me: () => get<User>('/auth/me'),
    logout: () => post('/auth/logout', {}),
};

// ─── Dashboard ───────────────────────────────────────────────────
export const dashboardApi = {
    getStats: () => get<DashboardData>('/dashboard'),
};

// ─── Patients ────────────────────────────────────────────────────
export const patientsApi = {
    getAll: (params?: QueryParams) => get<Patient[]>(`/patients${toQuery(params)}`),
    getById: (id: string) => get<Patient>(`/patients/${id}`),
    create: (data: Partial<Patient>) => post<Patient>('/patients', data),
    update: (id: string, data: Partial<Patient>) => put<Patient>(`/patients/${id}`, data),
    delete: (id: string) => del(`/patients/${id}`),
};

// ─── Doctors ─────────────────────────────────────────────────────
export const doctorsApi = {
    getAll: (params?: QueryParams) => get<Doctor[]>(`/doctors${toQuery(params)}`),
    getById: (id: string) => get<Doctor>(`/doctors/${id}`),
    getStats: () => get<DoctorStats>('/doctors/stats'),
    getPerformance: (id: string) => get<DoctorPerformance>(`/doctors/${id}/performance`),
    create: (data: Partial<Doctor>) => post<Doctor>('/doctors', data),
    update: (id: string, data: Partial<Doctor>) => put<Doctor>(`/doctors/${id}`, data),
    delete: (id: string) => del(`/doctors/${id}`),
};

// ─── Appointments ────────────────────────────────────────────────
export const appointmentsApi = {
    getAll: (params?: QueryParams) => get<Appointment[]>(`/appointments${toQuery(params)}`),
    getById: (id: string) => get<Appointment>(`/appointments/${id}`),
    create: (data: Partial<Appointment>) => post<Appointment>('/appointments', data),
    update: (id: string, data: Partial<Appointment>) => put<Appointment>(`/appointments/${id}`, data),
    delete: (id: string) => del(`/appointments/${id}`),
};

// ─── Pharmacy ────────────────────────────────────────────────────
export const pharmacyApi = {
    getMedicines: (params?: QueryParams) => get<Medicine[]>(`/pharmacy/medicines${toQuery(params)}`),
    getExpiring: () => get<Medicine[]>('/pharmacy/medicines/expiring'),
    getLowStock: () => get<Medicine[]>('/pharmacy/medicines/low-stock'),
    getMedicine: (id: string) => get<Medicine>(`/pharmacy/medicines/${id}`),
    createMedicine: (data: Partial<Medicine>) => post<Medicine>('/pharmacy/medicines', data),
    updateMedicine: (id: string, data: Partial<Medicine>) => put<Medicine>(`/pharmacy/medicines/${id}`, data),
    deleteMedicine: (id: string) => del(`/pharmacy/medicines/${id}`),
    getPrescriptions: (params?: QueryParams) => get<Prescription[]>(`/pharmacy/prescriptions${toQuery(params)}`),
    createPrescription: (data: Partial<Prescription>) => post<Prescription>('/pharmacy/prescriptions', data),
    updatePrescription: (id: string, data: Partial<Prescription>) => put<Prescription>(`/pharmacy/prescriptions/${id}`, data),
    dispense: (id: string) => put<{ message: string; rxId: string; invoiceId: string }>(`/pharmacy/prescriptions/${id}/dispense`, {}),
};

// ─── Laboratory ──────────────────────────────────────────────────
export const laboratoryApi = {
    getAll: (params?: QueryParams) => get<LabTest[]>(`/laboratory${toQuery(params)}`),
    getById: (id: string) => get<LabTest>(`/laboratory/${id}`),
    getCatalog: () => get<LabCatalogItem[]>('/laboratory/catalog'),
    getStats: () => get<LabStats>('/laboratory/stats'),
    create: (data: Partial<LabTest>) => post<LabTest>('/laboratory', data),
    update: (id: string, data: Partial<LabTest>) => put<LabTest>(`/laboratory/${id}`, data),
    delete: (id: string) => del(`/laboratory/${id}`),
    collectSample: (id: string, data: { collectedBy: string; barcode: string }) => put<LabTest>(`/laboratory/${id}/collect`, data),
    createCatalogItem: (data: Partial<LabCatalogItem>) => post<LabCatalogItem>('/laboratory/catalog', data),
    updateCatalogItem: (id: string, data: Partial<LabCatalogItem>) => put<LabCatalogItem>(`/laboratory/catalog/${id}`, data),
    deleteCatalogItem: (id: string) => del(`/laboratory/catalog/${id}`),
};

// ─── Billing ─────────────────────────────────────────────────────
export const billingApi = {
    getAll: (params?: QueryParams) => get<Invoice[]>(`/billing${toQuery(params)}`),
    getById: (id: string) => get<Invoice>(`/billing/${id}`),
    create: (data: Partial<Invoice>) => post<Invoice>('/billing', data),
    update: (id: string, data: Partial<Invoice>) => put<Invoice>(`/billing/${id}`, data),
    delete: (id: string) => del(`/billing/${id}`),
};

// ─── OPD ─────────────────────────────────────────────────────────
export const opdApi = {
    getAll: (params?: QueryParams) => get<OPDVisit[]>(`/opd${toQuery(params)}`),
    getById: (id: string) => get<OPDVisit>(`/opd/${id}`),
    getStats: () => get<OPDAnalytics>('/opd/stats'),
    getPatientSummary: (id: string) => get<PatientSummary>(`/opd/${id}/patient-summary`),
    create: (data: Partial<OPDVisit>) => post<OPDVisit>('/opd', data),
    update: (id: string, data: Partial<OPDVisit>) => put<OPDVisit>(`/opd/${id}`, data),
    saveConsultation: (id: string, data: Partial<OPDVisit> & { completeVisit?: boolean; medications?: PrescriptionMedicine[] }) => put<OPDVisit>(`/opd/${id}/consultation`, data),
    delete: (id: string) => del(`/opd/${id}`),
};

// ─── IPD ─────────────────────────────────────────────────────────
export const ipdApi = {
    getAdmissions: (params?: QueryParams) => get<IPDAdmission[]>(`/ipd/admissions${toQuery(params)}`),
    createAdmission: (data: Partial<IPDAdmission>) => post<IPDAdmission>('/ipd/admissions', data),
    updateAdmission: (id: string, data: Partial<IPDAdmission>) => put<IPDAdmission>(`/ipd/admissions/${id}`, data),
    getBeds: (params?: QueryParams) => get<Bed[]>(`/ipd/beds${toQuery(params)}`),
    createBed: (data: Partial<Bed>) => post<Bed>('/ipd/beds', data),
    updateBed: (id: string, data: Partial<Bed>) => put<Bed>(`/ipd/beds/${id}`, data),
    deleteBed: (id: string) => del(`/ipd/beds/${id}`),
    getWards: () => get<Ward[]>('/ipd/wards'),
    createWard: (data: Partial<Ward>) => post<Ward>('/ipd/wards', data),
    getNurseNotes: (admissionId: string) => get<NurseNote[]>(`/ipd/nurse-notes/${admissionId}`),
    createNurseNote: (data: Partial<NurseNote>) => post<NurseNote>('/ipd/nurse-notes', data),
    getDoctorRounds: (admissionId: string) => get<DoctorRound[]>(`/ipd/doctor-rounds/${admissionId}`),
    createDoctorRound: (data: Partial<DoctorRound>) => post<DoctorRound>('/ipd/doctor-rounds', data),
    getAnalytics: () => get<IPDAnalytics>('/ipd/analytics'),
};

// ─── Insurance ───────────────────────────────────────────────────
export const insuranceApi = {
    getCompanies: () => get<InsuranceCompany[]>('/insurance/companies'),
    createCompany: (data: Partial<InsuranceCompany>) => post<InsuranceCompany>('/insurance/companies', data),
    updateCompany: (id: string, data: Partial<InsuranceCompany>) => put<InsuranceCompany>(`/insurance/companies/${id}`, data),
    deleteCompany: (id: string) => del(`/insurance/companies/${id}`),
    getPolicies: (patientId?: string) => get<InsurancePolicy[]>(`/insurance/policies${patientId ? `?patientId=${patientId}` : ''}`),
    createPolicy: (data: Partial<InsurancePolicy>) => post<InsurancePolicy>('/insurance/policies', data),
    deletePolicy: (id: string) => del(`/insurance/policies/${id}`),
    getClaims: (params?: QueryParams) => get<InsuranceClaim[]>(`/insurance/claims${toQuery(params)}`),
    createClaim: (data: Partial<InsuranceClaim>) => post<InsuranceClaim>('/insurance/claims', data),
    updateClaim: (id: string, data: Partial<InsuranceClaim>) => put<InsuranceClaim>(`/insurance/claims/${id}`, data),
};

// ─── Users ───────────────────────────────────────────────────────
export const usersApi = {
    getAll: (params?: QueryParams) => get<User[]>(`/users${toQuery(params)}`),
    getById: (id: string) => get<User>(`/users/${id}`),
    create: (data: Partial<User> & { password: string }) => post<User>('/users', data),
    update: (id: string, data: Partial<User> & { password?: string }) => put<User>(`/users/${id}`, data),
    delete: (id: string) => del(`/users/${id}`),
};

// ─── Inventory ───────────────────────────────────────────────────
export const inventoryApi = {
    getAll: (params?: QueryParams) => get<InventoryItem[]>(`/inventory${toQuery(params)}`),
    getById: (id: string) => get<InventoryItem>(`/inventory/${id}`),
    create: (data: Partial<InventoryItem>) => post<InventoryItem>('/inventory', data),
    update: (id: string, data: Partial<InventoryItem>) => put<InventoryItem>(`/inventory/${id}`, data),
    delete: (id: string) => del(`/inventory/${id}`),
};

// ─── Accounts ────────────────────────────────────────────────────
export const accountsApi = {
    getAll: (params?: QueryParams) => get<AccountEntry[]>(`/accounts${toQuery(params)}`),
    getSummary: () => get<AccountsSummary>(`/accounts/summary`),
    getCashFlow: () => get<CashFlowEntry[]>(`/accounts/analytics/cashflow`),
    getBudgets: () => get<DepartmentBudget[]>(`/accounts/budgets`),
    updateBudget: (data: { department: string; budgetAmount: number; period?: string }) => post<{ message: string }>('/accounts/budgets', data),
    create: (data: Partial<AccountEntry>) => post<AccountEntry>('/accounts', data),
    update: (id: string, data: Partial<AccountEntry>) => put<AccountEntry>(`/accounts/${id}`, data),
    delete: (id: string) => del(`/accounts/${id}`),
};

// ─── Audit Logs ──────────────────────────────────────────────────
export const auditApi = {
    getAll: (params?: QueryParams) => get<AuditLog[]>(`/audit${toQuery(params)}`),
};

// ─── Reports ─────────────────────────────────────────────────────
export const reportsApi = {
    getRevenue: (params?: QueryParams) => get<unknown[]>(`/reports/revenue${toQuery(params)}`),
    getPatients: () => get<unknown>('/reports/patients'),
    getAppointments: () => get<unknown>('/reports/appointments'),
    getLaboratory: () => get<unknown>('/reports/laboratory'),
    getPharmacy: () => get<unknown>('/reports/pharmacy'),
};

// ─── Settings ────────────────────────────────────────────────────
export const settingsApi = {
    get: () => get<HospitalSettings>('/settings'),
    update: (data: Partial<HospitalSettings>) => put<HospitalSettings>('/settings', data),
};

// ─── Helpers ─────────────────────────────────────────────────────
type QueryParams = Record<string, string | number | boolean | undefined>;

function toQuery(params?: QueryParams): string {
    if (!params) return '';
    const filtered = Object.entries(params).filter(([, v]) => v !== undefined && v !== '');
    if (filtered.length === 0) return '';
    return '?' + new URLSearchParams(filtered.map(([k, v]) => [k, String(v)])).toString();
}

// ─── Types (mirror backend schema) ───────────────────────────────
export type UserRole = 'admin' | 'doctor' | 'nurse' | 'pharmacist' | 'lab_tech' | 'receptionist' | 'accountant';

export interface User {
    id: string; name: string; email: string; role: UserRole;
    phone: string; department?: string; avatar?: string;
    isActive: boolean; createdAt: string;
}

export interface Patient {
    id: string; patientId: string; firstName: string; lastName: string;
    dateOfBirth: string; gender: string; bloodGroup: string;
    phone: string; email: string; address: string; city: string;
    emergencyContact: string; emergencyPhone: string;
    insuranceProvider?: string; insurancePolicyNumber?: string;
    allergies: string[]; chronicConditions: string[];
    status: string; registeredAt: string; lastVisit?: string; notes?: string;
}

export interface Doctor {
    id: string; doctorId: string; name: string; email: string; phone: string;
    specialization: string; department: string; qualification: string;
    experience: number; consultationFee: number; availableDays: string[];
    availableTimeStart: string; availableTimeEnd: string;
    status: string; avatar?: string; joinedAt: string;
}

export interface DoctorStats {
    totalDoctors: number;
    availableNow: number;
    departmentBreakdown: { department: string; count: number }[];
    onLeave: number;
}

export interface DoctorPerformance {
    doctorName: string;
    totalAppointments: number;
    opdVisits: number;
    ipdAdmissions: number;
    estimatedRevenue: number;
}

export interface Appointment {
    id: string; appointmentId: string; patientId: string; patientName: string;
    doctorId: string; doctorName: string; department: string;
    date: string; time: string; type: string; status: string;
    notes?: string; createdAt: string;
}

export interface Medicine {
    id: string; name: string; genericName: string; category: string;
    manufacturer: string; batchNumber: string; expiryDate: string;
    quantity: number; reorderLevel: number; unitPrice: number;
    sellingPrice: number; unit: string; status: string;
}

export interface Prescription {
    id: string; prescriptionId: string; patientId: string; patientName: string;
    doctorId: string; doctorName: string; appointmentId?: string;
    date: string; diagnosis: string; medicines: PrescriptionMedicine[];
    notes?: string; status: string;
}

export interface PrescriptionMedicine {
    medicineId: string; medicineName: string; dosage: string;
    frequency: string; duration: string; quantity: number; instructions?: string;
}

export interface LabTest {
    id: string; testId: string; patientId: string; patientName: string;
    doctorId: string; doctorName: string; testName: string; testCategory: string;
    sampleType: string; priority: string; status: string;
    orderedAt: string; completedAt?: string; results?: string;
    normalRange?: string; reportUrl?: string; cost: number;
    sampleCollectedAt?: string; sampleCollectedBy?: string; sampleBarcode?: string;
    criticalFlag?: boolean; technicianId?: string; clinicalNotes?: string;
    isBilled?: boolean; invoiceId?: string;
    admissionId?: string; orderedBy?: string;
    resultEnteredBy?: string; resultEnteredAt?: string;
    ward?: string; bedNumber?: string;
}

export interface LabStats {
    totalToday: number;
    pending: number;
    inProgress: number;
    completed: number;
    critical: number;
    revenueToday: number;
}

export interface LabCatalogItem {
    id: string; name: string; category: string;
    sampleType: string; normalRange: string; cost: number;
}

export interface Invoice {
    id: string; invoiceId: string; patientId: string; patientName: string;
    date: string; dueDate: string; items: InvoiceItem[];
    subtotal: number; tax: number; discount: number; total: number;
    paidAmount: number; status: string; paymentMethod?: string;
    insuranceClaim?: string; notes?: string;
}

export interface InvoiceItem {
    description: string; category: string; quantity: number;
    unitPrice: number; total: number;
}

export interface OPDVisit {
    id: string; visitId: string; patientId: string; patientName: string;
    doctorId: string; doctorName: string; department: string;
    date: string; time: string; chiefComplaint: string;
    historyIllness?: string; pastHistory?: string; familyHistory?: string;
    physicalExamination?: string; clinicalNotes?: string;
    vitals: Record<string, unknown>; diagnosis?: string;
    status: string; tokenNumber: number;
    visitType: 'New' | 'Follow-Up' | 'Emergency';
    medications?: PrescriptionMedicine[];
}

export interface PatientSummary {
    allergies: string[];
    chronicConditions: string[];
    previousVisitCount: number;
}

export interface OPDAnalytics {
    todayVisits: number;
    waitingCount: number;
    consultingCount: number;
    completedCount: number;
    dailyRevenue: number;
    departmentStats: { department: string; count: number }[];
    queueStatus: { visitId: string; patientName: string; token: number; status: string }[];
}

export interface IPDAdmission {
    id: string; admissionId: string; patientId: string; patientName: string;
    doctorId: string; doctorName: string; department: string;
    ward: string; bedNumber: string; admissionDate: string;
    dischargeDate?: string; diagnosis: string; status: string;
    nursingNotes: string[];
}

export interface Bed {
    id: string; ward: string; bedNumber: string; type: string;
    status: string; patientId?: string; dailyRate: number;
    wardId?: string;
}

export interface Ward {
    id: string; name: string; type: string; department: string;
    totalBeds: number; dailyRate: number; createdAt: string;
}

export interface NurseNote {
    id: string; admissionId: string; patientId: string; patientName: string;
    nurseId: string; nurseName: string; vitals: Record<string, any>;
    observations: string; medications: any[];
    shift: string; createdAt: string;
}

export interface DoctorRound {
    id: string; admissionId: string; patientId: string; patientName: string;
    doctorId: string; doctorName: string; observations: string;
    treatmentUpdates: string; procedureOrders: any[];
    medications?: PrescriptionMedicine[];
    timestamp: string;
}

export interface IPDAnalytics {
    occupancyRate: string;
    averageStayDays: string;
    departmentAdmissions: { department: string; count: number }[];
    wardCurrentUsage: { ward: string; count: number }[];
    totalBeds: number;
    occupiedBeds: number;
}

export interface InsuranceCompany {
    id: string; name: string; contactPerson: string;
    phone: string; email: string; address: string; status: string;
}

export interface InsurancePolicy {
    id: string;
    patientId: string;
    companyId: string;
    companyName: string;
    policyNumber: string;
    coverageType: 'full' | 'partial' | 'co-pay';
    coverageLimit: number;
    balanceRemaining: number;
    coPayPercent: number;
    expiry_date?: string;
    status: 'active' | 'expired' | 'inactive';
    createdAt: string;
}

export interface InsuranceClaim {
    id: string;
    claimId: string;
    patientId: string;
    patientName: string;
    insuranceCompany: string;
    policyNumber: string;
    invoiceId: string;
    claimAmount: number;
    approvedAmount?: number;
    status: 'submitted' | 'under-review' | 'approved' | 'rejected' | 'settled';
    submittedAt: string;
    settledAt?: string;
    policyId?: string;
}

export interface InventoryItem {
    id: string; itemId: string; name: string; category: string;
    description?: string; quantity: number; unit: string;
    reorderLevel: number; unitCost: number; supplier?: string;
    lastRestocked?: string; status: string;
}

export interface AccountEntry {
    id: string; date: string; type: 'income' | 'expense'; category: string;
    description: string; amount: number; paymentMethod: string; referenceId?: string;
    department: string; status: 'completed' | 'pending' | 'cancelled'; userId?: string;
}

export interface AccountsSummary {
    totalIncome: number;
    totalExpense: number;
    profit: number;
    incomeToday: number;
    incomeMonth: number;
    departmentRevenue: { department: string; amount: number }[];
    paymentModeRevenue: { method: string; amount: number }[];
    recentEntries: AccountEntry[];
}

export interface DepartmentBudget {
    id: string;
    department: string;
    budget_amount: number;
    period: string;
}

export interface CashFlowEntry {
    month: string;
    income: number;
    expense: number;
}

export interface AccountsResponse {
    entries: AccountEntry[];
    summary: { totalIncome: number; totalExpense: number; profit: number };
}

export interface AuditLog {
    id: string; userId: string; userName: string; userRole: string;
    action: string; module: string; details: string;
    timestamp: string; ipAddress: string;
}

export interface HospitalSettings {
    name: string; tagline: string; address: string; phone: string;
    email: string; website: string; currency: string; taxRate: number; logo?: string;
}

export interface DashboardData {
    stats: {
        totalPatients: number; activePatients: number; todayAppointments: number;
        admittedPatients: number; availableDoctors: number; totalDoctors: number;
        pendingLabTests: number; lowStockMedicines: number; pendingBills: number;
        totalRevenue: number; monthRevenue: number; availableBeds: number; totalBeds: number;
    };
    recentAppointments: Appointment[];
    revenueByMonth: { month: string; revenue: number; count: number }[];
    apptByStatus: { status: string; count: number }[];
    topDepartments: { department: string; count: number }[];
}
