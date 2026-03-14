"use client"

import {
  Users,
  CalendarDays,
  BedDouble,
  DollarSign,
  FlaskConical,
  AlertTriangle,
  Stethoscope,
  Receipt,
  TrendingUp,
  TrendingDown,
  Clock,
  Search,
  History,
  History as HistoryIcon,
  UserPlus,
  AlertCircle,
  Wallet,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { StatusBadge } from "@/components/shared/status-badge"
import { RevenueChart } from "./revenue-chart"
import { AppointmentsPieChart } from "./appointments-pie-chart"
import type { Appointment, Patient, Doctor } from "@/lib/data/types"
import { dashboardApi, patientsApi, appointmentsApi, pharmacyApi, laboratoryApi, creditApi, hrApi, type DashboardData } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { useState, useEffect } from "react" // Added useState and useEffect

const defaultStats = {
  totalPatients: 0,
  todayAppointments: 0,
  admittedPatients: 0,
  totalRevenue: 0,
  pendingLabTests: 0,
  lowStockMedicines: 0,
  availableDoctors: 0,
  pendingBills: 0,
}

interface DashboardContentProps {
  // Original props are now fetched internally, so these can be removed or made optional
  // stats?: Partial<typeof defaultStats> | null
  // recentAppointments?: Appointment[]
  // revenueByMonth?: { month: string; revenue: number; count: number }[]
  // apptByStatus?: { status: string; count: number }[]
  // recentPatients?: Patient[]
  // doctors?: Doctor[]
}

export function DashboardContent({
  // stats: statsProp, // No longer using props for initial data
  // recentAppointments = [],
  // revenueByMonth = [],
  // apptByStatus = [],
  // recentPatients = [],
  // doctors = [],
}: DashboardContentProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [data, setData] = useState<DashboardData | null>(null)
  const [recentAppts, setRecentAppts] = useState<Appointment[]>([])
  const [creditStats, setCreditStats] = useState<any>(null)
  const [hrStats, setHrStats] = useState<any>(null)
  const [recentPatients, setRecentPatients] = useState<Patient[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const [dashData, appts, credits, hr, patients, doctorsData] = await Promise.all([
          dashboardApi.getStats(),
          appointmentsApi.getAll({ limit: 5 }),
          creditApi.getStats(),
          hrApi.getStats(),
          patientsApi.getAll({ limit: 5 }), // Fetch recent patients
          dashboardApi.getDoctors(), // Fetch doctors
        ])
        setData(dashData as any)
        setRecentAppts(appts as any || [])
        setCreditStats(credits || null)
        setHrStats(hr || null)
        setRecentPatients(patients as any || [])
        setDoctors(doctorsData as any || [])
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  const stats = { ...defaultStats, ...data?.stats }
  const appointments = Array.isArray(recentAppts) ? recentAppts : []
  const revenueByMonth = data?.revenueByMonth || []
  const apptByStatus = data?.apptByStatus || []

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Dashboard"
          description="Welcome back. Here is an overview of your hospital today."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="h-[120px] animate-pulse bg-muted/50" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
          <Card className="lg:col-span-4 h-[300px] animate-pulse bg-muted/50" />
          <Card className="lg:col-span-3 h-[300px] animate-pulse bg-muted/50" />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="lg:col-span-1 h-[300px] animate-pulse bg-muted/50" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description="Welcome back. Here is an overview of your hospital today."
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Patients"
          value={stats.totalPatients}
          icon={Users}
          iconClassName="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
        />
        <StatCard
          title="Today's Appointments"
          value={stats.todayAppointments}
          icon={CalendarDays}
          description={`${appointments.filter((a) => a.status === "completed").length} completed`}
          iconClassName="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
        />
        <StatCard
          title="Admitted Patients"
          value={stats.admittedPatients}
          icon={BedDouble}
          description="In-patient department"
          iconClassName="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
        />
        <StatCard
          title="Total Revenue"
          value={`$${stats.totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={DollarSign}
          iconClassName="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
        />
        <StatCard
          title="Pending Lab Tests"
          value={stats.pendingLabTests}
          icon={FlaskConical}
          description="Awaiting results"
          iconClassName="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
        />
        <StatCard
          title="Low Stock Medicines"
          value={stats.lowStockMedicines}
          icon={AlertTriangle}
          description="Need reorder"
          iconClassName="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
        />
        <StatCard
          title="Available Doctors"
          value={stats.availableDoctors}
          icon={Stethoscope}
          description={`${doctors.length} total doctors`}
          iconClassName="bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400"
        />
        {/* New Credit Summary Card */}
        <StatCard
          title="Outstanding Credit"
          value={`$${parseFloat(creditStats?.stats?.total_outstanding || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={HistoryIcon}
          description={`${creditStats?.stats?.total_customers || 0} Accounts`}
          iconClassName="bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400"
        />
        <StatCard
          title="Monthly Payroll"
          value={`$${parseFloat(hrStats?.stats?.monthlyPayrollBase || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={Wallet}
          description={`${hrStats?.stats?.activeEmployees || 0} Staff Members`}
          iconClassName="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Revenue Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart data={revenueByMonth} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Appointments by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <AppointmentsPieChart data={apptByStatus} appointments={appointments} />
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Recent Appointments + Patients + Doctor Status */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Recent Appointments */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Upcoming Appointments</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex flex-col gap-3">
              {appointments.filter((a) => a.status === "scheduled").slice(0, 5).map((apt) => (
                <div key={apt.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                    {apt.patientName.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-card-foreground">{apt.patientName}</p>
                    <p className="text-xs text-muted-foreground">{apt.doctorName} - {apt.time}</p>
                  </div>
                  <StatusBadge status={apt.status} />
                </div>
              ))}
              {appointments.filter((a) => a.status === "scheduled").length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No upcoming appointments.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Patients */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Recent Patients</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex flex-col gap-3">
              {recentPatients.map((patient) => (
                <div key={patient.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground text-xs font-semibold">
                    {patient.firstName[0]}{patient.lastName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-card-foreground">{patient.firstName} {patient.lastName}</p>
                    <p className="text-xs text-muted-foreground">{patient.patientId} - {patient.phone}</p>
                  </div>
                  <StatusBadge status={patient.status} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Doctor Availability */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Doctor Availability</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex flex-col gap-3">
              {doctors.slice(0, 5).map((doc) => (
                <div key={doc.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                    {doc.name.replace("Dr. ", "").split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-card-foreground">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">{doc.specialization}</p>
                  </div>
                  <StatusBadge status={doc.status} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
