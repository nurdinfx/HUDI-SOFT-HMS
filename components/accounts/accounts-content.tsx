"use client"

import { useState, useMemo } from "react"
import {
  Search,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart as PieChartIcon,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Minus,
  Download,
  PlusCircle,
  Printer,
  Filter,
  Calendar,
  Wallet,
  Briefcase,
  History,
  BarChart3,
  Clock,
  ShieldAlert,
  PieChart as PieChartIcon2,
  LineChart as LineChartIcon
} from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { accountsApi, type AccountEntry, type AccountsSummary, type CashFlowEntry, type DepartmentBudget } from "@/lib/api"

interface AccountsContentProps {
  entries?: AccountEntry[]
  summary: AccountsSummary | null
  cashFlow: CashFlowEntry[]
  budgets?: DepartmentBudget[]
  onRefresh?: () => void
}

const DEPT_COLORS: Record<string, string> = {
  General: "#6366f1",
  OPD: "#10b981",
  IPD: "#3b82f6",
  Laboratory: "#f59e0b",
  Pharmacy: "#ec4899",
  Administration: "#64748b"
}

const PYMT_COLORS = ["#6366f1", "#10b981", "#3b82f6", "#f59e0b", "#ec4899", "#ef4444"]

export function AccountsContent({ entries = [], summary, cashFlow, budgets = [], onRefresh }: AccountsContentProps) {
  const [activeTab, setActiveTab] = useState("dashboard")
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [deptFilter, setDeptFilter] = useState("all")
  const [showAddModal, setShowAddModal] = useState(false)
  const [showBudgetModal, setShowBudgetModal] = useState(false)
  const [modalType, setModalType] = useState<'income' | 'expense'>('income')

  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      const matchSearch = !search ||
        e.description.toLowerCase().includes(search.toLowerCase()) ||
        e.category.toLowerCase().includes(search.toLowerCase())
      const matchType = typeFilter === "all" || e.type === typeFilter
      const matchDept = deptFilter === "all" || e.department === deptFilter
      return matchSearch && matchType && matchDept
    })
  }, [entries, search, typeFilter, deptFilter])

  const incomeEntries = useMemo(() => entries.filter(e => e.type === 'income'), [entries])
  const expenseEntries = useMemo(() => entries.filter(e => e.type === 'expense'), [entries])

  return (
    <div className="flex flex-col gap-6 p-2 md:p-6 opacity-0 animate-in fade-in duration-700 fill-mode-forwards">
      <PageHeader
        title="Financial Management"
        description="International standard accounting and revenue tracking"
      >
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="rounded-xl">
            <Printer className="size-4 mr-2" />
            Print Reports
          </Button>
          <Button size="sm" className="rounded-xl shadow-lg shadow-primary/20 bg-slate-900" onClick={() => { setModalType('income'); setShowAddModal(true); }}>
            <Plus className="size-4 mr-2" />
            New Entry
          </Button>
        </div>
      </PageHeader>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Net Profit"
          value={`$${summary?.profit?.toLocaleString() ?? "0"}`}
          trend="+12.5%"
          trendType="up"
          icon={<DollarSign className="size-5" />}
          description="Total lifetime earnings"
          color="bg-primary"
        />
        <StatCard
          title="Monthly Income"
          value={`$${summary?.incomeMonth?.toLocaleString() ?? "0"}`}
          trend="+5.2%"
          trendType="up"
          icon={<TrendingUp className="size-5 text-emerald-600" />}
          description="Current month revenue"
          color="bg-emerald-500"
        />
        <StatCard
          title="Total Expenses"
          value={`$${summary?.totalExpense?.toLocaleString() ?? "0"}`}
          trend="-2.1%"
          trendType="down"
          icon={<TrendingDown className="size-5 text-rose-600" />}
          description="Operating costs & bills"
          color="bg-rose-500"
        />
        <StatCard
          title="Today's Revenue"
          value={`$${summary?.incomeToday?.toLocaleString() ?? "0"}`}
          icon={<Calendar className="size-5 text-blue-600" />}
          description="Daily cash flow"
          color="bg-blue-500"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-100/50 p-1 rounded-2xl mb-6">
          <TabsTrigger value="dashboard" className="rounded-xl px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs font-bold">Dashboard</TabsTrigger>
          <TabsTrigger value="ledger" className="rounded-xl px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs font-bold">General Ledger</TabsTrigger>
          <TabsTrigger value="expenses" className="rounded-xl px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs font-bold">Expenses</TabsTrigger>
          <TabsTrigger value="budgets" className="rounded-xl px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs font-bold">Budgets</TabsTrigger>
          <TabsTrigger value="reports" className="rounded-xl px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs font-bold">Reports</TabsTrigger>
          <TabsTrigger value="audit" className="rounded-xl px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs font-bold">Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 rounded-3xl border-none shadow-sm overflow-hidden bg-white/50 backdrop-blur-xl">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold">Revenue Overview</CardTitle>
                  <CardDescription>Income vs Expenses Trend</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100 flex items-center gap-1">
                    <TrendingUp className="size-3" /> Income
                  </Badge>
                  <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-100 flex items-center gap-1">
                    <TrendingDown className="size-3" /> Expenses
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={cashFlow} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1} />
                          <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="month"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
                        dy={10}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
                        tickFormatter={(v) => `$${v}`}
                      />
                      <Tooltip
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="income"
                        stroke="#10b981"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorIncome)"
                        name="Income"
                      />
                      <Area
                        type="monotone"
                        dataKey="expense"
                        stroke="#f43f5e"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorExpense)"
                        name="Expenses"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="rounded-3xl border-none shadow-sm bg-white/50 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <PieChartIcon2 className="size-4 text-primary" />
                    Revenue by Dept
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={summary?.departmentRevenue || []}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="amount"
                          nameKey="department"
                        >
                          {(summary?.departmentRevenue || []).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={DEPT_COLORS[entry.department] || "#94a3b8"} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {summary?.departmentRevenue.slice(0, 4).map((dept, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <div className="size-2 rounded-full" style={{ backgroundColor: DEPT_COLORS[dept.department] }} />
                        <span className="text-[10px] font-bold text-slate-500 truncate">{dept.department}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-3xl border-none shadow-sm bg-slate-900 text-white p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><LineChartIcon className="size-20" /></div>
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Today's Performance</h3>
                <p className="text-2xl font-black">${summary?.incomeToday?.toLocaleString()}</p>
                <div className="mt-4 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: '65%' }} />
                  </div>
                  <span className="text-[10px] font-bold">65% of Target</span>
                </div>
              </Card>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 rounded-3xl border-none shadow-sm overflow-hidden bg-white/50 backdrop-blur-xl">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-lg font-bold uppercase tracking-tight">Recent Transactions</CardTitle>
                  <CardDescription>Latest financial activity</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab("ledger")} className="text-primary font-black text-[10px] uppercase tracking-widest hover:bg-slate-100/50 rounded-xl">View Full Ledger</Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                  {(summary?.recentEntries || []).map((e) => (
                    <div key={e.id} className="flex items-center justify-between p-4 px-6 hover:bg-slate-50/50 transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className={`size-10 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 ${e.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                          {e.type === 'income' ? <Plus className="size-5" /> : <Minus className="size-5" />}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{e.description}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className="text-[9px] h-4 px-1.5 font-black uppercase tracking-widest opacity-60">
                              {e.department}
                            </Badge>
                            <span className="text-[10px] font-bold text-slate-400">{format(new Date(e.date), "MMM d, yyyy")}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-black ${e.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {e.type === 'income' ? '+' : '-'}${e.amount.toLocaleString()}
                        </p>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter opacity-70">{e.paymentMethod}</p>
                      </div>
                    </div>
                  ))}
                  {(!summary?.recentEntries || summary.recentEntries.length === 0) && (
                    <div className="p-12 text-center text-slate-400">
                      <History className="size-10 mx-auto mb-2 opacity-20" />
                      <p className="text-xs font-bold uppercase tracking-widest">No Recent Activity</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="rounded-3xl border-none shadow-sm bg-white/50 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-slate-500">
                    <PieChartIcon2 className="size-4 text-primary" />
                    Payment Method
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={summary?.paymentModeRevenue || []}
                          innerRadius={50}
                          outerRadius={75}
                          paddingAngle={8}
                          dataKey="amount"
                          nameKey="method"
                          stroke="none"
                        >
                          {(summary?.paymentModeRevenue || []).map((_, index) => (
                            <Cell key={`cell-${index}`} fill={PYMT_COLORS[index % PYMT_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 'bold' }}
                        />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'black', textTransform: 'uppercase', letterSpacing: '0.05em' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-3xl border-none shadow-sm bg-indigo-50 border border-indigo-100 p-6 relative overflow-hidden group">
                <div className="absolute -right-4 -bottom-4 opacity-5 rotate-12 transition-transform group-hover:scale-110 group-hover:rotate-0"><Briefcase className="size-32" /></div>
                <div className="relative z-10">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">Monthly Net</h3>
                  <p className="text-3xl font-black text-indigo-900">${(summary?.incomeMonth || 0).toLocaleString()}</p>
                  <div className="mt-4 flex items-center gap-2 text-indigo-600 font-bold text-[10px] bg-indigo-100/50 w-fit px-3 py-1 rounded-full">
                    <TrendingUp className="size-3" /> +12.5% vs last month
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="ledger" className="mt-0">
          <Card className="rounded-3xl border-none shadow-sm">
            <CardHeader>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-lg font-bold">Financial Ledger</CardTitle>
                  <CardDescription>Consolidated record of all transactions</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <Input
                      placeholder="Search items..."
                      className="pl-9 h-11 rounded-xl border-slate-200"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[140px] h-11 rounded-xl">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="income">Income Only</SelectItem>
                      <SelectItem value="expense">Expenses Only</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={deptFilter} onValueChange={setDeptFilter}>
                    <SelectTrigger className="w-[140px] h-11 rounded-xl">
                      <SelectValue placeholder="All Dept" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="all">All Dept</SelectItem>
                      <SelectItem value="Billing">Billing</SelectItem>
                      <SelectItem value="Pharmacy">Pharmacy</SelectItem>
                      <SelectItem value="Laboratory">Laboratory</SelectItem>
                      <SelectItem value="General">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="pl-6 h-12 text-[10px] font-black uppercase text-slate-500 tracking-widest">Date</TableHead>
                    <TableHead className="h-12 text-[10px] font-black uppercase text-slate-500 tracking-widest">Description</TableHead>
                    <TableHead className="h-12 text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">Department</TableHead>
                    <TableHead className="h-12 text-[10px] font-black uppercase text-slate-500 tracking-widest">Category</TableHead>
                    <TableHead className="h-12 text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">Status</TableHead>
                    <TableHead className="pr-6 h-12 text-[10px] font-black uppercase text-slate-500 tracking-widest text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map((e) => (
                    <TableRow key={e.id} className="hover:bg-slate-50 group border-slate-50">
                      <TableCell className="pl-6 font-mono text-xs font-bold text-slate-500">
                        {format(new Date(e.date), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell className="font-bold text-slate-800 uppercase tracking-tight text-xs">
                        {e.description}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest">{e.department}</Badge>
                      </TableCell>
                      <TableCell className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {e.category}
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusBadge status={e.status} />
                      </TableCell>
                      <TableCell className="pr-6 text-right font-black">
                        <p className={e.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}>
                          {e.type === 'income' ? '+' : '-'}${e.amount.toLocaleString()}
                        </p>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredEntries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="h-40 text-center">
                        <History className="size-10 text-slate-200 mx-auto mb-2" />
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">No entries match your search</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="rounded-3xl border-none shadow-sm md:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Expense Tracking</CardTitle>
                <CardDescription>Operational and maintenance costs</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6">Expense Item</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="pr-6 text-right">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenseEntries.slice(0, 10).map((e) => (
                      <TableRow key={e.id} className="border-slate-50">
                        <TableCell className="pl-6 font-bold text-xs uppercase tracking-tight">{e.description}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[9px] uppercase font-bold">{e.category}</Badge></TableCell>
                        <TableCell className="text-right font-black text-rose-600">-${e.amount.toLocaleString()}</TableCell>
                        <TableCell className="pr-6 text-right text-[10px] font-bold text-slate-400 uppercase">{format(new Date(e.date), "MMM d")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="rounded-3xl border-none shadow-sm bg-slate-900 text-white overflow-hidden p-6 relative">
                <div className="relative z-10 space-y-4">
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Record Manual Expense</h3>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">Add non-billing related expenses such as utilities, salaries, or office supplies.</p>
                  <Button
                    className="w-full bg-white text-slate-900 hover:bg-slate-100 font-black rounded-xl h-12 uppercase tracking-widest text-xs"
                    onClick={() => { setModalType('expense'); setShowAddModal(true); }}
                  >
                    Open Expense Form
                  </Button>
                </div>
              </Card>

              <Card className="rounded-3xl border-none shadow-sm p-6">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6">Top Expense Categories</h3>
                <div className="space-y-4">
                  <ExpenseCategory label="Staff Salaries" percentage={45} amount={summary ? Math.round(summary.totalExpense * 0.45) : 0} />
                  <ExpenseCategory label="Medical Supplies" percentage={30} amount={summary ? Math.round(summary.totalExpense * 0.3) : 0} />
                  <ExpenseCategory label="Maintenance" percentage={15} amount={summary ? Math.round(summary.totalExpense * 0.15) : 0} />
                  <ExpenseCategory label="Utilities" percentage={10} amount={summary ? Math.round(summary.totalExpense * 0.1) : 0} />
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="budgets" className="mt-0 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-tight">Departmental Budgets</h2>
              <p className="text-slate-500 font-medium">Set and monitor spending limits by department</p>
            </div>
            <Button className="rounded-2xl h-12 px-6 font-black uppercase tracking-widest text-xs gap-2 shadow-lg shadow-primary/20" onClick={() => setShowBudgetModal(true)}>
              <PlusCircle className="size-4" /> Set New Budget
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {['OPD', 'IPD', 'Laboratory', 'Pharmacy', 'General'].map(dept => {
              const b = budgets.find(x => x.department === dept);
              const spent = entries.filter(e => e.department === dept && e.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
              const limit = b?.budget_amount || 0;
              const percent = limit > 0 ? (spent / limit) * 100 : 0;
              const isOver = percent > 100;

              return (
                <Card key={dept} className={`rounded-3xl border-none shadow-sm overflow-hidden ${isOver ? 'bg-rose-50/50 ring-2 ring-rose-200' : 'bg-white/50 backdrop-blur-xl'}`}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-500">{dept}</CardTitle>
                    {isOver && <ShieldAlert className="size-4 text-rose-600 animate-pulse" />}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-end">
                        <p className="text-2xl font-black">${spent.toLocaleString()}</p>
                        {limit > 0 ? (
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Limit: ${limit.toLocaleString()}</p>
                        ) : (
                          <p className="text-[10px] font-bold text-rose-400 uppercase">No Budget Set</p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-1000 ${isOver ? 'bg-rose-500' : 'bg-primary'}`}
                            style={{ width: `${Math.min(percent, 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] font-black uppercase">
                          <span className={isOver ? 'text-rose-600' : 'text-slate-400'}>{percent.toFixed(1)}% Spent</span>
                          <span className="text-slate-400">Monthly</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="reports" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="rounded-3xl border-none shadow-sm overflow-hidden bg-white/50 backdrop-blur-xl p-8 flex flex-col items-center text-center space-y-4 border-2 border-dashed border-slate-200 hover:border-primary/30 transition-colors group cursor-pointer">
              <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <BarChart3 className="size-8 text-primary" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black uppercase tracking-tight">Profit & Loss</h3>
                <p className="text-xs text-slate-500 font-medium">Generate detailed P&L statement for any period</p>
              </div>
              <Button variant="outline" className="rounded-xl font-bold text-xs uppercase tracking-widest h-10 w-full">Generate Report</Button>
            </Card>

            <Card className="rounded-3xl border-none shadow-sm overflow-hidden bg-white/50 backdrop-blur-xl p-8 flex flex-col items-center text-center space-y-4 border-2 border-dashed border-slate-200 hover:border-emerald-500/30 transition-colors group cursor-pointer">
              <div className="size-16 rounded-2xl bg-emerald-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Briefcase className="size-8 text-emerald-600" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black uppercase tracking-tight">Dept. Revenue</h3>
                <p className="text-xs text-slate-500 font-medium">Performance analysis by hospital department</p>
              </div>
              <Button variant="outline" className="rounded-xl font-bold text-xs uppercase tracking-widest h-10 w-full">View Breakdown</Button>
            </Card>

            <Card className="rounded-3xl border-none shadow-sm overflow-hidden bg-white/50 backdrop-blur-xl p-8 flex flex-col items-center text-center space-y-4 border-2 border-dashed border-slate-200 hover:border-amber-500/30 transition-colors group cursor-pointer">
              <div className="size-16 rounded-2xl bg-amber-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Clock className="size-8 text-amber-600" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black uppercase tracking-tight">Aged Receivables</h3>
                <p className="text-xs text-slate-500 font-medium">Track outstanding balances and aging invoices</p>
              </div>
              <Button variant="outline" className="rounded-xl font-bold text-xs uppercase tracking-widest h-10 w-full">Analyze Delays</Button>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="audit" className="mt-0">
          <Card className="rounded-3xl border-none shadow-sm overflow-hidden bg-white/50 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Financial Audit Trail</CardTitle>
              <CardDescription>Immutable record of all financial changes and entries</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="p-12 text-center text-slate-400">
                <ShieldAlert className="size-12 mx-auto mb-4 opacity-20" />
                <h3 className="text-sm font-black uppercase tracking-widest mb-1">Audit Protocol Active</h3>
                <p className="text-xs font-medium max-w-md mx-auto">This module displays a chronological log of all manual entries, budget changes, and automated billing synchronizations.</p>
                <Button className="mt-6 rounded-xl font-bold text-xs h-10 px-6">Fetch Audit History</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AddEntryModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        type={modalType}
        onSuccess={() => {
          onRefresh?.()
          setShowAddModal(false)
        }}
      />

      <AddBudgetModal
        open={showBudgetModal}
        onOpenChange={setShowBudgetModal}
        onSuccess={() => {
          onRefresh?.()
          setShowBudgetModal(false)
        }}
      />
    </div>
  )
}

function AddEntryModal({ open, onOpenChange, type, onSuccess }: {
  open: boolean,
  onOpenChange: (open: boolean) => void,
  type: 'income' | 'expense',
  onSuccess: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    category: "",
    department: "General",
    paymentMethod: "cash",
    date: new Date().toISOString().split('T')[0]
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.description || !formData.amount || !formData.category) {
      toast.error("Please fill in all required fields")
      return
    }

    setLoading(true)
    try {
      await accountsApi.create({
        ...formData,
        type,
        amount: parseFloat(formData.amount),
        status: 'completed'
      })
      toast.success(`${type === 'income' ? 'Income' : 'Expense'} recorded successfully`)
      onSuccess()
      setFormData({
        description: "",
        amount: "",
        category: "",
        department: "General",
        paymentMethod: "cash",
        date: new Date().toISOString().split('T')[0]
      })
    } catch (error) {
      console.error(error)
      toast.error("Failed to record entry")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl border-none sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold uppercase tracking-tight">
            Record {type === 'income' ? 'New Income' : 'New Expense'}
          </DialogTitle>
          <DialogDescription className="text-xs font-bold uppercase text-slate-400 tracking-widest">
            Enter financial transaction details below
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Description</Label>
            <Input
              placeholder="e.g. Utility Bill, Consultancy Fees"
              className="rounded-xl h-12"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Amount ($)</Label>
              <Input
                type="number"
                placeholder="0.00"
                className="rounded-xl h-12"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Date</Label>
              <Input
                type="date"
                className="rounded-xl h-12"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Category</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger className="rounded-xl h-12">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {type === 'income' ? (
                    <>
                      <SelectItem value="Patient Payment">Patient Payment</SelectItem>
                      <SelectItem value="Insurance Settlement">Insurance Settlement</SelectItem>
                      <SelectItem value="Govt Funding">Govt Funding</SelectItem>
                      <SelectItem value="Donation">Donation</SelectItem>
                      <SelectItem value="Other Income">Other Income</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="Utilities">Utilities</SelectItem>
                      <SelectItem value="Salaries">Salaries</SelectItem>
                      <SelectItem value="Medical Supplies">Medical Supplies</SelectItem>
                      <SelectItem value="Maintenance">Maintenance</SelectItem>
                      <SelectItem value="Admin Costs">Admin Costs</SelectItem>
                      <SelectItem value="Other Expense">Other Expense</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Department</Label>
              <Select value={formData.department} onValueChange={(v) => setFormData({ ...formData, department: v })}>
                <SelectTrigger className="rounded-xl h-12">
                  <SelectValue placeholder="Select Dept" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="General">General</SelectItem>
                  <SelectItem value="OPD">OPD</SelectItem>
                  <SelectItem value="IPD">IPD</SelectItem>
                  <SelectItem value="Laboratory">Laboratory</SelectItem>
                  <SelectItem value="Pharmacy">Pharmacy</SelectItem>
                  <SelectItem value="Administration">Administration</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Payment Method</Label>
            <Select value={formData.paymentMethod} onValueChange={(v) => setFormData({ ...formData, paymentMethod: v })}>
              <SelectTrigger className="rounded-xl h-12">
                <SelectValue placeholder="Select Method" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Credit/Debit Card</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="mobile_money">Mobile Money</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl h-12 font-bold uppercase tracking-widest text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className={`rounded-xl h-12 font-bold uppercase tracking-widest text-xs shadow-lg ${type === 'income' ? 'bg-slate-900 shadow-primary/20' : 'bg-rose-600 shadow-rose-200'}`}
            >
              {loading ? "Processing..." : `Record ${type}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function StatCard({ title, value, trend, trendType, icon, description, color }: {
  title: string, value: string, trend?: string, trendType?: 'up' | 'down', icon: React.ReactNode, description: string, color: string
}) {
  return (
    <Card className="rounded-2xl border-none shadow-sm overflow-hidden group hover:shadow-md transition-all">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className={`size-12 rounded-2xl ${color}/10 flex items-center justify-center`}>
            {icon}
          </div>
          {trend && (
            <div className={`flex items-center gap-1 text-xs font-black ${trendType === 'up' ? 'text-emerald-600' : 'text-rose-600'}`}>
              {trendType === 'up' ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
              {trend}
            </div>
          )}
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-black text-slate-900 tracking-tighter">{value}</p>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-1">{description}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function ExpenseCategory({ label, percentage, amount }: { label: string, percentage: number, amount: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-1">
        <span className="text-slate-500">{label}</span>
        <span className="text-slate-900">${amount.toLocaleString()}</span>
      </div>
      <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
        <div className="h-full bg-slate-900 rounded-full" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  )
}

function ReportCard({ title, description, icon }: { title: string, description: string, icon: React.ReactNode }) {
  return (
    <Card className="rounded-3xl border-none shadow-sm hover:translate-y-[-4px] transition-all cursor-pointer group">
      <CardContent className="p-8 space-y-4">
        <div className="size-16 rounded-2xl bg-slate-50 flex items-center justify-center transition-colors group-hover:bg-primary/10">
          {icon}
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-black tracking-tight text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">{description}</p>
        </div>
        <Button variant="outline" className="w-full h-10 rounded-xl font-bold text-xs uppercase tracking-widest mt-4">Generate PDF</Button>
      </CardContent>
    </Card>
  )
}

function AddBudgetModal({ open, onOpenChange, onSuccess }: {
  open: boolean,
  onOpenChange: (open: boolean) => void,
  onSuccess: () => void
}) {
  const [department, setDepartment] = useState("General")
  const [amount, setAmount] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await accountsApi.updateBudget({ department, budgetAmount: parseFloat(amount) })
      toast.success("Budget updated successfully")
      onSuccess()
    } catch (error) {
      toast.error("Failed to update budget")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl border-none p-0 overflow-hidden bg-white max-w-md">
        <DialogHeader className="p-8 bg-slate-900 text-white">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <ShieldAlert className="size-5 text-primary" />
            Set Department Budget
          </DialogTitle>
          <DialogDescription className="text-slate-400">Establish maximum spending limits for compliance.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Target Department</Label>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger className="h-12 rounded-xl border-slate-200">
                <SelectValue placeholder="Select Department" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {['General', 'OPD', 'IPD', 'Laboratory', 'Pharmacy', 'Administration'].map(d => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Monthly Budget Amount ($)</Label>
            <Input
              type="number"
              placeholder="e.g. 5000"
              className="h-12 rounded-xl border-slate-200 font-bold"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl font-bold">Cancel</Button>
            <Button type="submit" disabled={loading} className="rounded-xl h-12 px-8 font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20">
              {loading ? "Saving..." : "Apply Budget Limit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
