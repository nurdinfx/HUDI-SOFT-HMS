"use client"

import { useState, useEffect, useMemo } from "react"
import { 
    Search, Plus, Filter, Download, MoreVertical, 
    UserPlus, CreditCard, History, TrendingUp, AlertCircle,
    CheckCircle2, Clock, Landmark, FileText, ArrowUpRight, ArrowDownLeft,
    Edit, Trash2, Smartphone, Banknote, Building2
} from "lucide-react"
import { format } from "date-fns"
import { PAYMENT_METHODS } from "@/lib/payment-methods"
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
    const [txnSearch, setTxnSearch] = useState("")
    const [txnFilter, setTxnFilter] = useState("all")
    
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
        referenceNotes: "",
        discountAmount: ""
    })

    // Transaction Payment Dialog
    const [showTxnPayment, setShowTxnPayment] = useState(false)
    const [selectedTxn, setSelectedTxn] = useState<any>(null)
    const [txnPaymentAmount, setTxnPaymentAmount] = useState("")
    const [txnDiscountAmount, setTxnDiscountAmount] = useState("")
    const [txnPaymentMethod, setTxnPaymentMethod] = useState("cash")

    // Add Credit Dialog
    const [showAddCredit, setShowAddCredit] = useState(false)
    const [newCredit, setNewCredit] = useState({
        amount: "",
        notes: ""
    })

    // History Dialog
    const [showHistory, setShowHistory] = useState(false)
    const [historyLoading, setHistoryLoading] = useState(false)
    const [historyData, setHistoryData] = useState<any>(null)

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

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const matchesSearch = t.customer_name?.toLowerCase().includes(txnSearch.toLowerCase()) || 
                                  t.transaction_id?.toLowerCase().includes(txnSearch.toLowerCase());
            const matchesFilter = txnFilter === "all" ? true :
                                  txnFilter === "unpaid" ? parseFloat(t.remaining_balance) > 0 :
                                  parseFloat(t.remaining_balance) <= 0;
            return matchesSearch && matchesFilter;
        });
    }, [transactions, txnSearch, txnFilter])

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
        const amount = parseFloat(repayment.amount) || 0
        const discountAmount = parseFloat(repayment.discountAmount) || 0
        const outstanding = parseFloat(selectedCustomer.outstanding_balance)

        if (amount < 0 || discountAmount < 0) {
            return toast.error("Amounts cannot be negative")
        }
        if (amount === 0 && discountAmount === 0) {
            return toast.error("Please enter a payment or discount amount")
        }
        if (amount + discountAmount > outstanding) {
            return toast.error("Total payment and discount cannot exceed the outstanding balance")
        }
        if (amount > 0 && !repayment.paymentMethod) {
            return toast.error("Please select a payment method")
        }

        try {
            await creditApi.recordPayment({
                customerId: selectedCustomer.id,
                amount,
                paymentMethod: repayment.paymentMethod,
                referenceNotes: repayment.referenceNotes,
                discountAmount
            })
            toast.success("Repayment recorded")
            setShowRepayment(false)
            loadData()
        } catch (err: any) {
            toast.error(err.message || "Failed to record repayment")
        }
    }

    const handleRecordCredit = async () => {
        if (!newCredit.amount || parseFloat(newCredit.amount) <= 0) return toast.error("Invalid amount")
        try {
            await creditApi.addCredit({
                customerId: selectedCustomer.id,
                amount: parseFloat(newCredit.amount),
                notes: newCredit.notes
            })
            toast.success("Credit balance added successfully")
            setShowAddCredit(false)
            loadData()
        } catch (err: any) {
            toast.error(err.message || "Failed to add credit")
        }
    }

    const handlePayTransaction = async () => {
        if (!selectedTxn) return;
        const amount = parseFloat(txnPaymentAmount) || 0;
        const discountAmount = parseFloat(txnDiscountAmount) || 0;
        const remaining = parseFloat(selectedTxn.remaining_balance);

        if (amount < 0 || discountAmount < 0) {
            return toast.error("Amounts cannot be negative.");
        }
        if (amount === 0 && discountAmount === 0) {
            return toast.error("Please enter a payment or discount amount.");
        }
        if (amount + discountAmount > remaining) {
            return toast.error("Total payment and discount cannot exceed the remaining balance.");
        }
        if (amount > 0 && !txnPaymentMethod) {
            return toast.error("Please select a payment method.");
        }

        try {
            await creditApi.payTransaction(selectedTxn.id, { 
                paymentMethod: txnPaymentMethod, 
                amount, 
                discountAmount 
            });
            toast.success(`Payment applied successfully.`);
            setShowTxnPayment(false);
            loadData();
        } catch (err: any) {
             toast.error(err.message || "Failed to pay transaction");
        }
    }

    const handleViewHistory = async (customer: any) => {
        setSelectedCustomer(customer)
        setShowHistory(true)
        setHistoryLoading(true)
        try {
            const data = await creditApi.getCustomerDetails(customer.id)
            setHistoryData(data)
        } catch (err) {
            toast.error("Failed to load customer history")
        } finally {
            setHistoryLoading(false)
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

                                    <div className="flex flex-col gap-2">
                                        <div className="flex gap-2">
                                            <Button 
                                                variant="outline" 
                                                className="h-9 flex-1 text-[11px] rounded-xl font-bold border-slate-200 px-2"
                                                onClick={() => {
                                                    setSelectedCustomer(customer)
                                                    setRepayment({ amount: "", paymentMethod: "cash", referenceNotes: "", discountAmount: "" })
                                                    setShowRepayment(true)
                                                }}
                                            >
                                                Record Payment
                                            </Button>
                                            <Button 
                                                variant="outline" 
                                                className="h-9 flex-1 text-[11px] rounded-xl font-bold border-slate-200 px-2"
                                                onClick={() => {
                                                    setSelectedCustomer(customer)
                                                    setNewCredit({ amount: "", notes: "" })
                                                    setShowAddCredit(true)
                                                }}
                                            >
                                                Add Credit
                                            </Button>
                                        </div>
                                        <div className="flex justify-end gap-1.5">
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-50"
                                                onClick={() => handleViewHistory(customer)}
                                            >
                                                <History className="size-4" />
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-8 w-8 rounded-lg text-blue-500 hover:bg-blue-50"
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
                                                className="h-8 w-8 rounded-lg text-rose-500 hover:bg-rose-50"
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
                    <div className="flex items-center gap-2 mb-4">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                            <Input 
                                placeholder="Search by customer or txn id..." 
                                className="pl-10 h-10 bg-white border-slate-200 rounded-xl"
                                value={txnSearch}
                                onChange={e => setTxnSearch(e.target.value)}
                            />
                        </div>
                        <Select value={txnFilter} onValueChange={setTxnFilter}>
                            <SelectTrigger className="h-10 w-[180px] bg-white border-slate-200 rounded-xl">
                                <Filter className="mr-2 h-4 w-4 text-slate-400" /> 
                                <SelectValue placeholder="Filter Transactions" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                <SelectItem value="all">All Transactions</SelectItem>
                                <SelectItem value="unpaid">Unpaid Only</SelectItem>
                                <SelectItem value="paid">Paid Only</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

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
                                            <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {filteredTransactions.map((txn) => (
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
                                                <td className="px-6 py-4 text-right">
                                                    {parseFloat(txn.remaining_balance) > 0 ? (
                                                        <Button 
                                                            size="sm" 
                                                            className="h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all hover:-translate-y-0.5"
                                                            onClick={() => {
                                                                setSelectedTxn(txn);
                                                                setTxnPaymentAmount(txn.remaining_balance);
                                                                setTxnDiscountAmount("");
                                                                setTxnPaymentMethod("cash");
                                                                setShowTxnPayment(true);
                                                            }}
                                                        >
                                                            Pay
                                                        </Button>
                                                    ) : (
                                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-end gap-1">
                                                            <CheckCircle2 className="size-3 text-emerald-500" /> Paid
                                                        </span>
                                                    )}
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

            {/* TRANSACTION PAYMENT DIALOG */}
            <Dialog open={showTxnPayment} onOpenChange={setShowTxnPayment}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">Pay Transaction</DialogTitle>
                        <DialogDescription>
                            Apply payment to transaction <b>{selectedTxn?.transaction_id}</b> for <b>{selectedTxn?.customer_name}</b>.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center mb-2">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Remaining Balance</p>
                                <p className="text-xl font-black text-rose-600">${parseFloat(selectedTxn?.remaining_balance || 0).toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Original Total</p>
                                <p className="text-lg font-bold text-slate-900 text-right">${parseFloat(selectedTxn?.total_amount || 0).toLocaleString()}</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="font-bold text-slate-700">Payment Method <span className="text-rose-500">*</span></Label>
                            <div className="grid grid-cols-2 gap-2">
                                {PAYMENT_METHODS.map(m => (
                                    <button
                                        key={m.value}
                                        type="button"
                                        onClick={() => setTxnPaymentMethod(m.value)}
                                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${
                                            txnPaymentMethod === m.value
                                                ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                                        }`}
                                    >
                                        <span className="text-base">{m.icon}</span>
                                        <span>{m.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Payment Amount ($)</Label>
                                <Input 
                                    type="number" 
                                    placeholder="0.00" 
                                    className="h-12 text-lg font-bold"
                                    value={txnPaymentAmount}
                                    onChange={e => setTxnPaymentAmount(e.target.value)}
                                    max={selectedTxn?.remaining_balance}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Discount Amount ($)</Label>
                                <Input 
                                    type="number" 
                                    placeholder="0.00" 
                                    className="h-12 text-lg font-bold text-amber-600"
                                    value={txnDiscountAmount}
                                    onChange={e => setTxnDiscountAmount(e.target.value)}
                                    max={selectedTxn?.remaining_balance}
                                />
                            </div>
                        </div>
                        <p className="text-xs text-slate-400">Enter payment amount, discount amount, or both.</p>

                        {((parseFloat(txnPaymentAmount) || 0) + (parseFloat(txnDiscountAmount) || 0) > 0) && (
                            <div className="p-3 bg-slate-50 rounded-xl flex justify-between text-xs font-bold text-slate-700">
                                <span>Net Remaining After Payment:</span>
                                <span>
                                    ${Math.max(0, parseFloat(selectedTxn?.remaining_balance || 0) - (parseFloat(txnPaymentAmount) || 0) - (parseFloat(txnDiscountAmount) || 0)).toFixed(2)}
                                </span>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" className="h-10 rounded-xl" onClick={() => setShowTxnPayment(false)}>Cancel</Button>
                        <Button className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 shadow-lg text-white" onClick={handlePayTransaction}>Apply Payment</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ADD CREDIT DIALOG */}
            <Dialog open={showAddCredit} onOpenChange={setShowAddCredit}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">Add Credit / Loan</DialogTitle>
                        <DialogDescription>Add new credit balance for <b>{selectedCustomer?.full_name}</b></DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center mb-2">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Current Balance</p>
                                <p className="text-xl font-black text-slate-900">${parseFloat(selectedCustomer?.outstanding_balance || 0).toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Credit Limit</p>
                                <p className="text-xl font-black text-slate-900 text-right">${parseFloat(selectedCustomer?.credit_limit || 0).toLocaleString()}</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Credit Amount ($)</Label>
                            <Input 
                                type="number" 
                                placeholder="0.00" 
                                className="h-12 text-lg font-bold"
                                value={newCredit.amount}
                                onChange={e => setNewCredit({...newCredit, amount: e.target.value})}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Description / Notes</Label>
                            <Input placeholder="Reason for adding credit (e.g. Services, Manual adjustment)" value={newCredit.notes} onChange={e => setNewCredit({...newCredit, notes: e.target.value})} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" className="h-10 rounded-xl" onClick={() => setShowAddCredit(false)}>Cancel</Button>
                        <Button className="h-10 rounded-xl bg-slate-900 shadow-lg text-white" onClick={handleRecordCredit}>Add Credit</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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

                        <div className="grid grid-cols-2 gap-4">
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
                                <Label>Discount Amount ($)</Label>
                                <Input 
                                    type="number" 
                                    placeholder="0.00" 
                                    className="h-12 text-lg font-bold text-amber-600"
                                    value={repayment.discountAmount || ""}
                                    onChange={e => setRepayment({...repayment, discountAmount: e.target.value})}
                                />
                            </div>
                        </div>

                        {((parseFloat(repayment.amount) || 0) + (parseFloat(repayment.discountAmount) || 0) > 0) && (
                            <div className="p-3 bg-slate-50 rounded-xl flex justify-between text-xs font-bold text-slate-700">
                                <span>Remaining Balance After Payment:</span>
                                <span>
                                    ${Math.max(0, parseFloat(selectedCustomer?.outstanding_balance || 0) - (parseFloat(repayment.amount) || 0) - (parseFloat(repayment.discountAmount) || 0)).toFixed(2)}
                                </span>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label className="font-bold text-slate-700">Payment Method <span className="text-rose-500">*</span></Label>
                            <div className="grid grid-cols-2 gap-2">
                                {PAYMENT_METHODS.map(m => (
                                    <button
                                        key={m.value}
                                        type="button"
                                        onClick={() => setRepayment({...repayment, paymentMethod: m.value})}
                                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${
                                            repayment.paymentMethod === m.value
                                                ? "border-slate-800 bg-slate-900 text-white"
                                                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                                        }`}
                                    >
                                        <span className="text-base">{m.icon}</span>
                                        <span>{m.label}</span>
                                    </button>
                                ))}
                            </div>
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

            {/* CUSTOMER HISTORY DIALOG */}
            <Dialog open={showHistory} onOpenChange={setShowHistory}>
                <DialogContent className="max-w-2xl rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">Customer Ledger History</DialogTitle>
                        <DialogDescription>
                            Detailed financial records and statements for <b>{selectedCustomer?.full_name}</b> ({selectedCustomer?.customer_id})
                        </DialogDescription>
                    </DialogHeader>
                    {historyLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 space-y-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
                            <p className="text-xs text-slate-500 font-bold">Loading statement entries...</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-2xl">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Total Credit Taken</p>
                                    <p className="text-lg font-black text-slate-900 mt-1">${parseFloat(historyData?.customer?.total_credit_taken || 0).toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Total Repayments</p>
                                    <p className="text-lg font-black text-emerald-600 mt-1">${parseFloat(historyData?.customer?.total_payments_made || 0).toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Outstanding Balance</p>
                                    <p className="text-lg font-black text-rose-600 mt-1">${parseFloat(historyData?.customer?.outstanding_balance || 0).toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h4 className="text-sm font-bold text-slate-900 px-1">Statement Ledger</h4>
                                <ScrollArea className="h-[280px] rounded-xl border border-slate-100 bg-white">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-slate-50 sticky top-0 border-b border-slate-100 z-10">
                                            <tr>
                                                <th className="px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                                                <th className="px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</th>
                                                <th className="px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Debit (+)</th>
                                                <th className="px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Credit (-)</th>
                                                <th className="px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Balance</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {!historyData?.ledger || historyData.ledger.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="text-center py-12 text-xs font-bold text-slate-400">
                                                        No transaction records found
                                                    </td>
                                                </tr>
                                            ) : (
                                                historyData.ledger.map((entry: any) => (
                                                    <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors text-xs">
                                                        <td className="px-4 py-3 font-medium text-slate-500 whitespace-nowrap">
                                                            {(() => {
                                                                try {
                                                                    return format(new Date(entry.created_at || entry.date || ''), 'dd MMM yyyy');
                                                                } catch (e) {
                                                                    return entry.date || entry.created_at || '-';
                                                                }
                                                            })()}
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-700">
                                                            <div className="font-semibold">{entry.description}</div>
                                                            {entry.reference_id && (
                                                                <div className="text-[9px] font-mono text-slate-400 uppercase tracking-tight mt-0.5">Ref: {entry.reference_id}</div>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-semibold text-rose-600">
                                                            {entry.type === 'debit' ? `$${parseFloat(entry.amount).toFixed(2)}` : '-'}
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                                                            {entry.type === 'credit' ? `$${parseFloat(entry.amount).toFixed(2)}` : '-'}
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-bold text-slate-900">
                                                            ${parseFloat(entry.running_balance).toFixed(2)}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </ScrollArea>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button className="h-10 rounded-xl bg-slate-900 text-white" onClick={() => setShowHistory(false)}>Close Statement</Button>
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
