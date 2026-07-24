"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { Download, FileText, TrendingUp, PieChart as PieChartIcon, BarChart3 } from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
  PieChart,
  Pie
} from "recharts"
import type { Invoice, Appointment } from "@/lib/api"
import { format } from "date-fns"

interface ReportsContentProps {
  stats?: Record<string, number>
  invoices?: Invoice[]
  appointments?: Appointment[]
  patients?: unknown[]
  accountEntries?: { type: string; amount: number; date: string }[]
  financial?: {
    incomeByDept: { department: string; amount: number }[]
    expenseByCategory: { category: string; amount: number }[]
    monthlyTrend: { month: string; income: number; expense: number }[]
  }
}

const COLORS = ["#0ea5e9", "#10b981", "#f59e0b", "#6366f1", "#ec4899", "#8b5cf6"]

export function ReportsContent({
  stats = {},
  invoices = [],
  appointments = [],
  patients = [],
  accountEntries = [],
  financial,
}: ReportsContentProps) {
  const [activeTab, setActiveTab] = useState("overview")
  const invList = Array.isArray(invoices) ? invoices : []
  const apptList = Array.isArray(appointments) ? appointments : []
  const entriesList = Array.isArray(accountEntries) ? accountEntries : []
  const patientsList = Array.isArray(patients) ? patients : []

  const totalRevenue = useMemo(() => invList.reduce((sum, i) => sum + (i.total || 0), 0), [invList])
  const totalIncome = useMemo(() => entriesList.filter((e: { type?: string }) => e.type === "income").reduce((sum: number, e: { amount?: number }) => sum + (e.amount || 0), 0), [entriesList])
  const totalExpense = useMemo(() => entriesList.filter((e: { type?: string }) => e.type === "expense").reduce((sum: number, e: { amount?: number }) => sum + (e.amount || 0), 0), [entriesList])

  const exportToCSV = () => {
    const csvRows = [
      ["Invoice ID", "Patient", "Date", "Status", "Total"],
      ...invList.map(inv => [inv.invoiceId, inv.patientName, inv.date, inv.status, inv.total])
    ]
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", "hospital_billing_report.csv")
    document.body.appendChild(link)
    link.click()
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reports & Analytics"
        description="Detailed insights and financial analysis for hospital operations."
      >
        <Button variant="outline" onClick={exportToCSV}>
          <Download className="mr-2 size-4" />
          Export Report
        </Button>
      </PageHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-[400px] grid-cols-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="financial">Financial Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
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
                <p className="text-sm text-muted-foreground">Invoices Generated</p>
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
                    <TableHead className="pl-6">Invoice ID</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invList.slice(0, 10).map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-xs pl-6">{inv.invoiceId}</TableCell>
                      <TableCell>{inv.patientName}</TableCell>
                      <TableCell>{inv.date ?? "—"}</TableCell>
                      <TableCell className="text-right">${Number(inv.total || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell><StatusBadge status={inv.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial" className="space-y-6 mt-6">
          {financial && (
            <>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <TrendingUp className="size-4" />
                      Monthly Income vs Expense
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={financial.monthlyTrend}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="income" fill="#10b981" name="Income" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="expense" fill="#ef4444" name="Expense" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <PieChartIcon className="size-4" />
                      Income by Department
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={financial.incomeByDept.map(d => ({ name: d.department, value: d.amount }))}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {financial.incomeByDept.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <FileText className="size-4" />
                    Profit & Loss Summary (Last 12 Months)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-6">Month</TableHead>
                        <TableHead className="text-right">Income</TableHead>
                        <TableHead className="text-right">Expense</TableHead>
                        <TableHead className="text-right">Net Profit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {financial.monthlyTrend.map((row) => (
                        <TableRow key={row.month}>
                          <TableCell className="pl-6">{row.month}</TableCell>
                          <TableCell className="text-right text-emerald-600 font-medium">${row.income.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-red-600 font-medium">${row.expense.toLocaleString()}</TableCell>
                          <TableCell className={`text-right font-bold ${row.income - row.expense >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                            ${(row.income - row.expense).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
