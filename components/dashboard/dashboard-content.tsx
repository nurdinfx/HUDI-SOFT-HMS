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
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { StatusBadge } from "@/components/shared/status-badge"
import { RevenueChart } from "./revenue-chart"
import { AppointmentsPieChart } from "./appointments-pie-chart"
import type { Appointment, Patient, Doctor } from "@/lib/data/types"

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
  stats?: Partial<typeof defaultStats> | null
  recentAppointments?: Appointment[]
  revenueByMonth?: { month: string; revenue: number; count: number }[]
  apptByStatus?: { status: string; count: number }[]
  recentPatients?: Patient[]
  doctors?: Doctor[]
}

export function DashboardContent({
  stats: statsProp,
  recentAppointments = [],
  revenueByMonth = [],
  apptByStatus = [],
  recentPatients = [],
  doctors = [],
}: DashboardContentProps) {
  const stats = { ...defaultStats, ...statsProp }
  const appointments = Array.isArray(recentAppointments) ? recentAppointments : []
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
        <StatCard
          title="Pending Bills"
          value={stats.pendingBills}
          icon={Receipt}
          description="Unpaid or partial"
          iconClassName="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
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
