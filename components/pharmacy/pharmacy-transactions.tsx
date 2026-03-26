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
  Calendar,
  LayoutGrid,
  Activity,
  UserCheck,
  Stethoscope,
  ChevronRight,
  Minus,
  Trash2,
  Check
} from "lucide-react"
import { pharmacyApi, patientsApi, posApi, creditApi, settingsApi, type Medicine, type Patient, type HospitalSettings } from "@/lib/api"
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
  const [cart, setCart] = useState<any[]>([])
  const [paymentMethod, setPaymentMethod] = useState("ZAAD")
  const [amountPaid, setAmountPaid] = useState<string>("")
  
  // Filtering & Export
  const [dateFilter, setDateFilter] = useState({ start: "", end: "" })
  const [activePaymentMethod, setActivePaymentMethod] = useState("all")

  // Patient Credit (Internal)
  const [patientCredit, setPatientCredit] = useState(0)
  const [useCredit, setUseCredit] = useState(false)
  
  // Return Modal State
  const [selectedTx, setSelectedTx] = useState<any>(null)
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false)
  const [returnItems, setReturnItems] = useState<any[]>([])
  const [exchangeCart, setExchangeCart] = useState<any[]>([])
  const [isExchangeMode, setIsExchangeMode] = useState(false)
  const [exchangeSearch, setExchangeSearch] = useState("")
  
  // Advanced POS State
  const [activeCategory, setActiveCategory] = useState<'All' | 'Pharmacy' | 'Labs' | 'Services'>('Pharmacy')
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [discount, setDiscount] = useState(0)
  const [insuranceInfo, setInsuranceInfo] = useState({ company: '', policyNumber: '', claimAmount: 0 })
  const [creditCustomers, setCreditCustomers] = useState<any[]>([])
  const [selectedCreditCustomerId, setSelectedCreditCustomerId] = useState<string | null>(null)
  const [pendingCharges, setPendingCharges] = useState<any[]>([])
  const [isLoadingCharges, setIsLoadingCharges] = useState(false)
  
  // Invoice View
  const [invoiceToPrint, setInvoiceToPrint] = useState<any>(null)
  const [settings, setSettings] = useState<HospitalSettings | null>(null)

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
    fetchCreditCustomers()
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const s = await settingsApi.get()
      setSettings(s)
    } catch (e) {
      console.error("Failed to load settings", e)
    }
  }

  useEffect(() => {
    if (selectedPatientId) {
      loadPendingCharges(selectedPatientId)
    } else {
      setPendingCharges([])
    }
  }, [selectedPatientId])

  const fetchCreditCustomers = async () => {
    try {
      const data = await creditApi.getCustomers()
      setCreditCustomers(data)
    } catch (e) {
      console.error("Failed to fetch credit customers", e)
    }
  }

  const loadPendingCharges = async (patientId: string) => {
    setIsLoadingCharges(true)
    try {
      const { items } = await posApi.getPendingCharges(patientId)
      if (items.length > 0) {
        setPendingCharges(items)
        toast.info(`Loaded ${items.length} pending charges automatically`)
        // Add them to cart
        items.forEach(item => {
           setCart(prev => {
             const exists = prev.find(c => c.id === item.id)
             if (exists) return prev
             return [...prev, {
               id: item.id,
               name: item.name,
               quantity: item.quantity,
               unitPrice: item.unitPrice,
               total: item.unitPrice * item.quantity,
               type: item.type,
               medicineId: item.type === 'medicine' ? item.id : null,
               prescriptionId: item.prescriptionId,
               labTestId: item.labTestId,
               visitId: item.visitId
             }]
           })
        })
      }
    } catch (e) {
      console.error("Failed to load pending charges", e)
    } finally {
      setIsLoadingCharges(false)
    }
  }

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
        t.invoice_id?.toLowerCase().includes(search.toLowerCase()) ||
        t.patient_name?.toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === "all" || t.status?.toLowerCase() === statusFilter.toLowerCase()
      const matchMethod = activePaymentMethod === "all" || t.payment_method === activePaymentMethod
      const txDate = new Date(t.created_at).setHours(0,0,0,0)
      const matchStart = !dateFilter.start || txDate >= new Date(dateFilter.start).setHours(0,0,0,0)
      const matchEnd = !dateFilter.end || txDate <= new Date(dateFilter.end).setHours(23,59,59,999)
      
      return matchSearch && matchStatus && matchMethod && matchStart && matchEnd
    })
  }, [transactions, search, statusFilter, activePaymentMethod, dateFilter])

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.total, 0), [cart])

  const addToCart = (med: Medicine) => {
    const existing = cart.find(c => c.medicineId === med.id && c.type === 'medicine')
    if (existing) {
      if (existing.quantity >= med.quantity) {
        toast.error("Insufficient stock")
        return
      }
      setCart(cart.map(c => (c.medicineId === med.id && c.type === 'medicine') ? { ...c, quantity: c.quantity + 1, total: (c.quantity + 1) * c.unitPrice } : c))
    } else {
      if (med.quantity < 1) {
        toast.error("Out of stock")
        return
      }
      setCart([...cart, { 
        id: med.id,
        medicineId: med.id, 
        name: med.name, 
        quantity: 1, 
        unitPrice: med.sellingPrice, 
        total: med.sellingPrice,
        type: 'medicine'
      }])
    }
  }

  const handleCreateSale = async () => {
    if (cart.length === 0) {
      toast.error("Cart is empty")
      return
    }
    const totalAfterDiscount = Math.max(0, cartTotal - discount)
    const appliedCreditValue = useCredit ? Math.min(patientCredit, totalAfterDiscount) : 0
    const netPayable = totalAfterDiscount - appliedCreditValue
    const paid = parseFloat(amountPaid) || 0
    const status = paid >= netPayable ? 'Paid' : (paid > 0 ? 'Partial' : 'Credit')
    
    setLoading(true)
    try {
      const payload = {
        patientId: selectedPatientId,
        patientName: selectedPatientId ? patients.find(p => p.id === selectedPatientId)?.firstName + ' ' + patients.find(p => p.id === selectedPatientId)?.lastName : (walkInName || 'Walk-in Customer'),
        items: cart.map(c => ({
          id: c.id,
          medicineId: c.medicineId,
          medicineName: c.name,
          quantity: c.quantity,
          unitPrice: c.unitPrice,
          totalPrice: c.total,
          type: c.type,
          prescriptionId: c.prescriptionId,
          labTestId: c.labTestId,
          visitId: c.visitId
        })),
        totalAmount: cartTotal,
        paidAmount: paid,
        appliedCredit: appliedCreditValue,
        paymentMethod,
        discount,
        creditCustomerId: selectedCreditCustomerId,
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
    if (itemsToReturn.length === 0 && exchangeCart.length === 0) return
    
    setLoading(true)
    try {
      await pharmacyApi.processReturn(selectedTx.id, {
        items: itemsToReturn.map(i => ({
          itemId: i.id,
          quantity: i.returnQty,
          amount: i.returnQty * i.unit_price
        })),
        exchangeItems: exchangeCart.map(c => ({
          medicineId: c.medicineId,
          medicineName: c.name,
          quantity: c.quantity,
          unitPrice: c.unitPrice,
          totalPrice: c.total
        })),
        paymentMethod: paymentMethod
      })
      toast.success("Return/Exchange processed successfully")
      setIsReturnModalOpen(false)
      setExchangeCart([])
      setIsExchangeMode(false)
      fetchData()
      onRefresh()
    } catch (e: any) {
      toast.error(e.message || "Failed to process return")
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

  const handlePrintReceipt = () => {
    const printContent = document.getElementById('thermal-receipt-content')
    if (!printContent) return

    const iframe = document.createElement('iframe')
    iframe.style.position = 'absolute'
    iframe.style.top = '-1000px'
    document.body.appendChild(iframe)

    const doc = iframe.contentWindow?.document
    if (doc) {
        doc.open()
        doc.write(`
            <html>
            <head>
                <title>Pharmacy Receipt</title>
                <style>
                    @page { size: 58mm auto; margin: 0; }
                    body { padding: 0; margin: 0; background: #fff; width: 58mm; color: #000; }
                    .thermal-receipt { 
                        width: 58mm; 
                        padding: 2mm 1mm; 
                        font-family: 'Inter', 'Segoe UI', Arial, sans-serif; 
                        font-size: 13px; 
                        line-height: 1.1; 
                        box-sizing: border-box; 
                        margin: 0;
                        text-align: center;
                    }
                    .thermal-header { margin-bottom: 5px; }
                    .thermal-title { font-size: 18px; font-weight: 800; margin-bottom: 2px; text-transform: uppercase; }
                    .thermal-subtitle { font-size: 14px; font-weight: 600; margin-bottom: 1px; }
                    .thermal-payment-codes { font-size: 11px; font-weight: bold; margin-bottom: 5px; border-bottom: 1px dashed #000; padding-bottom: 5px; }
                    .thermal-payment-codes div { margin: 2px 0; }
                    
                    .thermal-info { font-size: 12px; margin-bottom: 5px; text-align: left; padding: 0 2mm; }
                    .thermal-info div { margin-bottom: 3px; }
                    .thermal-label { font-weight: bold; }
                    
                    .thermal-separator { border-top: 1px dashed #000; margin: 5px 0; }
                    
                    .thermal-table { width: 100%; text-align: left; border-collapse: collapse; font-size: 12px; padding: 0 1mm; }
                    .thermal-table th { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 4px 0; text-align: left; font-weight: bold; }
                    .thermal-table td { padding: 4px 0; }
                    
                    .thermal-totals { border-top: 1px dashed #000; padding: 5px 2mm; text-align: left; }
                    .thermal-row { display: flex; justify-content: space-between; margin-bottom: 3px; font-weight: bold; }
                    
                    .thermal-footer { text-align: center; font-size: 13px; padding-top: 5px; font-weight: bold; }
                    .qr-container { display: flex; justify-content: center; margin: 8px 0; }
                    .qr-image { width: 140px; height: 140px; }
                </style>
            </head>
            <body>
                ${printContent.outerHTML}
            </body>
            </html>
        `)
        doc.close()

        setTimeout(() => {
            iframe.contentWindow?.focus()
            iframe.contentWindow?.print()
            setTimeout(() => {
                document.body.removeChild(iframe)
            }, 1000)
        }, 250)
    }
  }

  const statsToDisplay = useMemo(() => {
    if (!revenueStats) return null
    if (activePaymentMethod === "all" && statusFilter === "all" && !dateFilter.start && !dateFilter.end) {
      return revenueStats
    }

    const totalSales = filteredTransactions.reduce((sum, t) => sum + (parseFloat(t.total_amount) || 0), 0)
    const txCount = filteredTransactions.length
    const totalDue = filteredTransactions.reduce((sum, t) => sum + (parseFloat(t.credit_amount) || 0), 0)
    
    // For filtered view, we'll use sales minus returns from the BASE stats if no specific transactions are filtered
    // But usually user wants sales only if specific filter is active.
    return {
      ...revenueStats,
      totalSales: totalSales,
      transactionCount: txCount,
      outstandingCredit: totalDue
    }
  }, [revenueStats, filteredTransactions, activePaymentMethod, statusFilter, dateFilter])

  const netRevenue = (statsToDisplay?.totalSales || 0) - (statsToDisplay?.totalReturns || 0)

  return (
    <div className="space-y-6">
      {/* DASHBOARD STATS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard 
          title="Revenue Today" 
          value={`$${Number(statsToDisplay?.totalSales || 0).toLocaleString()}`} 
          icon={TrendingUp} 
          iconClassName="bg-emerald-100 text-emerald-600" 
        />
        <StatCard 
          title="Net Revenue" 
          value={`$${Number(netRevenue || 0).toLocaleString()}`} 
          icon={Banknote} 
          iconClassName="bg-indigo-100 text-indigo-600" 
        />
        <StatCard 
          title="Returns Value" 
          value={`$${Number(statsToDisplay?.totalReturns || 0).toLocaleString()}`} 
          icon={RotateCcw} 
          iconClassName="bg-amber-100 text-amber-600" 
        />
        <StatCard 
          title="Transactions" 
          value={statsToDisplay?.transactionCount || 0} 
          icon={ShoppingBag} 
          iconClassName="bg-blue-100 text-blue-600" 
        />
        <StatCard 
          title="Outstanding Credit" 
          value={`$${Number(statsToDisplay?.outstandingCredit || 0).toLocaleString()}`} 
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
                  <SelectItem value="ZAAD">ZAAD</SelectItem>
                  <SelectItem value="SAHAL">SAHAL</SelectItem>
                  <SelectItem value="EDAHAB">EDAHAB</SelectItem>
                  <SelectItem value="MYCASH">MYCASH</SelectItem>
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

          <div className="overflow-x-auto">
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
                    <TableCell className="font-bold text-sm text-slate-900">${Number(tx.total_amount || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-emerald-600 font-medium text-xs">${Number(tx.paid_amount || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-rose-600 font-medium text-xs">${Number(tx.credit_amount || 0).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] font-bold rounded-sm h-5 flex items-center gap-1 w-fit">
                        {tx.payment_method && <Smartphone className="size-3" />}
                        {tx.payment_method}
                      </Badge>
                    </TableCell>
                    <TableCell><StatusBadge status={tx.status?.toLowerCase() || "pending"} /></TableCell>
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
        <DialogContent className="max-w-2xl w-[95vw] sm:w-full p-0 overflow-hidden rounded-3xl h-[85vh] sm:h-auto flex flex-col">
          <DialogHeader className="p-4 sm:p-8 bg-amber-600 text-white shrink-0">
            <DialogTitle className="text-2xl font-black italic tracking-tighter uppercase">Process Item Return</DialogTitle>
            <DialogDescription className="text-amber-100 font-medium">
              Return stock to inventory and credit patient balance (Invoice: {selectedTx?.invoice_id})
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1">
            <div className="p-4 sm:p-8 space-y-6">
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
            
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase text-slate-400">Inventory Sourcing (Exchange Items)</p>
                <Button 
                  variant="outline" 
                   size="sm"
                  className={`h-7 rounded-lg text-[9px] font-black uppercase transition-all ${isExchangeMode ? 'bg-amber-600 text-white border-amber-600' : 'text-slate-500'}`}
                  onClick={() => setIsExchangeMode(!isExchangeMode)}
                >
                  {isExchangeMode ? "Close Exchange Hub" : "+ Add Exchange Items"}
                </Button>
              </div>

              {isExchangeMode && (
                <div className="space-y-4 animate-in slide-in-from-top duration-300">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
                    <Input 
                      placeholder="Search for exchange replacement..." 
                      className="pl-10 h-10 rounded-xl border-slate-200"
                      value={exchangeSearch}
                      onChange={e => setExchangeSearch(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
                    {medicines.filter(m => m.name?.toLowerCase().includes(exchangeSearch.toLowerCase())).map(m => (
                      <button 
                        key={m.id} 
                        className="p-2.5 rounded-xl border border-slate-100 hover:border-amber-200 hover:bg-amber-50/30 text-left transition-all group"
                        onClick={() => {
                          const existing = exchangeCart.find(c => c.medicineId === m.id)
                          if (existing) {
                            if (existing.quantity >= m.quantity) return toast.error("Stock limit")
                             setExchangeCart(exchangeCart.map(c => c.medicineId === m.id ? { ...c, quantity: c.quantity + 1, total: (c.quantity + 1) * c.unitPrice } : c))
                          } else {
                            if (m.quantity < 1) return toast.error("Out of stock")
                            setExchangeCart([...exchangeCart, { medicineId: m.id, name: m.name, quantity: 1, unitPrice: m.sellingPrice, total: m.sellingPrice }])
                          }
                        }}
                      >
                         <div className="flex justify-between items-start gap-1">
                           <span className="text-[10px] font-black uppercase truncate">{m.name}</span>
                           <span className="text-[9px] font-bold text-amber-600">${m.sellingPrice}</span>
                         </div>
                         <p className="text-[8px] text-slate-400">{m.quantity} in stock</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {exchangeCart.length > 0 && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Current Exchange Cart</p>
                  <div className="space-y-2">
                    {exchangeCart.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs">
                         <div className="flex items-center gap-2">
                            <button onClick={() => setExchangeCart(exchangeCart.filter((_, i) => i !== idx))}><X className="size-3 text-rose-400"/></button>
                            <span className="font-bold">{item.name}</span>
                            <span className="text-slate-400 ml-1">x{item.quantity}</span>
                         </div>
                         <span className="font-black">${item.total.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                 <p className="text-[8px] font-black text-amber-900 uppercase">Total Return Value</p>
                 <p className="text-lg font-black text-amber-600">
                   ${Number(returnItems.reduce((sum, i) => sum + (i.returnQty * i.unit_price), 0)).toLocaleString()}
                 </p>
              </div>
              <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                 <p className="text-[8px] font-black text-indigo-900 uppercase">New Products Value</p>
                 <p className="text-lg font-black text-indigo-600">
                   ${Number(exchangeCart.reduce((sum, i) => sum + i.total, 0)).toLocaleString()}
                 </p>
              </div>
            </div>

            <div className={`p-4 rounded-xl border flex justify-between items-center ${
              (returnItems.reduce((sum, i) => sum + (i.returnQty * i.unit_price), 0) - exchangeCart.reduce((sum, i) => sum + i.total, 0)) >= 0
              ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'
            }`}>
               <span className="text-[10px] font-black uppercase tracking-wider">
                 {(returnItems.reduce((sum, i) => sum + (i.returnQty * i.unit_price), 0) - exchangeCart.reduce((sum, i) => sum + i.total, 0)) >= 0 
                 ? "Net Credit to Patient" : "Net Due from Patient"}
               </span>
               <span className={`text-xl font-black ${
                 (returnItems.reduce((sum, i) => sum + (i.returnQty * i.unit_price), 0) - exchangeCart.reduce((sum, i) => sum + i.total, 0)) >= 0
                 ? 'text-emerald-600' : 'text-rose-600'
               }`}>
                 ${Math.abs(returnItems.reduce((sum, i) => sum + (i.returnQty * i.unit_price), 0) - exchangeCart.reduce((sum, i) => sum + i.total, 0)).toLocaleString()}
               </span>
            </div>

            {exchangeCart.length > 0 && Math.abs(returnItems.reduce((sum, i) => sum + (i.returnQty * i.unit_price), 0) - exchangeCart.reduce((sum, i) => sum + i.total, 0)) > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase text-slate-400">Payment method for difference</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {['ZAAD', 'SAHAL', 'EDAHAB', 'MYCASH'].map(m => (
                    <button 
                      key={m} 
                      className={`h-8 rounded-lg border text-[8px] font-black uppercase transition-all ${paymentMethod === m ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-500 border-slate-100'}`}
                      onClick={() => setPaymentMethod(m)}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Button 
              className={`w-full h-12 rounded-xl text-white font-black uppercase tracking-widest shadow-xl transition-all ${
                exchangeCart.length > 0 ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' : 'bg-amber-600 hover:bg-amber-700 shadow-amber-200'
              }`}
              onClick={handleProcessReturn}
              disabled={loading || (returnItems.every(i => i.returnQty === 0) && exchangeCart.length === 0)}
            >
              {loading ? "PROCESSING..." : (exchangeCart.length > 0 ? "FINALIZE EXCHANGE" : "FINALIZE RETURN & RESTOCK")}
            </Button>
           </div>
         </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* INVOICE VIEW / PRINT */}
      <Dialog open={!!invoiceToPrint} onOpenChange={() => setInvoiceToPrint(null)}>
        <DialogContent className="sm:max-w-[900px] w-[95vw] max-h-[90vh] p-0 overflow-hidden border-none shadow-2xl rounded-3xl flex flex-col">
          <div className="p-12 bg-white space-y-8 overflow-y-auto flex-1" id="pharmacy-invoice">
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
                       <p className="text-xl font-black tracking-tighter">${Number(invoiceToPrint?.total_amount || 0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
             </div>

             {/* Totals */}
             <div className="flex justify-between items-end bg-slate-900 text-white rounded-3xl p-8 shadow-2xl shadow-slate-200">
               <div className="flex gap-12">
                 <div className="space-y-1">
                   <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Amount Paid</p>
                   <p className="text-lg font-black">${Number(invoiceToPrint?.paid_amount || 0).toLocaleString()}</p>
                 </div>
                 <div className="space-y-1">
                   <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Balance Due</p>
                   <p className="text-lg font-black text-rose-400">${Number(invoiceToPrint?.credit_amount || 0).toLocaleString()}</p>
                 </div>
               </div>
               <div className="text-right space-y-1">
                 <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Net Payable</p>
                 <p className="text-5xl font-black italic tracking-tighter tracking-[-0.05em]">${Number(invoiceToPrint?.total_amount || 0).toLocaleString()}</p>
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
            <Button className="rounded-xl font-black px-10 gap-2 bg-slate-900 shadow-xl shadow-slate-200" onClick={handlePrintReceipt}>
              <Printer className="size-4" />
              PRINT 58mm RECEIPT
            </Button>
          </DialogFooter>

          {/* Hidden Thermal Receipt Content */}
          <div id="thermal-receipt-content" className="hidden">
            <div className="thermal-receipt">
              <div className="thermal-header">
                <div className="thermal-title">{settings?.name || "HMS PHARMACY"}</div>
                <div className="thermal-subtitle">Official Receipt</div>
                <div className="thermal-info" style={{ textAlign: 'center', marginTop: '2px' }}>
                  {settings?.address} <br/> Tel: {settings?.phone}
                </div>
              </div>

              <div className="thermal-payment-codes">
                {settings?.pharmacy_zaad && <div>ZAAD: {settings.pharmacy_zaad}</div>}
                {settings?.pharmacy_sahal && <div>SAHAL: {settings.pharmacy_sahal}</div>}
                {settings?.pharmacy_edahab && <div>EDAHAB: {settings.pharmacy_edahab}</div>}
                {settings?.pharmacy_mycash && <div>MYCASH: {settings.pharmacy_mycash}</div>}
              </div>

              <div className="thermal-info">
                <div><span className="thermal-label">Invoice:</span> {invoiceToPrint?.invoice_id}</div>
                <div><span className="thermal-label">Date:</span> {invoiceToPrint?.created_at && format(new Date(invoiceToPrint.created_at), "dd/MM/yyyy HH:mm")}</div>
                <div><span className="thermal-label">Patient:</span> {invoiceToPrint?.patient_name}</div>
                <div><span className="thermal-label">Method:</span> {invoiceToPrint?.payment_method}</div>
              </div>

              <table className="thermal-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{invoiceToPrint?.items_summary || "Pharmaceutical Items"}</td>
                    <td style={{ textAlign: 'right' }}>${Number(invoiceToPrint?.total_amount || 0).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>

              <div className="thermal-totals">
                <div className="thermal-row">
                  <span>SUBTOTAL</span>
                  <span>${Number(invoiceToPrint?.total_amount || 0).toLocaleString()}</span>
                </div>
                {Number(invoiceToPrint?.discount || 0) > 0 && (
                  <div className="thermal-row">
                    <span>DISCOUNT</span>
                    <span>-${Number(invoiceToPrint.discount).toLocaleString()}</span>
                  </div>
                )}
                <div className="thermal-row" style={{ fontSize: '16px', marginTop: '4px', borderTop: '1px solid #000', paddingTop: '4px' }}>
                  <span>TOTAL</span>
                  <span>${Number((invoiceToPrint?.total_amount || 0) - (invoiceToPrint?.discount || 0)).toLocaleString()}</span>
                </div>
                <div className="thermal-row">
                  <span>PAID</span>
                  <span>${Number(invoiceToPrint?.paid_amount || 0).toLocaleString()}</span>
                </div>
                <div className="thermal-row">
                  <span>BALANCE</span>
                  <span>${Number(invoiceToPrint?.credit_amount || 0).toLocaleString()}</span>
                </div>
              </div>

              <div className="qr-container">
                <div style={{ padding: '10px', border: '1px solid #000', borderRadius: '4px' }}>
                   <div style={{ fontSize: '10px', fontWeight: 'bold' }}>SCAN TO VERIFY</div>
                   <div style={{ fontSize: '8px' }}>{invoiceToPrint?.invoice_id}</div>
                </div>
              </div>

              <div className="thermal-footer">
                Thank You for visiting us! <br/>
                Get well soon.
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isSaleModalOpen} onOpenChange={setIsSaleModalOpen}>
        <DialogContent className="sm:max-w-[95vw] w-[95vw] lg:max-w-[1500px] h-[95vh] p-0 overflow-hidden border-none shadow-2xl rounded-3xl flex flex-col focus:outline-none">
          {/* Advanced POS Header */}
          <DialogHeader className="px-4 sm:px-8 py-3 sm:py-4 bg-white border-b flex flex-col sm:flex-row items-center justify-between gap-4 sm:space-y-0 text-left">
             <div className="flex items-center gap-4">
                <div className="size-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600">
                   <LayoutGrid className="size-6" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-black italic tracking-tighter uppercase leading-none">Billing & POS</DialogTitle>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.1em] mt-1">Fast Checkout Terminal</p>
                </div>
             </div>
             
             <div className="flex-1 w-full sm:max-w-xl sm:mx-12 order-3 sm:order-2 flex items-center gap-4">
                <div className="relative flex-1">
                   <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <QrCode className="size-4 text-slate-400" />
                   </div>
                   <Input 
                      placeholder="Scan patient QR or search by name/ID..." 
                      className="pl-12 h-10 sm:h-12 rounded-full border-slate-200 bg-slate-50 focus:bg-white transition-all font-bold placeholder:font-medium text-xs sm:text-sm"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                   />
                   {search && (
                     <div className="absolute top-14 left-0 w-full bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 p-2 overflow-hidden">
                        {patients.filter(p => p.firstName.toLowerCase().includes(search.toLowerCase()) || p.lastName.toLowerCase().includes(search.toLowerCase()) || p.patientId.toLowerCase().includes(search.toLowerCase())).slice(0, 5).map(p => (
                          <button 
                            key={p.id}
                            className="w-full p-4 flex items-center justify-between rounded-xl hover:bg-slate-50 transition-all text-left group"
                            onClick={() => {
                               setSelectedPatientId(p.id)
                               setSearch("")
                            }}
                          >
                             <div>
                               <p className="font-bold text-sm text-slate-900 leading-none">{p.firstName} {p.lastName}</p>
                               <p className="text-[10px] text-slate-400 font-bold mt-1">{p.patientId} · {p.phone}</p>
                             </div>
                             <ChevronRight className="size-4 text-slate-200 group-hover:text-primary transition-all" />
                          </button>
                        ))}
                     </div>
                   )}
                </div>

                {selectedPatientId && (
                  <div className="hidden lg:flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full border border-emerald-100 animate-in fade-in zoom-in duration-300 min-w-fit shrink-0">
                     <div className="size-6 bg-white rounded-full flex items-center justify-center shadow-sm">
                        <User className="size-3.5" />
                     </div>
                     <div className="flex flex-col leading-tight">
                        <span className="font-black text-[10px] uppercase truncate max-w-[120px]">
                           {patients.find(p => p.id === selectedPatientId)?.firstName} {patients.find(p => p.id === selectedPatientId)?.lastName}
                        </span>
                        <span className="text-[8px] font-bold text-emerald-500/80 uppercase tracking-widest leading-none mt-0.5">
                           {patients.find(p => p.id === selectedPatientId)?.patientId}
                        </span>
                     </div>
                     <button 
                        className="ml-2 hover:bg-emerald-100 p-1 rounded-full text-emerald-400 hover:text-emerald-600 transition-colors"
                        onClick={() => setSelectedPatientId(null)}
                     >
                        <X className="size-3" />
                     </button>
                  </div>
                )}
             </div>

             <div className="flex items-center gap-2 sm:gap-3 order-2 sm:order-3 w-full sm:w-auto justify-end">
                <Button 
                  variant="outline" 
                  className={`h-9 sm:h-11 rounded-full font-black text-[9px] sm:text-[10px] uppercase tracking-widest gap-2 ${!selectedPatientId ? 'bg-slate-900 text-white border-slate-900' : 'text-slate-500'}`}
                  onClick={() => setSelectedPatientId(null)}
                >
                  <UserCheck className="size-3.5 sm:size-4" />
                  <span className="hidden xs:inline">Walking Customer</span>
                  <span className="xs:hidden">Walk-in</span>
                </Button>
                <Button 
                  variant="outline" 
                   className="h-9 sm:h-11 rounded-full font-black text-[9px] sm:text-[10px] uppercase tracking-widest gap-2 text-slate-500"
                   onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                >
                  <RotateCcw className="size-3.5 sm:size-4" />
                  History
                </Button>
             </div>
          </DialogHeader>

          <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
            {/* Left: Product Selection */}
            <div className="flex-[2] flex flex-col bg-slate-50/30 overflow-hidden border-b lg:border-b-0">
              <div className="p-6 border-b bg-white/50 backdrop-blur-xl flex items-center justify-between gap-4">
                 <div className="flex bg-slate-100 p-1 rounded-2xl overflow-x-auto max-w-full hide-scrollbar">
                    {['All', 'Pharmacy', 'Labs', 'Services'].map((cat: any) => (
                      <button 
                        key={cat}
                        className={`px-4 sm:px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeCategory === cat ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        onClick={() => setActiveCategory(cat)}
                      >
                        {cat}
                      </button>
                    ))}
                 </div>
                 <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
                    <Input 
                      placeholder="Search catalog items..." 
                      className="pl-9 h-10 rounded-xl border-slate-100 bg-white shadow-sm font-bold text-xs"
                    />
                 </div>
              </div>

              <ScrollArea className="flex-1 p-4 sm:p-6">
                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                   {medicines.filter(m => activeCategory === 'All' || activeCategory === 'Pharmacy').map(m => (
                     <Card 
                        key={m.id} 
                        className="rounded-3xl border-slate-100 hover:border-primary/20 hover:shadow-2xl hover:shadow-primary/5 transition-all group cursor-pointer relative overflow-hidden flex flex-col h-full min-h-[120px] sm:min-h-[140px]"
                        onClick={() => addToCart(m)}
                     >
                       <CardContent className="p-5 flex flex-col flex-1">
                          <div className="flex justify-between items-start mb-4">
                             <Badge className="bg-emerald-50 text-emerald-600 font-black text-[8px] uppercase border-none rounded-lg px-2 py-0.5">Pharmacy</Badge>
                             <Badge variant="outline" className={`font-black text-[9px] border-none rounded-lg px-2 py-0.5 ${m.quantity > 50 ? 'bg-slate-100 text-slate-400' : 'bg-rose-50 text-rose-500'}`}>
                               {m.quantity} LEFT
                             </Badge>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-black text-slate-900 uppercase italic tracking-tighter leading-tight line-clamp-2">{m.name}</h4>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">${m.sellingPrice}</p>
                          </div>
                          
                          <div className="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100">
                             <div className="size-10 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                                <Plus className="size-5" />
                             </div>
                          </div>
                       </CardContent>
                     </Card>
                   ))}
                 </div>
              </ScrollArea>
            </div>

            {/* Right: Order Summary */}
            <div className="flex-1 lg:max-w-[400px] xl:max-w-[450px] bg-white lg:border-l flex flex-col overflow-hidden">
               <div className="p-4 sm:p-6 border-b bg-slate-50/50 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                     <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Order Summary</h3>
                     {isLoadingCharges ? (
                        <div className="flex items-center gap-2 animate-pulse">
                           <Activity className="size-3 text-primary animate-spin" />
                           <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Checking prescriptions...</span>
                        </div>
                     ) : pendingCharges.length > 0 && (
                        <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 px-2.5 py-1 rounded-full animate-in slide-in-from-top-2 duration-500">
                           <CheckCircle2 className="size-3" />
                           <span className="text-[8px] font-black uppercase tracking-widest">Loaded {pendingCharges.length} Charges</span>
                        </div>
                     )}
                  </div>
                  {!selectedPatientId && (
                     <div className="flex items-center gap-3 bg-slate-100/50 p-3 rounded-2xl border border-slate-200/50">
                        <div className="size-9 bg-white rounded-xl flex items-center justify-center text-slate-400">
                           <ShoppingBag className="size-5" />
                        </div>
                        <div>
                           <p className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Checkout Mode</p>
                           <h4 className="font-black text-slate-900 leading-none uppercase italic tracking-tighter text-xs">Quick Sale / Walk-In</h4>
                        </div>
                     </div>
                  )}
               </div>

               <ScrollArea className="flex-1 min-h-0 p-4 sm:p-6">
                  <div className="space-y-3">
                    {cart.map((item, idx) => (
                      <div key={item.id} className="group relative bg-white flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-slate-200 transition-all shadow-sm">
                         <div className="flex flex-col gap-1 flex-1">
                            <h5 className="font-bold text-xs text-slate-800 uppercase tracking-tight">{item.name}</h5>
                            <p className="text-[10px] text-slate-400 font-medium tracking-tight">${item.unitPrice}</p>
                         </div>
                         
                         <div className="flex items-center gap-6">
                            <div className="flex items-center bg-slate-50 rounded-lg p-0.5 border border-slate-100">
                               <button 
                                 className="size-6 rounded-md hover:bg-white flex items-center justify-center transition-all disabled:opacity-30"
                                 onClick={() => {
                                   if (item.quantity > 1) {
                                      setCart(cart.map((c, i) => i === idx ? { ...c, quantity: c.quantity - 1, total: (c.quantity - 1) * c.unitPrice } : c))
                                   }
                                 }}
                                 disabled={item.isFromPrescription || item.isFromLab}
                               >
                                  <Minus className="size-3 text-slate-400" />
                               </button>
                               <span className="w-8 text-center font-black text-xs text-slate-700">{item.quantity}</span>
                               <button 
                                 className="size-6 rounded-md hover:bg-white flex items-center justify-center transition-all disabled:opacity-30"
                                 onClick={() => {
                                    setCart(cart.map((c, i) => i === idx ? { ...c, quantity: c.quantity + 1, total: (c.quantity + 1) * c.unitPrice } : c))
                                 }}
                                 disabled={item.isFromPrescription || item.isFromLab}
                                >
                                  <Plus className="size-3 text-slate-400" />
                               </button>
                            </div>
                            <div className="text-right min-w-[70px]">
                               <p className="font-black text-sm tracking-tight text-slate-900">${item.total.toLocaleString()}</p>
                            </div>
                            <button 
                              className="size-8 rounded-lg text-slate-200 hover:text-rose-500 hover:bg-rose-50 transition-all ml-2"
                              onClick={() => setCart(cart.filter(c => c.id !== item.id))}
                            >
                               <Trash2 className="size-3.5" />
                            </button>
                         </div>
                      </div>
                    ))}
                    {cart.length === 0 && (
                      <div className="py-20 flex flex-col items-center justify-center text-center">
                         <div className="size-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-6 border border-slate-100">
                            <ShoppingBag className="size-10" />
                         </div>
                         <h4 className="font-black text-slate-400 uppercase tracking-widest text-sm">Order is empty</h4>
                         <p className="text-xs text-slate-300 font-medium mt-1">Add items from the catalog</p>
                      </div>
                    )}
                  </div>
               </ScrollArea>

               <div className="flex-none border-t bg-white">
                  <div className="grid grid-cols-4 divide-x border-b">
                     <div className="p-4 space-y-1">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Subtotal</p>
                        <p className="text-lg font-black text-slate-900">${cartTotal.toLocaleString()}</p>
                     </div>
                     <div className="p-4 space-y-1">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Discount</p>
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400 font-bold">-</span>
                          <Input 
                            type="number" 
                            value={discount} 
                            onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                            className="h-6 border-none bg-transparent p-0 font-black text-lg text-slate-900 italic focus-visible:ring-0"
                          />
                        </div>
                     </div>
                     <div className="p-4 space-y-1">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Insurance <ShieldCheck className="inline size-3 mb-0.5 ml-1 opacity-20" /></p>
                        <div className="flex items-center gap-1 text-slate-400 italic">
                          <span>-</span>
                          <p className="text-lg font-black">$0.00</p>
                        </div>
                     </div>
                     <div className="p-4 space-y-1 bg-emerald-50/50">
                        <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Total Due</p>
                        <p className="text-2xl font-black text-emerald-500">${Math.max(0, cartTotal - discount).toLocaleString()}</p>
                     </div>
                  </div>
                  <div className="p-4 sm:p-6 space-y-4">
                     <div className="flex items-center gap-2 overflow-x-auto pb-2 hide-scrollbar">
                        {['ZAAD', 'SAHAL', 'EDAHAB', 'MYCASH', 'INSURANCE', 'CREDIT'].map(m => (
                          <button 
                            key={m}
                            className={`px-4 py-2 rounded-full border flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest transition-all shrink-0 ${paymentMethod === m ? 'bg-emerald-500 text-white border-emerald-500 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
                            onClick={() => setPaymentMethod(m)}
                          >
                             {m === 'ZAAD' && <Smartphone className="size-3" />}
                             {m === 'CREDIT' && <RotateCcw className="size-3" />}
                             {m === 'INSURANCE' && <ShieldCheck className="size-3" />}
                             {m}
                          </button>
                        ))}
                     </div>

                     {paymentMethod === 'CREDIT' && (
                       <div className="space-y-2 p-4 bg-slate-900 rounded-2xl animate-in slide-in-from-bottom-2 duration-300">
                          <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Select Credit Account</Label>
                          <Select onValueChange={(v) => setSelectedCreditCustomerId(v)}>
                             <SelectTrigger className="h-10 rounded-xl bg-white/5 border-white/10 text-white font-bold text-xs">
                                <SelectValue placeholder="Search account..." />
                             </SelectTrigger>
                             <SelectContent className="rounded-xl bg-slate-900 border-slate-800 text-white">
                                {creditCustomers.map(c => (
                                  <SelectItem key={c.id} value={c.id} className="font-bold py-2 hover:bg-white/5">
                                     <div className="flex flex-col">
                                        <span className="text-xs">{c.full_name}</span>
                                        <span className="text-[8px] text-rose-400 font-black uppercase mt-0.5">${c.outstanding_balance} owed</span>
                                     </div>
                                  </SelectItem>
                                ))}
                             </SelectContent>
                          </Select>
                       </div>
                     )}

                     <div className="flex items-center gap-3">
                        <div className="flex-1 relative">
                           <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</div>
                           <Input 
                             type="number" 
                             placeholder="Tend. Amount" 
                             className="h-12 pl-8 rounded-2xl border-slate-200 bg-slate-50/50 font-black text-sm focus:bg-white transition-all shadow-inner"
                             value={amountPaid}
                             onChange={e => setAmountPaid(e.target.value)}
                           />
                        </div>
                        <Button 
                           className="flex-[2] h-12 rounded-2xl bg-slate-900 text-white font-black text-sm uppercase tracking-tighter italic shadow-xl transition-all hover:bg-slate-800 active:scale-95 flex items-center justify-center gap-3 group disabled:opacity-50"
                           onClick={handleCreateSale}
                           disabled={loading || cart.length === 0 || (paymentMethod === 'CREDIT' && !selectedCreditCustomerId)}
                        >
                           {loading ? (
                             <Activity className="size-5 animate-spin" />
                           ) : (
                             <>
                               <div className="size-6 bg-emerald-500 rounded-full flex items-center justify-center">
                                  <Check className="size-3.5 text-white" />
                               </div>
                               <span>TENDER ${(cartTotal - discount).toLocaleString()}</span>
                             </>
                           )}
                        </Button>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
