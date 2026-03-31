"use client"

import { useState, useEffect, useMemo } from "react"
import { 
    Search, Plus, Filter, Download, MoreVertical, 
    UserPlus, Banknote, History, TrendingUp, AlertCircle,
    CheckCircle2, Clock, Landmark, FileText, ArrowUpRight, ArrowDownLeft,
    Users, Briefcase, Wallet, BadgeDollarSign, CalendarDays, Edit, Trash2
} from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
    Dialog, DialogContent, DialogDescription, 
    DialogFooter, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { hrApi } from "@/lib/api"
import { cn } from "@/lib/utils"
import { EmployeeLedger } from "./employee-ledger"

export function EmployeeManagementContent() {
    const [activeTab, setActiveTab] = useState("employees")
    const [employees, setEmployees] = useState<any[]>([])
    const [payrollSummary, setPayrollSummary] = useState<any[]>([])
    const [stats, setStats] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [currentMonth, setCurrentMonth] = useState(format(new Date(), 'yyyy-MM'))
    
    // New Employee Dialog
    const [showNewEmployee, setShowNewEmployee] = useState(false)
    const [newEmployee, setNewEmployee] = useState({
        fullName: "",
        phone: "",
        email: "",
        position: "",
        department: "",
        base_salary: "",
        payment_method: "cash",
        address: ""
    })

    // Edit/Delete Employee
    const [showEditEmployee, setShowEditEmployee] = useState(false)
    const [editingEmployee, setEditingEmployee] = useState<any>(null)
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

    // Advance/Expense Dialog
    const [showExpense, setShowExpense] = useState(false)
    const [selectedEmployee, setSelectedEmployee] = useState<any>(null)
    const [expense, setExpense] = useState({
        type: "advance",
        amount: "",
        notes: "",
        date: format(new Date(), 'yyyy-MM-dd')
    })

    // Repayment Dialog
    const [showRepayment, setShowRepayment] = useState(false)
    const [repayment, setRepayment] = useState({
        amount: "",
        method: "cash",
        notes: "",
        date: format(new Date(), 'yyyy-MM-dd')
    })

    // Ledger Dialog
    const [showLedger, setShowLedger] = useState(false)
    const [selectedProfile, setSelectedProfile] = useState<any>(null)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setIsLoading(true)
        try {
            const [emps, statistics, payroll] = await Promise.all([
                hrApi.getEmployees(),
                hrApi.getStats(),
                hrApi.getPayrollSummary(currentMonth)
            ])
            setEmployees(Array.isArray(emps) ? emps : [])
            setStats(statistics || null)
            setPayrollSummary(Array.isArray(payroll) ? payroll : [])
        } catch (err) {
            toast.error("Failed to load HR data")
        } finally {
            setIsLoading(false)
        }
    }

    const filteredEmployees = useMemo(() => {
        return employees.filter(e => 
            e.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            e.employee_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            e.position?.toLowerCase().includes(searchQuery.toLowerCase())
        )
    }, [employees, searchQuery])

    const handleUpdateEmployee = async () => {
        if (!editingEmployee.full_name || !editingEmployee.base_salary) return toast.error("Name and Salary are required")
        try {
            await hrApi.updateEmployee(editingEmployee.id, {
                fullName: editingEmployee.full_name,
                phone: editingEmployee.phone,
                email: editingEmployee.email,
                position: editingEmployee.position,
                department: editingEmployee.department,
                base_salary: parseFloat(editingEmployee.base_salary),
                payment_method: editingEmployee.payment_method,
                address: editingEmployee.address,
                status: editingEmployee.status
            })
            toast.success("Employee updated")
            setShowEditEmployee(false)
            loadData()
        } catch (err) {
            toast.error("Failed to update employee")
        }
    }

    const handleDeleteEmployee = async (id: string) => {
        try {
            await hrApi.deleteEmployee(id)
            toast.success("Employee deleted")
            setDeleteConfirmId(null)
            loadData()
        } catch (err) {
            toast.error("Failed to delete employee")
        }
    }

    const handleCreateEmployee = async () => {
        if (!newEmployee.fullName || !newEmployee.base_salary) return toast.error("Name and Salary are required")
        try {
            await hrApi.registerEmployee({
                ...newEmployee,
                base_salary: parseFloat(newEmployee.base_salary)
            })
            toast.success("Employee registered")
            setShowNewEmployee(false)
            loadData()
        } catch (err) {
            toast.error("Failed to register employee")
        }
    }

    const handleRecordExpense = async () => {
        if (!expense.amount || parseFloat(expense.amount) <= 0) return toast.error("Invalid amount")
        try {
            await hrApi.recordExpense({
                employeeId: selectedEmployee.id,
                type: expense.type,
                amount: parseFloat(expense.amount),
                date: expense.date,
                notes: expense.notes
            })
            toast.success(`${expense.type.charAt(0).toUpperCase() + expense.type.slice(1)} recorded`)
            setShowExpense(false)
            loadData()
        } catch (err) {
            toast.error("Failed to record expense")
        }
    }

    const handleRecordRepayment = async () => {
        if (!repayment.amount || parseFloat(repayment.amount) <= 0) return toast.error("Invalid amount")
        try {
            await hrApi.recordRepayment(selectedEmployee.id, {
                amount: parseFloat(repayment.amount),
                method: repayment.method,
                notes: repayment.notes,
                date: repayment.date
            })
            toast.success(`Repayment recorded successfully`)
            setShowRepayment(false)
            setRepayment({...repayment, amount: '', notes: ''})
            loadData()
        } catch (err) {
            toast.error("Failed to record repayment")
        }
    }

    const handleProcessPayroll = async (empId: string) => {
        try {
            await hrApi.processPayroll({
                employeeId: empId,
                monthYear: currentMonth
            })
            toast.success("Payroll processed and marked as paid")
            loadData()
        } catch (err: any) {
            toast.error(err.message || "Failed to process payroll")
        }
    }

    const downloadCSV = (data: any[], filename: string) => {
        if (data.length === 0) return toast.error("No data to export")
        const headers = Object.keys(data[0]).join(",")
        const rows = data.map(row => 
            Object.values(row).map(value => `"${value}"`).join(",")
        ).join("\n")
        const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows
        const encodedUri = encodeURI(csvContent)
        const link = document.createElement("a")
        link.setAttribute("href", encodedUri)
        link.setAttribute("download", filename)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const handleExportPayroll = async () => {
        try {
            const report = await hrApi.getPayrollReport(currentMonth)
            downloadCSV(report, `Payroll_Report_${currentMonth}.csv`)
            toast.success("Payroll report downloaded")
        } catch (err) {
            toast.error("Failed to generate report")
        }
    }

    return (
        <div className="p-6 space-y-6 bg-slate-50/50 min-h-screen">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Employee Management</h1>
                    <p className="text-slate-500 text-sm font-medium">Professional staff payroll & expense tracking</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button 
                        variant="outline" 
                        className="h-10 rounded-xl bg-white shadow-sm border-slate-200"
                        onClick={handleExportPayroll}
                    >
                        <Download className="mr-2 h-4 w-4" /> Export Payroll
                    </Button>
                    <Dialog open={showNewEmployee} onOpenChange={setShowNewEmployee}>
                        <DialogTrigger asChild>
                            <Button className="h-10 rounded-xl bg-slate-900 text-white shadow-lg hover:bg-slate-800">
                                <UserPlus className="mr-2 h-4 w-4" /> Add Employee
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md rounded-2xl">
                            <DialogHeader>
                                <DialogTitle className="text-xl font-bold">Register New Staff</DialogTitle>
                                <DialogDescription>Enter employee details and base salary configuration.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Full Name</Label>
                                    <Input placeholder="Jane Smith" value={newEmployee.fullName} onChange={e => setNewEmployee({...newEmployee, fullName: e.target.value})} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Position</Label>
                                        <Input placeholder="Pharmacist" value={newEmployee.position} onChange={e => setNewEmployee({...newEmployee, position: e.target.value})} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Department</Label>
                                        <Select value={newEmployee.department} onValueChange={v => setNewEmployee({...newEmployee, department: v})}>
                                            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Clinical">Clinical</SelectItem>
                                                <SelectItem value="Pharmacy">Pharmacy</SelectItem>
                                                <SelectItem value="Laboratory">Laboratory</SelectItem>
                                                <SelectItem value="Admin">Admin</SelectItem>
                                                <SelectItem value="Accounts">Accounts</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Monthly Salary ($)</Label>
                                        <Input type="number" placeholder="500" value={newEmployee.base_salary} onChange={e => setNewEmployee({...newEmployee, base_salary: e.target.value})} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Payment Method</Label>
                                        <Select value={newEmployee.payment_method} onValueChange={v => setNewEmployee({...newEmployee, payment_method: v})}>
                                            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="cash">Cash</SelectItem>
                                                <SelectItem value="bank">Bank Transfer</SelectItem>
                                                <SelectItem value="mobile">Mobile Money</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setShowNewEmployee(false)}>Cancel</Button>
                                <Button onClick={handleCreateEmployee} className="bg-slate-900 text-white">Save Employee</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* STATS BARS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-none shadow-sm bg-white overflow-hidden group">
                    <CardContent className="p-0">
                        <div className="p-5 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Active Staff</p>
                                <h3 className="text-2xl font-black text-slate-900">{stats?.stats?.activeEmployees || 0}</h3>
                            </div>
                            <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                                <Users className="size-6 text-indigo-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                <Card className="border-none shadow-sm bg-white overflow-hidden group">
                    <CardContent className="p-0">
                        <div className="p-5 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Monthly Payroll Base</p>
                                <h3 className="text-2xl font-black text-slate-900">${parseFloat(stats?.stats?.monthlyPayrollBase || 0).toLocaleString()}</h3>
                            </div>
                            <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                                <Wallet className="size-6 text-emerald-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-white overflow-hidden group">
                    <CardContent className="p-0">
                        <div className="p-5 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Pending Advances</p>
                                <h3 className="text-2xl font-black text-slate-900">${parseFloat(stats?.stats?.pendingAdvances || 0).toLocaleString()}</h3>
                            </div>
                            <div className="h-12 w-12 rounded-2xl bg-rose-50 flex items-center justify-center group-hover:bg-rose-100 transition-colors">
                                <BadgeDollarSign className="size-6 text-rose-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-white p-1 rounded-xl shadow-sm border border-slate-100 w-auto mb-6">
                    <TabsTrigger value="employees" className="rounded-lg px-6 data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all">
                        Employees
                    </TabsTrigger>
                    <TabsTrigger value="payroll" className="rounded-lg px-6 data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all">
                        Payroll Processing
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="employees" className="space-y-4 m-0">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                            <Input 
                                placeholder="Search by name, ID or position..." 
                                className="pl-10 h-10 bg-white border-slate-200 rounded-xl"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {isLoading ? (
                            Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="h-48 bg-slate-100 animate-pulse rounded-2xl" />
                            ))
                        ) : filteredEmployees.map((emp) => (
                            <Card key={emp.id} className="border-none shadow-sm hover:shadow-md transition-shadow group rounded-2xl overflow-hidden bg-white">
                                <CardHeader className="p-5 pb-3">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
                                                {emp.full_name.charAt(0)}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-900 line-clamp-1 group-hover:text-slate-950 transition-colors">{emp.full_name}</h3>
                                                <p className="text-[10px] font-mono text-slate-400 mt-0.5">{emp.employee_id} • {emp.position}</p>
                                            </div>
                                        </div>
                                        <Badge className="rounded-md text-[9px] uppercase tracking-wider h-5 flex items-center justify-center bg-emerald-50 text-emerald-600 border-emerald-100">
                                            {emp.status}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-5 pt-0 space-y-4">
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="p-2.5 bg-slate-50 rounded-xl">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Salary</p>
                                            <p className="text-sm font-black text-slate-900 mt-1">${parseFloat(emp.base_salary).toLocaleString()}</p>
                                        </div>
                                        <div className="p-2.5 bg-slate-50 rounded-xl">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Joined</p>
                                            <p className="text-sm font-bold text-slate-600 mt-1">{format(new Date(emp.date_joined), 'MMM yyyy')}</p>
                                        </div>
                                        <div className={cn("p-2.5 rounded-xl border", parseFloat(emp.outstanding_balance) > 0 ? "bg-rose-50 border-rose-100" : "bg-emerald-50 border-emerald-100")}>
                                            <p className={cn("text-[9px] font-bold uppercase tracking-widest leading-none", parseFloat(emp.outstanding_balance) > 0 ? "text-rose-500" : "text-emerald-500")}>Advances</p>
                                            <p className={cn("text-sm font-black mt-1", parseFloat(emp.outstanding_balance) > 0 ? "text-rose-700" : "text-emerald-700")}>
                                                ${parseFloat(emp.outstanding_balance || 0).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <Button 
                                            variant="outline" 
                                            className="h-9 w-full text-xs rounded-xl font-bold border-slate-200 hover:bg-slate-50 text-slate-600"
                                            onClick={() => {
                                                setSelectedEmployee(emp)
                                                setShowExpense(true)
                                            }}
                                        >
                                            <Plus className="mr-2 size-3" /> Advance
                                        </Button>
                                        <Button 
                                            variant="outline" 
                                            className="h-9 w-full text-xs rounded-xl font-bold border-emerald-200 hover:bg-emerald-50 text-emerald-600 bg-emerald-50/50"
                                            onClick={() => {
                                                setSelectedEmployee(emp)
                                                setShowRepayment(true)
                                            }}
                                            disabled={parseFloat(emp.outstanding_balance || 0) <= 0}
                                        >
                                            <CheckCircle2 className="mr-2 size-3" /> Repay
                                        </Button>
                                    </div>
                                    <div className="flex justify-between items-center bg-slate-50/50 p-1 rounded-xl">
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-9 w-9 rounded-lg text-blue-500 hover:bg-blue-50"
                                            onClick={() => {
                                                setEditingEmployee({...emp})
                                                setShowEditEmployee(true)
                                            }}
                                        >
                                            <Edit className="size-4" />
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-9 w-9 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-200"
                                            onClick={() => {
                                                setSelectedProfile(emp)
                                                setShowLedger(true)
                                            }}
                                        >
                                            <FileText className="size-4" />
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-9 w-9 rounded-lg text-rose-500 hover:bg-rose-50"
                                            onClick={() => setDeleteConfirmId(emp.id)}
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="payroll" className="space-y-4 m-0">
                    <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
                        <CardHeader className="p-6 pb-2 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-lg font-bold">Monthly Payroll Summary</CardTitle>
                                <CardDescription>Calculated salary after advance deductions</CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <Label className="text-xs text-slate-500">Month:</Label>
                                <Input 
                                    type="month" 
                                    className="h-9 w-40 rounded-lg text-xs" 
                                    value={currentMonth} 
                                    onChange={e => {
                                        setCurrentMonth(e.target.value)
                                        loadData()
                                    }} 
                                />
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 border-y border-slate-100">
                                        <tr>
                                            <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Employee</th>
                                            <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Base Salary</th>
                                            <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Deductions</th>
                                            <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Net Payable</th>
                                            <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {payrollSummary.map((item) => (
                                            <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <p className="text-xs font-bold text-slate-900 leading-none">{item.full_name}</p>
                                                    <p className="text-[10px] font-mono text-slate-400 mt-1 uppercase tracking-tighter">{item.employee_id}</p>
                                                </td>
                                                <td className="px-6 py-4 font-medium text-slate-900 text-xs">${parseFloat(item.base_salary).toLocaleString()}</td>
                                                <td className="px-6 py-4">
                                                    <Badge className={cn("text-[10px] border-none font-bold", item.total_deductions > 0 ? "bg-rose-50 text-rose-600" : "bg-slate-50 text-slate-400")}>
                                                        -${parseFloat(item.total_deductions).toLocaleString()}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4 font-black text-slate-900 text-xs">${parseFloat(item.final_salary).toLocaleString()}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <Button 
                                                        className="h-8 rounded-lg text-[10px] font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 text-white"
                                                        onClick={() => handleProcessPayroll(item.id)}
                                                    >
                                                        Pay Salary
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* EXPENSE / ADVANCE DIALOG */}
            <Dialog open={showExpense} onOpenChange={setShowExpense}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">Record Advance / Expense</DialogTitle>
                        <DialogDescription>Recording deduction for <b>{selectedEmployee?.full_name}</b></DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center mb-2">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Base Monthly Salary</p>
                                <p className="text-xl font-black text-slate-900">${parseFloat(selectedEmployee?.base_salary || 0).toLocaleString()}</p>
                            </div>
                            <div className="h-10 w-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center">
                                <Landmark className="size-5 text-slate-400" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Type</Label>
                                <Select value={expense.type} onValueChange={v => setExpense({...expense, type: v})}>
                                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="advance">Salary Advance</SelectItem>
                                        <SelectItem value="loan">Employee Loan</SelectItem>
                                        <SelectItem value="expense">Staff Expense</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Amount ($)</Label>
                                <Input 
                                    type="number" 
                                    placeholder="0.00" 
                                    className="font-bold"
                                    value={expense.amount}
                                    onChange={e => setExpense({...expense, amount: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Date</Label>
                            <Input type="date" value={expense.date} onChange={e => setExpense({...expense, date: e.target.value})} />
                        </div>

                        <div className="space-y-2">
                            <Label>Reason / Notes</Label>
                            <Input placeholder="Personal emergency, transport, etc." value={expense.notes} onChange={e => setExpense({...expense, notes: e.target.value})} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" className="h-10 rounded-xl" onClick={() => setShowExpense(false)}>Cancel</Button>
                        <Button className="h-10 rounded-xl bg-slate-900 shadow-lg text-white font-bold" onClick={handleRecordExpense}>Record Deduction</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* REPAYMENT DIALOG */}
            <Dialog open={showRepayment} onOpenChange={setShowRepayment}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">Record Repayment</DialogTitle>
                        <DialogDescription>Employee <b>{selectedEmployee?.full_name}</b> is paying back their advance.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex justify-between items-center mb-2">
                            <div>
                                <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">Total Outstanding Debt</p>
                                <p className="text-xl font-black text-rose-700">${parseFloat(selectedEmployee?.outstanding_balance || 0).toLocaleString()}</p>
                            </div>
                            <div className="h-10 w-10 rounded-xl bg-white border border-rose-200 flex items-center justify-center">
                                <History className="size-5 text-rose-400" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Payment Method</Label>
                                <Select value={repayment.method} onValueChange={v => setRepayment({...repayment, method: v})}>
                                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="cash">Cash</SelectItem>
                                        <SelectItem value="bank">Bank Transfer</SelectItem>
                                        <SelectItem value="mobile">Mobile Money</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Amount ($)</Label>
                                <Input 
                                    type="number" 
                                    placeholder="0.00" 
                                    className="font-bold text-emerald-600 focus-visible:ring-emerald-500"
                                    value={repayment.amount}
                                    onChange={e => setRepayment({...repayment, amount: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Date</Label>
                            <Input type="date" value={repayment.date} onChange={e => setRepayment({...repayment, date: e.target.value})} />
                        </div>

                        <div className="space-y-2">
                            <Label>Notes</Label>
                            <Input placeholder="Direct cash repayment, etc." value={repayment.notes} onChange={e => setRepayment({...repayment, notes: e.target.value})} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" className="h-10 rounded-xl" onClick={() => setShowRepayment(false)}>Cancel</Button>
                        <Button className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 shadow-lg text-white font-bold" onClick={handleRecordRepayment}>Confirm Payment</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <EmployeeLedger 
                employee={selectedProfile}
                open={showLedger}
                onOpenChange={setShowLedger}
            />

            {/* EDIT EMPLOYEE DIALOG */}
            <Dialog open={showEditEmployee} onOpenChange={setShowEditEmployee}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">Edit Staff Details</DialogTitle>
                        <DialogDescription>Update employee information and configuration.</DialogDescription>
                    </DialogHeader>
                    {editingEmployee && (
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Full Name</Label>
                                <Input placeholder="Jane Smith" value={editingEmployee.full_name} onChange={e => setEditingEmployee({...editingEmployee, full_name: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Position</Label>
                                    <Input placeholder="Pharmacist" value={editingEmployee.position} onChange={e => setEditingEmployee({...editingEmployee, position: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Department</Label>
                                    <Select value={editingEmployee.department} onValueChange={v => setEditingEmployee({...editingEmployee, department: v})}>
                                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Clinical">Clinical</SelectItem>
                                            <SelectItem value="Pharmacy">Pharmacy</SelectItem>
                                            <SelectItem value="Laboratory">Laboratory</SelectItem>
                                            <SelectItem value="Admin">Admin</SelectItem>
                                            <SelectItem value="Accounts">Accounts</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Monthly Salary ($)</Label>
                                    <Input type="number" placeholder="500" value={editingEmployee.base_salary} onChange={e => setEditingEmployee({...editingEmployee, base_salary: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Payment Method</Label>
                                    <Select value={editingEmployee.payment_method} onValueChange={v => setEditingEmployee({...editingEmployee, payment_method: v})}>
                                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="cash">Cash</SelectItem>
                                            <SelectItem value="bank">Bank Transfer</SelectItem>
                                            <SelectItem value="mobile">Mobile Money</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Status</Label>
                                <Select value={editingEmployee.status} onValueChange={v => setEditingEmployee({...editingEmployee, status: v})}>
                                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="inactive">Inactive</SelectItem>
                                        <SelectItem value="on-leave">On Leave</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowEditEmployee(false)}>Cancel</Button>
                        <Button onClick={handleUpdateEmployee} className="bg-slate-900 text-white">Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* DELETE CONFIRMATION */}
            <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
                <DialogContent className="max-w-sm rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-rose-600">Delete Employee?</DialogTitle>
                        <DialogDescription>
                            This will permanently remove the employee and all their transaction history. This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="grid grid-cols-2 gap-2">
                        <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={() => deleteConfirmId && handleDeleteEmployee(deleteConfirmId)}>Confirm Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
