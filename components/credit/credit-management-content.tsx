"use client"

import { useState, useEffect, useMemo } from "react"
import { 
    Search, Plus, Filter, Download, MoreVertical, 
    UserPlus, CreditCard, History, TrendingUp, AlertCircle,
    CheckCircle2, Clock, Landmark, FileText, ArrowUpRight, ArrowDownLeft,
    Edit, Trash2
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
import { creditApi } from "@/lib/api"
import { cn } from "@/lib/utils"

export function CreditManagementContent() {
    const [activeTab, setActiveTab] = useState("customers")
    const [customers, setCustomers] = useState<any[]>([])
    const [transactions, setTransactions] = useState<any[]>([])
    const [stats, setStats] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    
    // New Customer Dialog
    const [showNewCustomer, setShowNewCustomer] = useState(false)
    const [newCustomer, setNewCustomer] = useState({
        fullName: "",
        phone: "",
        address: "",
        patientId: "",
        creditLimit: 1000
    })

    // Edit/Delete Customer
    const [showEditCustomer, setShowEditCustomer] = useState(false)
    const [editingCustomer, setEditingCustomer] = useState<any>(null)
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

    // Repayment Dialog
    const [showRepayment, setShowRepayment] = useState(false)
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
    const [repayment, setRepayment] = useState({
        amount: "",
        paymentMethod: "cash",
        referenceNotes: ""
    })

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setIsLoading(true)
        try {
            const [custs, txns, statistics] = await Promise.all([
                creditApi.getCustomers(),
                creditApi.getTransactions(),
                creditApi.getStats()
            ])
            setCustomers(Array.isArray(custs) ? custs : [])
            setTransactions(Array.isArray(txns) ? txns : [])
            setStats(statistics || null)
        } catch (err) {
            toast.error("Failed to load credit data")
        } finally {
            setIsLoading(false)
        }
    }

    const filteredCustomers = useMemo(() => {
        return customers.filter(c => 
            c.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.customer_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.phone?.includes(searchQuery)
        )
    }, [customers, searchQuery])

    const handleUpdateCustomer = async () => {
        if (!editingCustomer.full_name) return toast.error("Full Name is required")
        try {
            await creditApi.updateCustomer(editingCustomer.id, {
                fullName: editingCustomer.full_name,
                phone: editingCustomer.phone,
                address: editingCustomer.address,
                creditLimit: parseFloat(editingCustomer.credit_limit),
                status: editingCustomer.status
            })
            toast.success("Customer updated")
            setShowEditCustomer(false)
            loadData()
        } catch (err) {
            toast.error("Failed to update customer")
        }
    }

    const handleDeleteCustomer = async (id: string) => {
        try {
            await creditApi.deleteCustomer(id)
            toast.success("Customer deleted")
            setDeleteConfirmId(null)
            loadData()
        } catch (err) {
            toast.error("Failed to delete customer")
        }
    }

    const handleCreateCustomer = async () => {
        if (!newCustomer.fullName) return toast.error("Full Name is required")
        try {
            await creditApi.registerCustomer(newCustomer)
            toast.success("Credit customer registered")
            setShowNewCustomer(false)
            loadData()
        } catch (err) {
            toast.error("Failed to register customer")
        }
    }

    const handleRecordRepayment = async () => {
        if (!repayment.amount || parseFloat(repayment.amount) <= 0) return toast.error("Invalid amount")
        try {
            await creditApi.recordPayment({
                customerId: selectedCustomer.id,
                amount: parseFloat(repayment.amount),
                paymentMethod: repayment.paymentMethod,
                referenceNotes: repayment.referenceNotes
            })
            toast.success("Repayment recorded")
            setShowRepayment(false)
            loadData()
        } catch (err) {
            toast.error("Failed to record repayment")
        }
    }

    return (
        <div className="p-6 space-y-6 bg-slate-50/50 min-h-screen">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Credit Management</h1>
                    <p className="text-slate-500 text-sm font-medium">Professional customer loan & repayment tracking</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" className="h-10 rounded-xl bg-white shadow-sm border-slate-200">
                        <Download className="mr-2 h-4 w-4" /> Export Report
                    </Button>
                    <Dialog open={showNewCustomer} onOpenChange={setShowNewCustomer}>
                        <DialogTrigger asChild>
                            <Button className="h-10 rounded-xl bg-slate-900 text-white shadow-lg hover:bg-slate-800">
                                <UserPlus className="mr-2 h-4 w-4" /> Register Customer
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md rounded-2xl">
                            <DialogHeader>
                                <DialogTitle className="text-xl font-bold">Register Credit Customer</DialogTitle>
                                <DialogDescription>Register a patient or customer for credit eligibility.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Full Name</Label>
                                    <Input placeholder="John Doe" value={newCustomer.fullName} onChange={e => setNewCustomer({...newCustomer, fullName: e.target.value})} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Phone</Label>
                                        <Input placeholder="+252 61..." value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Patient ID (Optional)</Label>
                                        <Input placeholder="P-1234" value={newCustomer.patientId} onChange={e => setNewCustomer({...newCustomer, patientId: e.target.value})} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Credit Limit ($)</Label>
                                    <Input type="number" value={newCustomer.creditLimit} onChange={e => setNewCustomer({...newCustomer, creditLimit: parseInt(e.target.value)})} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Address</Label>
                                    <Input value={newCustomer.address} onChange={e => setNewCustomer({...newCustomer, address: e.target.value})} />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setShowNewCustomer(false)}>Cancel</Button>
                                <Button onClick={handleCreateCustomer} className="bg-slate-900">Register Customer</Button>
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
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Outstanding</p>
                                <h3 className="text-2xl font-black text-slate-900">${parseFloat(stats?.stats?.total_outstanding || 0).toLocaleString()}</h3>
                            </div>
                            <div className="h-12 w-12 rounded-2xl bg-rose-50 flex items-center justify-center group-hover:bg-rose-100 transition-colors">
                                <TrendingUp className="size-6 text-rose-500" />
                            </div>
                        </div>
                        <div className="px-5 pb-4">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-rose-600">
                                <AlertCircle className="size-3" /> {stats?.stats?.limit_exceeded_count || 0} Exceeded limit
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                <Card className="border-none shadow-sm bg-white overflow-hidden group">
                    <CardContent className="p-0">
                        <div className="p-5 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Active Accounts</p>
                                <h3 className="text-2xl font-black text-slate-900">{stats?.stats?.total_customers || 0}</h3>
                            </div>
                            <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                                <CheckCircle2 className="size-6 text-emerald-500" />
                            </div>
                        </div>
                        <div className="px-5 pb-4">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                                Good Standing
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* More stats if needed */}
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-white p-1 rounded-xl shadow-sm border border-slate-100 w-auto mb-6">
                    <TabsTrigger value="customers" className="rounded-lg px-6 data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all">
                        Customers
                    </TabsTrigger>
                    <TabsTrigger value="transactions" className="rounded-lg px-6 data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all">
                        Transactions
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="customers" className="space-y-4 m-0">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                            <Input 
                                placeholder="Search customers..." 
                                className="pl-10 h-10 bg-white border-slate-200 rounded-xl"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Button variant="outline" className="h-10 rounded-xl border-slate-200 bg-white">
                            <Filter className="mr-2 h-4 w-4 text-slate-400" /> Filter
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {isLoading ? (
                            Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="h-48 bg-slate-100 animate-pulse rounded-2xl" />
                            ))
                        ) : filteredCustomers.map((customer) => (
                            <Card key={customer.id} className="border-none shadow-sm hover:shadow-md transition-shadow group rounded-2xl overflow-hidden bg-white">
                                <CardHeader className="p-5 pb-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-slate-900 line-clamp-1 group-hover:text-slate-950 transition-colors">{customer.full_name}</h3>
                                            <p className="text-[10px] font-mono text-slate-400 mt-0.5">{customer.customer_id}</p>
                                        </div>
                                        <Badge className={cn("rounded-md text-[9px] uppercase tracking-wider h-5 flex items-center justify-center", 
                                            customer.status === 'active' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"
                                        )}>
                                            {customer.status}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-5 pt-0 space-y-4">
                                    <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
                                        <div>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Owed Balance</p>
                                            <p className={cn("text-xl font-black mt-1.5 tracking-tight", 
                                                parseFloat(customer.outstanding_balance) > parseFloat(customer.credit_limit) ? "text-rose-600" : "text-slate-900"
                                            )}>
                                                ${parseFloat(customer.outstanding_balance).toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Limit</p>
                                            <p className="text-xs font-bold text-slate-600 mt-1.5">${parseFloat(customer.credit_limit).toLocaleString()}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-2">
                                        <Button 
                                            variant="outline" 
                                            className="h-9 flex-1 text-xs rounded-xl font-bold border-slate-200"
                                            onClick={() => {
                                                setSelectedCustomer(customer)
                                                setRepayment({ amount: "", paymentMethod: "cash", referenceNotes: "" })
                                                setShowRepayment(true)
                                            }}
                                        >
                                            Record Payment
                                        </Button>
                                        <div className="flex gap-1.5">
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-9 w-9 rounded-xl text-blue-500 hover:bg-blue-50"
                                                onClick={() => {
                                                    setEditingCustomer({...customer})
                                                    setShowEditCustomer(true)
                                                }}
                                            >
                                                <Edit className="size-4" />
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-9 w-9 rounded-xl text-rose-500 hover:bg-rose-50"
                                                onClick={() => setDeleteConfirmId(customer.id)}
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="transactions" className="space-y-4 m-0">
                    <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
                        <CardHeader className="p-6 pb-2">
                            <CardTitle className="text-lg font-bold">Credit Transaction History</CardTitle>
                            <CardDescription>Track all deferred payments from POS</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 border-y border-slate-100">
                                        <tr>
                                            <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date / ID</th>
                                            <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Customer</th>
                                            <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Items</th>
                                            <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Amount</th>
                                            <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Remaining</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {transactions.map((txn) => (
                                            <tr key={txn.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <p className="text-xs font-bold text-slate-900 leading-none">{format(new Date(txn.date), 'dd MMM yyyy')}</p>
                                                    <p className="text-[10px] font-mono text-slate-400 mt-1 uppercase tracking-tighter">{txn.transaction_id}</p>
                                                </td>
                                                <td className="px-6 py-4 font-medium text-slate-900 text-xs">{txn.customer_name}</td>
                                                <td className="px-6 py-4">
                                                    <p className="text-xs text-slate-600 line-clamp-1 max-w-[200px]">{txn.items_summary}</p>
                                                </td>
                                                <td className="px-6 py-4 font-bold text-slate-900 text-xs">${parseFloat(txn.total_amount).toLocaleString()}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <Badge className={cn("text-[10px]", 
                                                        parseFloat(txn.remaining_balance) > 0 ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                                                    )}>
                                                        ${parseFloat(txn.remaining_balance).toLocaleString()}
                                                    </Badge>
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

            {/* REPAYMENT DIALOG */}
            <Dialog open={showRepayment} onOpenChange={setShowRepayment}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">Record Repayment</DialogTitle>
                        <DialogDescription>Recording payment for <b>{selectedCustomer?.full_name}</b></DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center mb-2">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Current Balance</p>
                                <p className="text-xl font-black text-slate-900">${parseFloat(selectedCustomer?.outstanding_balance || 0).toLocaleString()}</p>
                            </div>
                            <div className="h-10 w-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center">
                                <FileText className="size-5 text-slate-400" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Repayment Amount ($)</Label>
                            <Input 
                                type="number" 
                                placeholder="0.00" 
                                className="h-12 text-lg font-bold"
                                value={repayment.amount}
                                onChange={e => setRepayment({...repayment, amount: e.target.value})}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Payment Method</Label>
                            <Select value={repayment.paymentMethod} onValueChange={v => setRepayment({...repayment, paymentMethod: v})}>
                                <SelectTrigger className="h-11 rounded-xl">
                                    <SelectValue placeholder="Select Method" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="cash">Cash Payment</SelectItem>
                                    <SelectItem value="bank">Bank Transfer</SelectItem>
                                    <SelectItem value="mobile">Mobile Money</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Reference / Notes</Label>
                            <Input placeholder="Receipt #, Txn ID, etc." value={repayment.referenceNotes} onChange={e => setRepayment({...repayment, referenceNotes: e.target.value})} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" className="h-10 rounded-xl" onClick={() => setShowRepayment(false)}>Cancel</Button>
                        <Button className="h-10 rounded-xl bg-slate-900 shadow-lg text-white" onClick={handleRecordRepayment}>Record Payment</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* EDIT CUSTOMER DIALOG */}
            <Dialog open={showEditCustomer} onOpenChange={setShowEditCustomer}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">Edit Credit Customer</DialogTitle>
                        <DialogDescription>Update customer credit profile and limits.</DialogDescription>
                    </DialogHeader>
                    {editingCustomer && (
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Full Name</Label>
                                <Input placeholder="John Doe" value={editingCustomer.full_name} onChange={e => setEditingCustomer({...editingCustomer, full_name: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Phone</Label>
                                    <Input placeholder="+252 61..." value={editingCustomer.phone} onChange={e => setEditingCustomer({...editingCustomer, phone: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Status</Label>
                                    <Select value={editingCustomer.status} onValueChange={v => setEditingCustomer({...editingCustomer, status: v})}>
                                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active">Active</SelectItem>
                                            <SelectItem value="blocked">Blocked</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Credit Limit ($)</Label>
                                <Input type="number" value={editingCustomer.credit_limit} onChange={e => setEditingCustomer({...editingCustomer, credit_limit: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                                <Label>Address</Label>
                                <Input value={editingCustomer.address} onChange={e => setEditingCustomer({...editingCustomer, address: e.target.value})} />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowEditCustomer(false)}>Cancel</Button>
                        <Button onClick={handleUpdateCustomer} className="bg-slate-900 text-white">Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* DELETE CUSTOMER CONFIRMATION */}
            <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
                <DialogContent className="max-w-sm rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-rose-600">Delete Customer Profile?</DialogTitle>
                        <DialogDescription>
                            This will permanently remove the customer credit record and all transaction history. This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="grid grid-cols-2 gap-2">
                        <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={() => deleteConfirmId && handleDeleteCustomer(deleteConfirmId)}>Confirm Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
