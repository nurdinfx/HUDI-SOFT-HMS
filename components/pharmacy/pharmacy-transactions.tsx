"use client"

import { useState, useEffect, useMemo } from "react"
import { 
  Search, 
  Plus, 
  Printer, 
  Download, 
  ArrowRight, 
  History, 
  TrendingUp, 
  Wallet, 
  RotateCcw, 
  User, 
  Filter, 
  MoreVertical, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Pill,
  ShoppingBag,
  CreditCard,
  Banknote,
  Smartphone,
  ShieldCheck,
  FileText,
  QrCode,
  Calendar
} from "lucide-react"
import { pharmacyApi, patientsApi, type Medicine, type Patient } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { StatCard } from "@/components/shared/stat-card"
import { StatusBadge } from "@/components/shared/status-badge"
import { toast } from "sonner"
import { format } from "date-fns"

interface Props {
  medicines: Medicine[]
  onRefresh: () => void
}

export function PharmacyTransactions({ medicines, onRefresh }: Props) {
  const [transactions, setTransactions] = useState<any[]>([])
  const [revenueStats, setRevenueStats] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  
  // Sale Modals & State
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false)
  const [patients, setPatients] = useState<Patient[]>([])
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [walkInName, setWalkInName] = useState("")
  const [cart, setCart] = useState<{ medicineId: string; name: string; quantity: number; unitPrice: number; total: number }[]>([])
  const [paymentMethod, setPaymentMethod] = useState("Cash")
  const [amountPaid, setAmountPaid] = useState<string>("")
  
  // Filtering & Export
  const [dateFilter, setDateFilter] = useState({ start: "", end: "" })
  const [activePaymentMethod, setActivePaymentMethod] = useState("all")

  // Patient Credit
  const [patientCredit, setPatientCredit] = useState(0)
  const [useCredit, setUseCredit] = useState(false)
  
  // Return Modal
  const [selectedTx, setSelectedTx] = useState<any>(null)
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false)
  const [returnItems, setReturnItems] = useState<any[]>([])
  
  // Invoice View
  const [invoiceToPrint, setInvoiceToPrint] = useState<any>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [txs, stats, pts] = await Promise.all([
        pharmacyApi.getTransactions(),
        pharmacyApi.getRevenueStats(),
        patientsApi.getAll()
      ])
      setTransactions(txs)
      setRevenueStats(stats)
      setPatients(pts)
    } catch (e) {
      toast.error("Failed to load financial data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (selectedPatientId) {
      pharmacyApi.getPatientCredits(selectedPatientId).then(res => setPatientCredit(res.balance || 0)).catch(() => setPatientCredit(0))
    } else {
      setPatientCredit(0)
    }
    setUseCredit(false)
  }, [selectedPatientId])

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchSearch = !search || 
        t.invoice_id.toLowerCase().includes(search.toLowerCase()) ||
        t.patient_name?.toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === "all" || t.status === statusFilter
      const matchMethod = activePaymentMethod === "all" || t.payment_method === activePaymentMethod
      const txDate = new Date(t.created_at).setHours(0,0,0,0)
      const matchStart = !dateFilter.start || txDate >= new Date(dateFilter.start).setHours(0,0,0,0)
      const matchEnd = !dateFilter.end || txDate <= new Date(dateFilter.end).setHours(23,59,59,999)
      
      return matchSearch && matchStatus && matchMethod && matchStart && matchEnd
    })
  }, [transactions, search, statusFilter, activePaymentMethod, dateFilter])

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.total, 0), [cart])

  const addToCart = (med: Medicine) => {
    const existing = cart.find(c => c.medicineId === med.id)
    if (existing) {
      if (existing.quantity >= med.quantity) {
        toast.error("Insufficient stock")
        return
      }
      setCart(cart.map(c => c.medicineId === med.id ? { ...c, quantity: c.quantity + 1, total: (c.quantity + 1) * c.unitPrice } : c))
    } else {
      if (med.quantity < 1) {
        toast.error("Out of stock")
        return
      }
      setCart([...cart, { 
        medicineId: med.id, 
        name: med.name, 
        quantity: 1, 
        unitPrice: med.sellingPrice, 
        total: med.sellingPrice 
      }])
    }
  }

  const handleCreateSale = async () => {
    if (cart.length === 0) {
      toast.error("Cart is empty")
      return
    }
    const appliedCreditValue = useCredit ? Math.min(patientCredit, cartTotal) : 0
    const netPayable = cartTotal - appliedCreditValue
    const paid = parseFloat(amountPaid) || 0
    const status = paid >= netPayable ? 'Paid' : (paid > 0 ? 'Partial' : 'Credit')
    
    setLoading(true)
    try {
      const payload = {
        patientId: selectedPatientId,
        patientName: selectedPatientId ? patients.find(p => p.id === selectedPatientId)?.firstName + ' ' + patients.find(p => p.id === selectedPatientId)?.lastName : (walkInName || 'Walk-in Customer'),
        items: cart.map(c => ({
          medicineId: c.medicineId,
          medicineName: c.name,
          quantity: c.quantity,
          unitPrice: c.unitPrice,
          totalPrice: c.total
        })),
        totalAmount: cartTotal,
        paidAmount: paid,
        appliedCredit: appliedCreditValue,
        paymentMethod,
        status
      }
      
      const res = await pharmacyApi.createTransaction(payload)
      toast.success(`Sale completed: ${res.invoiceId}`)
      setIsSaleModalOpen(false)
      setCart([])
      setAmountPaid("")
      setUseCredit(false)
      fetchData()
      onRefresh()
    } catch (e: any) {
      toast.error(e.message || "Failed to process sale")
    } finally {
      setLoading(false)
    }
  }

  const handleProcessReturn = async () => {
    const itemsToReturn = returnItems.filter(i => i.returnQty > 0)
    if (itemsToReturn.length === 0) return
    
    setLoading(true)
    try {
      await pharmacyApi.processReturn(selectedTx.id, itemsToReturn.map(i => ({
        itemId: i.id,
        quantity: i.returnQty,
        amount: i.returnQty * i.unit_price
      })))
      toast.success("Return processed and stock updated")
      setIsReturnModalOpen(false)
      fetchData()
      onRefresh()
    } catch (e) {
      toast.error("Failed to process return")
    } finally {
      setLoading(false)
    }
  }
  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) return toast.info("No data to export")
    const headers = ["Invoice ID", "Patient", "Medicines", "Total", "Paid", "Due", "Method", "Status", "Date"]
    const csvData = filteredTransactions.map(t => [
      t.invoice_id,
      t.patient_name || "-",
      `"${t.items_summary || ''}"`,
      t.total_amount,
      t.paid_amount,
      t.credit_amount,
      t.payment_method,
      t.status,
      format(new Date(t.created_at), 'yyyy-MM-dd HH:mm')
    ].join(","))
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...csvData].join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `pharmacy_ledger_${format(new Date(), 'yyyyMMdd')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const netRevenue = (revenueStats?.totalSales || 0) - (revenueStats?.totalReturns || 0)

  return (
    <div className="space-y-6">
      {/* DASHBOARD STATS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard 
          title="Revenue Today" 
          value={`$${revenueStats?.totalSales?.toLocaleString() || '0'}`} 
          icon={TrendingUp} 
          iconClassName="bg-emerald-100 text-emerald-600" 
        />
        <StatCard 
          title="Net Revenue" 
          value={`$${netRevenue.toLocaleString()}`} 
          icon={Banknote} 
          iconClassName="bg-indigo-100 text-indigo-600" 
        />
        <StatCard 
          title="Returns Value" 
          value={`$${revenueStats?.totalReturns?.toLocaleString() || '0'}`} 
          icon={RotateCcw} 
          iconClassName="bg-amber-100 text-amber-600" 
        />
        <StatCard 
          title="Transactions" 
          value={revenueStats?.transactionCount || 0} 
          icon={ShoppingBag} 
          iconClassName="bg-blue-100 text-blue-600" 
        />
        <StatCard 
          title="Outstanding Credit" 
          value={`$${revenueStats?.outstandingCredit?.toLocaleString() || '0'}`} 
          icon={Wallet} 
          iconClassName="bg-rose-100 text-rose-600" 
        />
      </div>

      <Card className="border-none shadow-xl bg-white/50 backdrop-blur-sm">
        <CardHeader className="pb-3 px-6 pt-6 flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <History className="size-5 text-primary" />
              Financial Hub & Sales Ledger
            </CardTitle>
            <CardDescription>Track all pharmacy financial movements and invoicing</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button className="h-10 rounded-xl px-6 font-bold shadow-lg shadow-primary/20" onClick={() => setIsSaleModalOpen(true)}>
              <Plus className="size-4 mr-2" />
              NEW TRANSACTION
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input 
                placeholder="Search Invoice, Patient name..." 
                className="pl-10 h-10 rounded-xl"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <div className="flex items-center gap-2 border rounded-xl overflow-hidden px-2 h-10 bg-white">
                <Calendar className="size-4 text-muted-foreground hidden sm:block" />
                <input 
                  type="date" 
                  className="text-xs bg-transparent outline-none max-w-[110px]"
                  value={dateFilter.start}
                  onChange={e => setDateFilter(prev => ({ ...prev, start: e.target.value }))}
                />
                <span className="text-muted-foreground text-xs">-</span>
                <input 
                  type="date" 
                  className="text-xs bg-transparent outline-none max-w-[110px]"
                  value={dateFilter.end}
                  onChange={e => setDateFilter(prev => ({ ...prev, end: e.target.value }))}
                />
              </div>
              <Select value={activePaymentMethod} onValueChange={setActivePaymentMethod}>
                <SelectTrigger className="w-32 h-10 rounded-xl">
                  <SelectValue placeholder="Pay Method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Method</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Card">Card</SelectItem>
                  <SelectItem value="Mobile Money">Mobile</SelectItem>
                  <SelectItem value="Insurance">Insurance</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32 h-10 rounded-xl">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Every Status</SelectItem>
                  <SelectItem value="Paid">Fully Paid</SelectItem>
                  <SelectItem value="Partial">Partial Payment</SelectItem>
                  <SelectItem value="Credit">Credit / Due</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" className="h-10 rounded-xl" onClick={handleExportCSV}>
                <Download className="size-4 mr-2" />
                Export Ledger
              </Button>
            </div>
          </div>

          <div className="border rounded-2xl overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="pl-6">Invoice ID</TableHead>
                  <TableHead>Customer / Patient</TableHead>
                  <TableHead>Medicines</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right pr-6">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((tx) => (
                  <TableRow key={tx.id} className="group hover:bg-muted/30 transition-colors">
                    <TableCell className="pl-6 font-mono text-xs font-bold text-primary">{tx.invoice_id}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold flex items-center gap-1.5 text-sm">
                          <User className="size-3 text-muted-foreground" />
                          {tx.patient_name}
                        </span>
                        <span className="text-[10px] text-muted-foreground uppercase">{format(new Date(tx.created_at), 'MMMM dd, p')}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 max-w-[200px] truncate" title={tx.items_summary}>{tx.items_summary}</TableCell>
                    <TableCell className="font-bold text-sm text-slate-900">${parseFloat(tx.total_amount).toLocaleString()}</TableCell>
                    <TableCell className="text-emerald-600 font-medium text-xs">${parseFloat(tx.paid_amount).toLocaleString()}</TableCell>
                    <TableCell className="text-rose-600 font-medium text-xs">${parseFloat(tx.credit_amount).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] font-bold rounded-sm h-5 flex items-center gap-1 w-fit">
                        {tx.payment_method === 'Cash' && <Banknote className="size-3" />}
                        {tx.payment_method === 'Card' && <CreditCard className="size-3" />}
                        {tx.payment_method === 'Mobile Money' && <Smartphone className="size-3" />}
                        {tx.payment_method}
                      </Badge>
                    </TableCell>
                    <TableCell><StatusBadge status={tx.status.toLowerCase()} /></TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="size-8 rounded-lg"
                          onClick={async () => {
                             setSelectedTx(tx);
                             const items = await pharmacyApi.getTransactionItems(tx.id);
                             setReturnItems(items.map(i => ({ ...i, returnQty: 0 })));
                             setIsReturnModalOpen(true);
                          }}
                        >
                          <RotateCcw className="size-3.5 text-amber-600" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="size-8 rounded-lg"
                          onClick={() => setInvoiceToPrint(tx)}
                        >
                          <Printer className="size-3.5 text-primary" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* RETURN MODAL */}
      <Dialog open={isReturnModalOpen} onOpenChange={setIsReturnModalOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-3xl">
          <DialogHeader className="p-8 bg-amber-600 text-white">
            <DialogTitle className="text-2xl font-black italic tracking-tighter uppercase">Process Item Return</DialogTitle>
            <DialogDescription className="text-amber-100 font-medium">
              Return stock to inventory and credit patient balance (Invoice: {selectedTx?.invoice_id})
            </DialogDescription>
          </DialogHeader>
          <div className="p-8 space-y-6">
            <div className="border rounded-2xl overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="text-[10px] font-black uppercase">Medicine</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-center">Purchased</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-right">Return Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returnItems.map((item, idx) => (
                    <TableRow key={item.id}>
                      <TableCell className="py-4">
                        <p className="font-bold text-sm">{item.medicine_name}</p>
                        <p className="text-[10px] text-slate-400">${item.unit_price} / unit</p>
                      </TableCell>
                      <TableCell className="text-center font-bold">{item.quantity}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Input 
                            type="number" 
                            className="w-20 h-9 rounded-lg text-center font-bold"
                            max={item.quantity}
                            min={0}
                            value={item.returnQty}
                            onChange={e => {
                              const val = Math.min(item.quantity, Math.max(0, parseInt(e.target.value) || 0))
                              setReturnItems(returnItems.map((it, i) => i === idx ? { ...it, returnQty: val } : it))
                            }}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex justify-between items-center">
               <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">Total Credit to Issue</span>
               <span className="text-xl font-black text-amber-600">
                 ${returnItems.reduce((sum, i) => sum + (i.returnQty * i.unit_price), 0).toLocaleString()}
               </span>
            </div>

            <Button 
              className="w-full h-12 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black uppercase tracking-widest shadow-xl shadow-amber-200 transition-all"
              onClick={handleProcessReturn}
              disabled={loading || returnItems.every(i => i.returnQty === 0)}
            >
              {loading ? "PROCESSING..." : "FINALIZE RETURN & RESTOCK"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* INVOICE VIEW / PRINT */}
      <Dialog open={!!invoiceToPrint} onOpenChange={() => setInvoiceToPrint(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden border-none shadow-2xl rounded-3xl">
          <div className="p-12 bg-white space-y-8" id="pharmacy-invoice">
             {/* Header */}
             <div className="flex justify-between items-start">
               <div className="flex items-center gap-4">
                 <div className="size-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black text-2xl tracking-tighter italic">HG</div>
                 <div>
                   <h1 className="text-2xl font-black tracking-tighter uppercase italic">International Hospital Pharmacy</h1>
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Medical Center · Pharmaceutical Division</p>
                 </div>
               </div>
               <div className="text-right space-y-1">
                 <Badge className="bg-slate-900 text-white font-black rounded-lg px-4 py-1">{invoiceToPrint?.status?.toUpperCase() || 'PAID'}</Badge>
                 <p className="text-[10px] font-black uppercase text-slate-400 pt-2 tracking-widest">Invoice Date</p>
                 <p className="text-xs font-bold">{invoiceToPrint && format(new Date(invoiceToPrint.created_at), 'MMMM dd, yyyy')}</p>
               </div>
             </div>

             <Separator className="bg-slate-100" />

             {/* Details */}
             <div className="grid grid-cols-2 gap-12">
               <div className="space-y-4">
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Bill From</p>
                 <div className="space-y-1">
                   <p className="font-bold text-sm">Pharmacy Department (HMS)</p>
                   <p className="text-xs text-slate-500">24/7 Dispensing Wing - A1</p>
                   <p className="text-xs text-slate-500">Contact: +1 (234) 567-890</p>
                 </div>
               </div>
               <div className="space-y-4 text-right">
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Bill To</p>
                 <div className="space-y-1">
                   <p className="font-bold text-sm uppercase italic underline decoration-primary decoration-4 underline-offset-4">{invoiceToPrint?.patient_name}</p>
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Transaction ID: {invoiceToPrint?.invoice_id}</p>
                 </div>
               </div>
             </div>

             {/* Items Table - Assuming we'd need to fetch items again or pass them */}
             <div className="border border-slate-100 rounded-3xl overflow-hidden shadow-sm bg-slate-50/50">
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400 px-4">
                    <span>Description</span>
                    <div className="flex gap-12">
                      <span className="w-12 text-center">Qty</span>
                      <span className="w-24 text-right">Price</span>
                      <span className="w-24 text-right">Total</span>
                    </div>
                  </div>
                  <Separator className="bg-slate-200/50" />
                  <div className="space-y-3">
                    {/* Note: Ideally we'd have the items here. For the print view we might fetch them when Print is clicked */}
                    <div className="px-4 flex justify-between items-center">
                       <p className="text-xs font-bold text-slate-800">{invoiceToPrint?.items_summary || '... pharmaceutical items as per transaction ...'}</p>
                       <p className="text-xl font-black tracking-tighter">${parseFloat(invoiceToPrint?.total_amount || 0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
             </div>

             {/* Totals */}
             <div className="flex justify-between items-end bg-slate-900 text-white rounded-3xl p-8 shadow-2xl shadow-slate-200">
               <div className="flex gap-12">
                 <div className="space-y-1">
                   <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Amount Paid</p>
                   <p className="text-lg font-black">${parseFloat(invoiceToPrint?.paid_amount || 0).toLocaleString()}</p>
                 </div>
                 <div className="space-y-1">
                   <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Balance Due</p>
                   <p className="text-lg font-black text-rose-400">${parseFloat(invoiceToPrint?.credit_amount || 0).toLocaleString()}</p>
                 </div>
               </div>
               <div className="text-right space-y-1">
                 <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Net Payable</p>
                 <p className="text-5xl font-black italic tracking-tighter tracking-[-0.05em]">${parseFloat(invoiceToPrint?.total_amount || 0).toLocaleString()}</p>
               </div>
             </div>

             <div className="flex justify-between items-center pt-8">
                <div className="size-20 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center opacity-30 grayscale">
                   <QrCode className="size-10 text-slate-400" />
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Authenticated By</p>
                  <p className="font-black text-sm uppercase italic">{invoiceToPrint?.created_by || 'AUTHORIZED PHARMACIST'}</p>
                  <p className="text-[8px] text-slate-400 italic">Electronic verification signature (hms-091-px)</p>
                </div>
             </div>
          </div>
          <DialogFooter className="p-8 bg-slate-50 border-t">
            <Button variant="ghost" className="rounded-xl font-bold" onClick={() => setInvoiceToPrint(null)}>Close</Button>
            <Button className="rounded-xl font-black px-10 gap-2 bg-slate-900 shadow-xl shadow-slate-200" onClick={() => window.print()}>
              <Printer className="size-4" />
              PRINT SECURE INVOICE
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* NEW TRANSACTION MODAL */}
      <Dialog open={isSaleModalOpen} onOpenChange={setIsSaleModalOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden border-none shadow-2xl rounded-3xl">
          <DialogHeader className="p-8 bg-slate-900 text-white">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Point of Sale (POS) Terminal</p>
                <DialogTitle className="text-3xl font-black italic tracking-tighter uppercase">Initialize Sale</DialogTitle>
                <DialogDescription className="text-slate-400 font-medium tracking-tight">Standardized pharmaceutical transaction workflow</DialogDescription>
              </div>
              <Pill className="size-10 text-primary/30" />
            </div>
          </DialogHeader>

          <div className="grid grid-cols-12 h-[600px]">
            {/* Left: Search & Medicine Selection */}
            <div className="col-span-12 md:col-span-8 p-8 flex flex-col gap-6 border-r border-slate-100">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Customer / Patient Binding</Label>
                  <Select value={selectedPatientId || "walkin"} onValueChange={(v) => setSelectedPatientId(v === "walkin" ? null : v)}>
                    <SelectTrigger className="h-12 rounded-2xl border-slate-200 font-bold">
                      <SelectValue placeholder="Search Patient..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      <SelectItem value="walkin" className="font-bold py-3">Walk-in Customer (General)</SelectItem>
                      {patients.map(p => (
                        <SelectItem key={p.id} value={p.id} className="font-bold py-3">
                          {p.firstName} {p.lastName} ({p.patientId})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {!selectedPatientId && (
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Customer Name</Label>
                    <Input 
                      placeholder="e.g. John Doe (Optional)" 
                      className="h-12 rounded-2xl border-slate-200 font-bold"
                      value={walkInName}
                      onChange={e => setWalkInName(e.target.value)}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Inventory Sourcing</Label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <Input 
                      placeholder="Scan barcode or type medicine name..." 
                      className="pl-12 h-14 rounded-2xl border-slate-200 font-bold bg-slate-50 focus:bg-white transition-all shadow-inner"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <ScrollArea className="flex-1 bg-white border border-slate-100 rounded-3xl shadow-inner p-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {medicines.filter(m => m.name.toLowerCase().includes(search.toLowerCase()) || m.genericName.toLowerCase().includes(search.toLowerCase())).map(m => (
                    <button 
                      key={m.id} 
                      className="p-4 rounded-2xl border border-transparent hover:border-primary/20 hover:bg-slate-50 transition-all flex flex-col text-left group disabled:opacity-50"
                      onClick={() => addToCart(m)}
                      disabled={m.quantity < 1}
                    >
                      <div className="flex justify-between items-start w-full">
                        <p className="font-black text-slate-900 uppercase tracking-tight truncate">{m.name}</p>
                        <Badge variant="outline" className={`${m.quantity > 10 ? 'text-emerald-600' : 'text-rose-600'} text-[9px] font-black border-none bg-slate-100 group-hover:bg-white`}>
                          Stock: {m.quantity}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-slate-400 italic mt-1">{m.genericName}</p>
                      <div className="mt-4 flex items-center justify-between w-full">
                        <span className="font-black text-primary tracking-tighter">${m.sellingPrice}</span>
                        <div className="p-1 px-3 bg-slate-900 text-white rounded-lg text-[9px] font-black opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100">
                          + ADD ITEM
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Right: Cart & Payment */}
            <div className="col-span-12 md:col-span-4 p-8 bg-slate-50 flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Order Manifest</h4>
                <div className="font-black text-slate-900 text-xs">{cart.length} ITEMS</div>
              </div>

              <ScrollArea className="flex-1 -mx-2 px-2">
                <div className="space-y-3">
                  {cart.map((item, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm relative group overflow-hidden">
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-bold text-xs text-slate-800 line-clamp-1 pr-4">{item.name}</p>
                        <button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition-all">
                          <X className="size-4" />
                        </button>
                      </div>
                      <div className="flex justify-between items-end">
                        <div className="flex items-center gap-3">
                          <button className="size-6 rounded-lg border border-slate-100 flex items-center justify-center text-xs font-bold hover:bg-slate-50" onClick={() => {
                            if (item.quantity > 1) {
                              setCart(cart.map((c, i) => i === idx ? { ...c, quantity: c.quantity - 1, total: (c.quantity - 1) * c.unitPrice } : c))
                            }
                          }}>-</button>
                          <span className="font-black text-xs min-w-4 text-center">{item.quantity}</span>
                          <button className="size-6 rounded-lg border border-slate-100 flex items-center justify-center text-xs font-bold hover:bg-slate-50" onClick={() => {
                            const med = medicines.find(m => m.id === item.medicineId)
                            if (med && item.quantity < med.quantity) {
                              setCart(cart.map((c, i) => i === idx ? { ...c, quantity: c.quantity + 1, total: (c.quantity + 1) * c.unitPrice } : c))
                            } else {
                              toast.error("Max stock reached")
                            }
                          }}>+</button>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-slate-400">${item.unitPrice} ea</p>
                          <p className="font-black text-sm text-slate-900">${item.total.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {cart.length === 0 && (
                    <div className="py-20 text-center flex flex-col items-center gap-3">
                      <ShoppingBag className="size-10 text-slate-200" />
                      <p className="text-xs text-slate-400 font-medium">Cart is currently empty.</p>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <Separator className="bg-slate-200" />

              <div className="space-y-4 pt-2">
                <div className="flex justify-between items-center px-2">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Payable</span>
                  <span className="text-2xl font-black text-slate-900 tracking-tighter">${cartTotal.toLocaleString()}</span>
                </div>

                {selectedPatientId && patientCredit > 0 && (
                  <div className="flex items-center justify-between px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-xl">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase text-indigo-600 tracking-widest">Available Credit</span>
                      <span className="text-sm font-bold text-indigo-900">${patientCredit.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="use-credit" className="text-[10px] font-bold text-indigo-700">Apply Credit</Label>
                      <input 
                        type="checkbox" 
                        id="use-credit"
                        checked={useCredit}
                        onChange={(e) => setUseCredit(e.target.checked)}
                        className="size-4 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                      />
                    </div>
                  </div>
                )}
                {useCredit && (
                  <div className="flex justify-between items-center px-2 py-1 bg-rose-50 rounded-lg text-rose-700">
                    <span className="text-[10px] font-black uppercase tracking-widest">Credit Applied</span>
                    <span className="text-sm font-black">-${Math.min(patientCredit, cartTotal).toLocaleString()}</span>
                  </div>
                )}
                {useCredit && (
                  <div className="flex justify-between items-center px-2 pt-2 border-t border-slate-200">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Net Payable</span>
                    <span className="text-xl font-black text-rose-600 tracking-tighter">${(cartTotal - (useCredit ? Math.min(patientCredit, cartTotal) : 0)).toLocaleString()}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  {['Cash', 'Card', 'Mobile Money', 'Insurance'].map(m => (
                    <button 
                      key={m} 
                      className={`h-11 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all shadow-sm flex flex-col items-center justify-center gap-1 ${paymentMethod === m ? 'bg-slate-900 text-white border-slate-900 shadow-xl scale-105' : 'bg-white text-slate-500 border-slate-100 hover:border-slate-300'}`}
                      onClick={() => setPaymentMethod(m)}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Amount Received ($)</Label>
                  <Input 
                    type="number" 
                    placeholder="Enter amount paid..." 
                    className="h-12 rounded-2xl border-none shadow-inner font-black text-lg bg-white"
                    value={amountPaid}
                    onChange={e => setAmountPaid(e.target.value)}
                  />
                  {parseFloat(amountPaid) > cartTotal && (
                    <p className="text-emerald-600 text-[10px] font-bold px-2 flex items-center gap-1">
                      Change to return: ${(parseFloat(amountPaid) - cartTotal).toFixed(2)}
                    </p>
                  )}
                  {selectedPatientId && parseFloat(amountPaid) < cartTotal && (
                    <p className="text-rose-600 text-[10px] font-bold px-2 flex items-center gap-1">
                      Due: ${(cartTotal - (parseFloat(amountPaid) || 0)).toFixed(2)} (Will be recorded as credit)
                    </p>
                  )}
                </div>

                <Button 
                   className="w-full h-14 rounded-2xl bg-primary text-white font-black text-sm shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                   onClick={handleCreateSale}
                   disabled={loading || cart.length === 0}
                >
                  {loading ? "PROCESSING..." : "FINALIZE TRANSACTION"}
                  <ArrowRight className="size-5 ml-4" />
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
