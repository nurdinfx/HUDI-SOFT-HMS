"use client"

import { useState, useEffect, useCallback } from "react"
import { revenueAnalyticsApi, Department, ServiceCategory, RevenueReport } from "@/lib/api"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Plus, Edit, Trash2, BarChart3, LayoutGrid, List, RefreshCw, Printer, TrendingUp, TrendingDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table"
import { DepartmentFormModal } from "./department-form-modal"
import { ServiceCategoryFormModal } from "./service-category-form-modal"

const fmt = (n: number) => n > 0 ? `$${n.toFixed(2)}` : "-"
const fmtNum = (n: number) => {
  if (!n || n === 0) return <span className="text-slate-300 text-sm">—</span>
  return <span className="font-semibold text-slate-800">${n.toFixed(2)}</span>
}

function PaymentMethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    zaad: "bg-purple-100 text-purple-700", sahal: "bg-teal-100 text-teal-700",
    edahab: "bg-orange-100 text-orange-700", mycash: "bg-pink-100 text-pink-700",
    cash: "bg-emerald-100 text-emerald-700", credit: "bg-amber-100 text-amber-700",
    ZAAD: "bg-purple-100 text-purple-700", SAHAL: "bg-teal-100 text-teal-700",
    EDAHAB: "bg-orange-100 text-orange-700", MYCASH: "bg-pink-100 text-pink-700",
  }
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${colors[method] || "bg-slate-100 text-slate-600"}`}>
      {method}
    </span>
  )
}

export function DepartmentsContent() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  const [deptModalOpen, setDeptModalOpen] = useState(false)
  const [catModalOpen, setCatModalOpen] = useState(false)
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null)
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null)

  // Revenue Report
  const today = new Date().toISOString().split("T")[0]
  const [reportDate, setReportDate] = useState(today)
  const [report, setReport] = useState<RevenueReport | null>(null)
  const [reportLoading, setReportLoading] = useState(false)

  const fetchReport = useCallback(async (date: string) => {
    setReportLoading(true)
    try {
      const data = await revenueAnalyticsApi.getReport({ startDate: date, endDate: date })
      setReport(data)
    } catch (err: any) {
      toast.error("Failed to load report")
    } finally {
      setReportLoading(false)
    }
  }, [])

  const [pendingSaves, setPendingSaves] = useState<Record<string, boolean>>({})

  const handleCellChange = async (department: string, category: string, value: string) => {
    if (!report) return
    const numValue = value === "" ? "" : parseFloat(value)
    
    // Optimistic UI update
    const newReport = { ...report }
    const rowIndex = newReport.rows.findIndex(r => r.department === department)
    if (rowIndex >= 0) {
       const oldVal = newReport.rows[rowIndex].totals[category] || 0
       const newVal = typeof numValue === "number" ? numValue : 0
       
       newReport.rows[rowIndex].totals[category] = newVal
       newReport.rows[rowIndex].rowTotal = newReport.rows[rowIndex].rowTotal - oldVal + newVal
       
       newReport.columnTotals[category] = (newReport.columnTotals[category] || 0) - oldVal + newVal
       newReport.grandTotal = newReport.grandTotal - oldVal + newVal
       newReport.netIncome = newReport.grandTotal - (newReport.totalExpenses || 0)
       
       setReport(newReport)
    }
    
    const cellKey = `${department}-${category}`
    setPendingSaves(prev => ({ ...prev, [cellKey]: true }))
    
    try {
       await revenueAnalyticsApi.updateCell({
         date: reportDate,
         department,
         category,
         amount: numValue
       })
    } catch (error) {
       toast.error(`Failed to save value for ${department}`)
       fetchReport(reportDate) // revert on error
    } finally {
       setPendingSaves(prev => ({ ...prev, [cellKey]: false }))
    }
  }

  const handleSystemValueChange = async (key: string, value: string) => {
    if (!report) return
    const numValue = value === "" ? "" : parseFloat(value)
    
    // Optimistic UI update
    const newReport = { ...report }
    newReport.systemValues = { ...(newReport.systemValues || {}) }
    newReport.systemValues[key] = typeof numValue === "number" ? numValue : 0
    
    // Update legacy fields if needed
    if (key === 'EXPENSES') {
        newReport.totalExpenses = newReport.systemValues[key]
        newReport.netIncome = newReport.grandTotal - newReport.totalExpenses
    }
    
    setReport(newReport)
    
    const cellKey = `SYSTEM-${key}`
    setPendingSaves(prev => ({ ...prev, [cellKey]: true }))
    
    try {
       await revenueAnalyticsApi.updateCell({
         date: reportDate,
         department: key,
         category: "SYSTEM_VALUES",
         amount: numValue
       })
    } catch (error) {
       toast.error(`Failed to save ${key}`)
       fetchReport(reportDate)
    } finally {
       setPendingSaves(prev => ({ ...prev, [cellKey]: false }))
    }
  }


  const handleDeleteDepartment = async (id: string) => {
    if (!window.confirm("Delete this department?")) return
    try {
      await revenueAnalyticsApi.deleteDepartment(id)
      toast.success("Department deleted")
      fetchData()
    } catch (err: any) {
      toast.error(err.message || "Failed to delete department")
    }
  }

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm("Delete this service category?")) return
    try {
      await revenueAnalyticsApi.deleteServiceCategory(id)
      toast.success("Service category deleted")
      fetchData()
    } catch (err: any) {
      toast.error(err.message || "Failed to delete category")
    }
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const [depts, cats] = await Promise.all([
        revenueAnalyticsApi.getDepartments(),
        revenueAnalyticsApi.getServiceCategories()
      ])
      setDepartments(depts || [])
      setCategories(cats || [])
    } catch (error) {
      toast.error("Failed to load departments and services")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])
  useEffect(() => { fetchReport(reportDate) }, [reportDate, fetchReport])

  const filteredDepts = departments.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    (d.code && d.code.toLowerCase().includes(search.toLowerCase()))
  )

  const filteredCats = categories.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.description && c.description.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader
          title="Departments & Revenue"
          description="Manage departments, service categories, and track daily revenue by department"
        />
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setCatModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Service Category
          </Button>
          <Button onClick={() => setDeptModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Department
          </Button>
        </div>
      </div>

      <Tabs defaultValue="revenue" className="w-full">
        <TabsList className="bg-slate-100 p-1 mb-4">
          <TabsTrigger value="revenue" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <BarChart3 className="mr-2 h-4 w-4" /> Daily Revenue Report
          </TabsTrigger>
          <TabsTrigger value="departments" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <LayoutGrid className="mr-2 h-4 w-4" /> Departments ({departments.length})
          </TabsTrigger>
          <TabsTrigger value="categories" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <List className="mr-2 h-4 w-4" /> Service Categories ({categories.length})
          </TabsTrigger>
        </TabsList>

        {/* ══════════════════ DAILY REVENUE REPORT ══════════════════ */}
        <TabsContent value="revenue">
          <div className="space-y-4">
            {/* Filters Row */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm">
                  <label className="text-xs font-medium text-slate-500">Date:</label>
                  <input
                    type="date"
                    value={reportDate}
                    onChange={e => setReportDate(e.target.value)}
                    className="text-sm text-slate-700 bg-transparent outline-none cursor-pointer"
                  />
                </div>
                <Button
                  size="sm" variant="outline"
                  onClick={() => fetchReport(reportDate)}
                  disabled={reportLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-1 ${reportLoading ? "animate-spin" : ""}`} />
                  {reportLoading ? "Loading..." : "Refresh"}
                </Button>
              </div>
              <Button size="sm" variant="ghost" onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-1" /> Print
              </Button>
            </div>

            {/* Summary Cards */}
            {report && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="border-emerald-200 bg-emerald-50">
                  <CardContent className="p-4">
                    <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide">Total Income</p>
                    <p className="text-2xl font-black text-emerald-700 mt-1">${report.grandTotal.toFixed(2)}</p>
                  </CardContent>
                </Card>
                <Card className="border-rose-200 bg-rose-50">
                  <CardContent className="p-4">
                    <p className="text-xs font-medium text-rose-600 uppercase tracking-wide">Expenses</p>
                    <p className="text-2xl font-black text-rose-700 mt-1">${(report.totalExpenses || 0).toFixed(2)}</p>
                  </CardContent>
                </Card>
                <Card className="border-indigo-200 bg-indigo-50">
                  <CardContent className="p-4">
                    <p className="text-xs font-medium text-indigo-600 uppercase tracking-wide">Net Income</p>
                    <p className={`text-2xl font-black mt-1 ${(report.netIncome || 0) >= 0 ? "text-indigo-700" : "text-rose-700"}`}>
                      ${(report.netIncome || 0).toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-slate-200 bg-slate-50">
                  <CardContent className="p-4">
                    <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">Departments</p>
                    <p className="text-2xl font-black text-slate-700 mt-1">{report.rows.filter(r => r.rowTotal > 0).length}</p>
                    <p className="text-xs text-slate-400">with revenue</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Excel-Style Matrix Table */}
            <Card className="border-slate-200 shadow-sm overflow-auto">
              <CardHeader className="pb-2 border-b bg-slate-50">
                <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                  Department Revenue Matrix — {new Date(reportDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                </CardTitle>
              </CardHeader>
              {reportLoading ? (
                <div className="p-12 text-center text-slate-500">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-slate-400" />
                  Loading revenue data...
                </div>
              ) : !report || report.rows.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No revenue data for this date.</p>
                  <p className="text-sm mt-1">Add departments and service categories, then record transactions.</p>
                </div>
              ) : (
                <div className="overflow-auto">
                  <table className="w-full text-sm border-collapse min-w-[600px]">
                    <thead>
                      <tr className="bg-yellow-400">
                        <th className="text-left px-4 py-3 font-extrabold text-slate-900 border-r-2 border-yellow-500 min-w-[180px] uppercase text-xs tracking-wide">
                          DEPARTMENT
                        </th>
                        {report.columns.map(col => (
                          <th key={col} className="px-4 py-3 font-extrabold text-slate-800 text-right border-r border-yellow-500 min-w-[110px] uppercase text-xs tracking-wide">
                            {col}
                          </th>
                        ))}
                        <th className="px-4 py-3 font-extrabold text-slate-900 text-right bg-yellow-500 min-w-[110px] uppercase text-xs tracking-wide">
                          TOTAL
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.rows.map((row, i) => (
                        <tr key={row.department} className={`border-b hover:bg-yellow-50/50 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}>
                          <td className="px-4 py-2.5 font-semibold text-slate-800 border-r-2 border-slate-200">
                            {row.department}
                          </td>
                          {report.columns.map(col => (
                            <td key={col} className="px-2 py-1 text-right border-r border-slate-100 relative">
                              {pendingSaves[`${row.department}-${col}`] && (
                                <div className="absolute inset-0 bg-white/50 animate-pulse pointer-events-none rounded" />
                              )}
                              <input 
                                type="number" 
                                defaultValue={row.totals[col] || ""}
                                onBlur={(e) => {
                                  const val = e.target.value;
                                  if (parseFloat(val) !== (row.totals[col] || 0) && !(val === "" && !row.totals[col])) {
                                     handleCellChange(row.department, col, val);
                                  }
                                }}
                                className="w-full min-w-[60px] text-right bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded px-2 py-1 outline-none transition-all placeholder:text-slate-300 font-semibold text-slate-700"
                                placeholder="0"
                              />
                            </td>
                          ))}
                          <td className="px-4 py-2.5 text-right font-black text-slate-900 bg-yellow-50">
                            {row.rowTotal > 0 ? <span className="text-yellow-700">${row.rowTotal.toFixed(2)}</span> : <span className="text-slate-300">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {/* Column Totals */}
                    <tfoot>
                      <tr className="bg-yellow-400 border-t-2 border-yellow-500">
                        <td className="px-4 py-3 font-extrabold text-slate-900 border-r-2 border-yellow-500 text-xs uppercase tracking-wide">
                          SUB TOTAL
                        </td>
                        {report.columns.map(col => (
                          <td key={col} className="px-4 py-3 text-right font-bold text-slate-800 border-r border-yellow-500 text-sm">
                            {report.columnTotals[col] > 0 ? `$${report.columnTotals[col].toFixed(2)}` : "—"}
                          </td>
                        ))}
                        <td className="px-4 py-3 text-right font-black text-slate-900 bg-yellow-500 text-sm">
                          ${report.grandTotal.toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </Card>

            {/* Payment Method Summary + Net Income */}
            {report && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Payment Method Breakdown */}
                <Card className="border-slate-200 shadow-sm overflow-hidden">
                  <CardHeader className="bg-slate-800 py-3 px-4">
                    <CardTitle className="text-sm font-bold text-white uppercase tracking-wide">
                      Payment Method & Loan Summary
                    </CardTitle>
                  </CardHeader>
                  <table className="w-full text-sm">
                    <tbody>
                      {["ZAAD", "SAHAL", "EDAHAB", "MYCASH", "CASH", "CREDIT"].map(method => {
                        const val = report.systemValues?.[method] || 0;
                        return (
                          <tr key={method} className="border-b last:border-0 hover:bg-slate-50">
                            <td className="px-4 py-2.5 w-1/2">
                              <PaymentMethodBadge method={method} />
                            </td>
                            <td className="px-4 py-1.5 text-right w-1/2 relative">
                              {pendingSaves[`SYSTEM-${method}`] && <div className="absolute inset-0 bg-white/50 animate-pulse pointer-events-none rounded" />}
                              <input 
                                type="number" 
                                defaultValue={val || ""}
                                onBlur={(e) => {
                                  if (parseFloat(e.target.value) !== val && !(e.target.value === "" && !val)) {
                                     handleSystemValueChange(method, e.target.value);
                                  }
                                }}
                                className="w-full text-right bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded px-2 py-1 outline-none transition-all placeholder:text-slate-300 font-semibold text-slate-700"
                                placeholder="0"
                              />
                            </td>
                          </tr>
                        )
                      })}
                      
                      <tr className="border-b hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-bold text-slate-600 text-xs tracking-wide">DAYMAHA DAILYGA AH (Loans Given)</td>
                        <td className="px-4 py-1.5 text-right relative">
                          {pendingSaves[`SYSTEM-DAYMAHA_DAILYGA_AH`] && <div className="absolute inset-0 bg-white/50 animate-pulse pointer-events-none rounded" />}
                          <input type="number" defaultValue={report.systemValues?.['DAYMAHA_DAILYGA_AH'] || ""} 
                            onBlur={(e) => {
                              if (parseFloat(e.target.value) !== (report.systemValues?.['DAYMAHA_DAILYGA_AH'] || 0) && !(e.target.value === "" && !(report.systemValues?.['DAYMAHA_DAILYGA_AH'] || 0))) {
                                handleSystemValueChange('DAYMAHA_DAILYGA_AH', e.target.value);
                              }
                            }}
                            className="w-full text-right bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded px-2 py-1 outline-none transition-all placeholder:text-slate-300 font-semibold text-amber-600" placeholder="0" />
                        </td>
                      </tr>
                      
                      <tr className="border-b hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-bold text-slate-600 text-xs tracking-wide">DAYMAHA SOO XAROODA (Loans Paid)</td>
                        <td className="px-4 py-1.5 text-right relative">
                          {pendingSaves[`SYSTEM-DAYMAHA_SOO_XAROODA`] && <div className="absolute inset-0 bg-white/50 animate-pulse pointer-events-none rounded" />}
                          <input type="number" defaultValue={report.systemValues?.['DAYMAHA_SOO_XAROODA'] || ""} 
                            onBlur={(e) => {
                              if (parseFloat(e.target.value) !== (report.systemValues?.['DAYMAHA_SOO_XAROODA'] || 0) && !(e.target.value === "" && !(report.systemValues?.['DAYMAHA_SOO_XAROODA'] || 0))) {
                                handleSystemValueChange('DAYMAHA_SOO_XAROODA', e.target.value);
                              }
                            }}
                            className="w-full text-right bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded px-2 py-1 outline-none transition-all placeholder:text-slate-300 font-semibold text-emerald-600" placeholder="0" />
                        </td>
                      </tr>

                      <tr className="bg-slate-100 border-t-2 border-slate-300">
                        <td className="px-4 py-3 font-extrabold text-slate-900 text-xs uppercase tracking-wide">TOTAL PAYMENTS</td>
                        <td className="px-4 py-3 text-right font-black text-slate-900">
                          ${(["ZAAD", "SAHAL", "EDAHAB", "MYCASH", "CASH", "CREDIT"].reduce((sum, method) => sum + (report.systemValues?.[method] || 0), 0)).toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </Card>

                {/* Net Income Summary */}
                <Card className="border-slate-200 shadow-sm overflow-hidden">
                  <CardHeader className="bg-slate-800 py-3 px-4">
                    <CardTitle className="text-sm font-bold text-white uppercase tracking-wide">
                      Net Income & Balance Summary
                    </CardTitle>
                  </CardHeader>
                  <table className="w-full text-sm">
                    <tbody>
                      <tr className="border-b hover:bg-slate-50">
                        <td className="px-4 py-3 font-bold text-slate-600 flex items-center gap-2">
                           Matrix Grand Total
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-700">${report.grandTotal.toFixed(2)}</td>
                      </tr>

                      <tr className="border-b hover:bg-slate-50 bg-rose-50/30">
                        <td className="px-4 py-2.5 font-bold text-slate-600 flex items-center gap-2">
                          <TrendingDown className="h-4 w-4 text-rose-500" /> EXPENSES (Lass Daily)
                        </td>
                        <td className="px-4 py-1.5 text-right relative">
                          {pendingSaves[`SYSTEM-EXPENSES`] && <div className="absolute inset-0 bg-white/50 animate-pulse pointer-events-none rounded" />}
                          <input type="number" defaultValue={report.systemValues?.['EXPENSES'] || ""} 
                            onBlur={(e) => {
                              if (parseFloat(e.target.value) !== (report.systemValues?.['EXPENSES'] || 0) && !(e.target.value === "" && !(report.systemValues?.['EXPENSES'] || 0))) {
                                handleSystemValueChange('EXPENSES', e.target.value);
                              }
                            }}
                            className="w-full text-right bg-transparent border border-transparent hover:border-slate-300 focus:border-rose-500 focus:bg-white rounded px-2 py-1 outline-none transition-all placeholder:text-slate-300 font-bold text-rose-600" placeholder="0" />
                        </td>
                      </tr>

                      <tr className="bg-indigo-50 border-t-2 border-indigo-200">
                        <td className="px-4 py-4 font-extrabold text-indigo-900 text-xs uppercase tracking-wide">NET INCOME <br/><span className="text-[10px] text-indigo-600 font-medium">(Matrix - Expenses)</span></td>
                        <td className={`px-4 py-4 text-right font-black text-xl ${(report.netIncome || 0) >= 0 ? "text-indigo-700" : "text-rose-700"}`}>
                          ${(report.netIncome || 0).toFixed(2)}
                        </td>
                      </tr>
                      
                      {(() => {
                        const totalPayments = ["ZAAD", "SAHAL", "EDAHAB", "MYCASH", "CASH", "CREDIT"].reduce((sum, m) => sum + (report.systemValues?.[m] || 0), 0)
                        const loansGiven = report.systemValues?.['DAYMAHA_DAILYGA_AH'] || 0
                        const loansReceived = report.systemValues?.['DAYMAHA_SOO_XAROODA'] || 0
                        const expectedCash = report.grandTotal + loansReceived
                        const actualCash = totalPayments + loansGiven
                        const diff = expectedCash - actualCash
                        return (
                          <tr className={`border-t-4 border-slate-300 ${diff === 0 ? "bg-emerald-50" : "bg-rose-100"}`}>
                            <td className="px-4 py-4 font-extrabold text-slate-900 text-sm uppercase tracking-wide">
                              DIFFERENCE
                              <div className="text-[10px] font-medium text-slate-500 normal-case mt-0.5 font-mono">
                                (Total + Paid Loans) - (Payments + Given Loans)
                              </div>
                            </td>
                            <td className={`px-4 py-4 text-right font-black text-2xl ${diff === 0 ? "text-emerald-600" : "text-rose-600"}`}>
                              ${diff.toFixed(2)}
                            </td>
                          </tr>
                        )
                      })()}
                    </tbody>
                  </table>
                </Card>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ══════════════════ DEPARTMENTS ══════════════════ */}
        <TabsContent value="departments">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-slate-50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input placeholder="Search by name or code..." className="pl-10 bg-white border-slate-200"
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-semibold text-slate-700">Name</TableHead>
                  <TableHead className="font-semibold text-slate-700">Code</TableHead>
                  <TableHead className="font-semibold text-slate-700">Status</TableHead>
                  <TableHead className="font-semibold text-slate-700">Created At</TableHead>
                  <TableHead className="font-semibold text-slate-700 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">Loading...</TableCell></TableRow>
                ) : filteredDepts.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">No departments found.</TableCell></TableRow>
                ) : filteredDepts.map(dept => (
                  <TableRow key={dept.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-medium">{dept.name}</TableCell>
                    <TableCell className="text-slate-500 font-mono text-xs">{dept.code || "—"}</TableCell>
                    <TableCell><StatusBadge status={dept.isActive ? "active" : "inactive"} /></TableCell>
                    <TableCell className="text-slate-500 text-sm">{new Date(dept.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-emerald-600"
                        onClick={() => { setEditingDepartment(dept); setDeptModalOpen(true) }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-rose-600 ml-1"
                        onClick={() => handleDeleteDepartment(dept.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ══════════════════ SERVICE CATEGORIES ══════════════════ */}
        <TabsContent value="categories">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-slate-50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input placeholder="Search categories..." className="pl-10 bg-white border-slate-200"
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-semibold text-slate-700">Category Name</TableHead>
                  <TableHead className="font-semibold text-slate-700">Description</TableHead>
                  <TableHead className="font-semibold text-slate-700">Status</TableHead>
                  <TableHead className="font-semibold text-slate-700">Created At</TableHead>
                  <TableHead className="font-semibold text-slate-700 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">Loading...</TableCell></TableRow>
                ) : filteredCats.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">No categories found.</TableCell></TableRow>
                ) : filteredCats.map(cat => (
                  <TableRow key={cat.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-medium">{cat.name}</TableCell>
                    <TableCell className="text-slate-500 text-sm max-w-xs truncate">{cat.description || "—"}</TableCell>
                    <TableCell><StatusBadge status={cat.isActive ? "active" : "inactive"} /></TableCell>
                    <TableCell className="text-slate-500 text-sm">{new Date(cat.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-emerald-600"
                        onClick={() => { setEditingCategory(cat); setCatModalOpen(true) }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-rose-600 ml-1"
                        onClick={() => handleDeleteCategory(cat.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      <DepartmentFormModal
        open={deptModalOpen}
        onOpenChange={open => { setDeptModalOpen(open); if (!open) setTimeout(() => setEditingDepartment(null), 200) }}
        onSuccess={fetchData}
        initialData={editingDepartment}
      />
      <ServiceCategoryFormModal
        open={catModalOpen}
        onOpenChange={open => { setCatModalOpen(open); if (!open) setTimeout(() => setEditingCategory(null), 200) }}
        onSuccess={fetchData}
        initialData={editingCategory}
      />
    </div>
  )
}
