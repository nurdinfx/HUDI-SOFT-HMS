"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PageHeader } from "@/components/shared/page-header"
import type { Invoice, Appointment } from "@/lib/api"

interface ReportsContentProps {
  stats?: Record<string, number>
  invoices?: Invoice[]
  appointments?: Appointment[]
  patients?: unknown[]
  accountEntries?: { type: string; amount: number; date: string }[]
}

export function ReportsContent({
  stats = {},
  invoices = [],
  appointments = [],
  patients = [],
  accountEntries = [],
}: ReportsContentProps) {
  const invList = Array.isArray(invoices) ? invoices : []
  const apptList = Array.isArray(appointments) ? appointments : []
  const entriesList = Array.isArray(accountEntries) ? accountEntries : []
  const patientsList = Array.isArray(patients) ? patients : []

  const totalRevenue = useMemo(() => invList.reduce((sum, i) => sum + (i.total || 0), 0), [invList])
  const totalIncome = useMemo(() => entriesList.filter((e: { type?: string }) => e.type === "income").reduce((sum: number, e: { amount?: number }) => sum + (e.amount || 0), 0), [entriesList])
  const totalExpense = useMemo(() => entriesList.filter((e: { type?: string }) => e.type === "expense").reduce((sum: number, e: { amount?: number }) => sum + (e.amount || 0), 0), [entriesList])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reports"
        description="Overview from your hospital data"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total Patients</p>
            <p className="text-2xl font-semibold">{stats.totalPatients ?? patientsList.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total Revenue</p>
            <p className="text-2xl font-semibold">${(stats.totalRevenue ?? totalRevenue).toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Appointments</p>
            <p className="text-2xl font-semibold">{stats.todayAppointments ?? apptList.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Invoices</p>
            <p className="text-2xl font-semibold">{invList.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Invoices</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice ID</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invList.slice(0, 10).map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-mono text-xs">{inv.invoiceId}</TableCell>
                  <TableCell>{inv.patientName}</TableCell>
                  <TableCell>{inv.date ?? "—"}</TableCell>
                  <TableCell className="text-right">${Number(inv.total || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell>{inv.status}</TableCell>
                </TableRow>
              ))}
              {invList.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No invoices.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Accounts Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Total Income</p>
              <p className="text-xl font-semibold text-emerald-600 dark:text-emerald-400">${totalIncome.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Expense</p>
              <p className="text-xl font-semibold text-red-600 dark:text-red-400">${totalExpense.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
