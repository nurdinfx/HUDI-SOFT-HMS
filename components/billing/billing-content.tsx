"use client"

import { useState, useMemo, useEffect } from "react"
import { Search, Eye, CreditCard, Download, Printer, Receipt, Calendar, User, FileText, CheckCircle2, AlertCircle, Clock, Trash2, MoreHorizontal, ShieldCheck } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
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
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { billingApi, insuranceApi, type Invoice, type Patient, type InsurancePolicy } from "@/lib/api"

interface BillingContentProps {
  invoices?: Invoice[]
  patients?: Patient[]
  onRefresh?: () => void
}

export function BillingContent({ invoices = [], patients = [], onRefresh = () => { } }: BillingContentProps) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [paymentData, setPaymentData] = useState({ amount: 0, method: "cash", notes: "" })
  const [processing, setProcessing] = useState(false)
  const [patientPolicies, setPatientPolicies] = useState<InsurancePolicy[]>([])
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(null)

  useEffect(() => {
    // Pre-load html2pdf script
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
    script.async = true
    document.head.appendChild(script)
  }, [])

  const list = Array.isArray(invoices) ? invoices : []
  const filtered = useMemo(() => {
    return list.filter((inv) => {
      const matchSearch =
        !search ||
        inv.patientName?.toLowerCase().includes(search.toLowerCase()) ||
        inv.invoiceId?.toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === "all" || inv.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [list, search, statusFilter])

  const totalRevenue = list.reduce((sum, inv) => sum + (inv.total || 0), 0)
  const paid = list.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0)
  const outstanding = totalRevenue - paid
  const pendingCount = list.filter((inv) => inv.status === "unpaid" || inv.status === "partial").length

  const handlePrint = () => {
    const originalTitle = document.title
    document.title = `Invoice-${selectedInvoice?.invoiceId || 'Official'}`
    window.print()
    document.title = originalTitle
  }

  const handleDownload = () => {
    const element = document.getElementById('invoice-content')
    if (!element) return
    toast.info("Generating PDF Invoice...")

    const startDownload = () => {
      const opt = {
        margin: [10, 10],
        filename: `Invoice-${selectedInvoice?.invoiceId || 'Receipt'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      // @ts-ignore
      html2pdf().from(element).set(opt).save().then(() => {
        toast.success("Invoice downloaded")
      });
    }

    // @ts-ignore
    if (typeof html2pdf !== 'undefined') {
      startDownload()
    } else {
      const script = document.createElement('script')
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
      script.onload = startDownload
      document.head.appendChild(script)
    }
  }

  const handleProcessPayment = async () => {
    if (!selectedInvoice) return
    if (paymentData.amount < 0) return toast.error("Enter a valid amount")

    setProcessing(true)
    try {
      const remainingTotal = selectedInvoice.total - selectedInvoice.paidAmount
      const newPaidAmount = (selectedInvoice.paidAmount || 0) + paymentData.amount

      let newStatus = "partial"
      if (newPaidAmount >= selectedInvoice.total) {
        newStatus = "paid"
      }

      // If insurance applied, create a claim for the remaining balance
      if (selectedPolicyId) {
        const pol = patientPolicies.find(p => p.id === selectedPolicyId)
        if (pol) {
          const insuranceAmount = remainingTotal - paymentData.amount
          if (insuranceAmount > 0) {
            await insuranceApi.createClaim({
              patientId: selectedInvoice.patientId,
              insuranceCompany: pol.companyName,
              policyNumber: pol.policyNumber,
              invoiceId: selectedInvoice.invoiceId,
              claimAmount: insuranceAmount,
              policyId: pol.id,
              status: 'submitted'
            })
            toast.info(`Insurance claim for $${insuranceAmount} submitted`)
          }
        }
      }

      await billingApi.update(selectedInvoice.id, {
        paidAmount: newPaidAmount,
        status: newStatus,
        paymentMethod: paymentData.method,
        notes: paymentData.notes ? `${selectedInvoice.notes || ''}\nPayment: ${paymentData.notes}` : selectedInvoice.notes
      })

      toast.success("Payment recorded successfully")
      setIsPaymentModalOpen(false)
      setSelectedPolicyId(null)
      onRefresh()
    } catch (error: any) {
      toast.error(error.message || "Payment failed")
    } finally {
      setProcessing(false)
    }
  }

  const openInvoice = async (inv: Invoice) => {
    setSelectedInvoice(inv)
    setIsDetailModalOpen(true)
    try {
      const pols = await insuranceApi.getPolicies(inv.patientId)
      setPatientPolicies(pols)
    } catch { setPatientPolicies([]) }
  }

  const openPayment = async (inv: Invoice) => {
    if (inv.status === "paid") return toast.info("This invoice is already fully paid")
    setSelectedInvoice(inv)
    setPaymentData({ amount: inv.total - inv.paidAmount, method: "cash", notes: "" })
    setIsPaymentModalOpen(true)
    try {
      const pols = await insuranceApi.getPolicies(inv.patientId)
      setPatientPolicies(pols)
    } catch { setPatientPolicies([]) }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Billing"
        description={`${list.length} invoices · ${pendingCount} pending`}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card className="border-none shadow-sm bg-slate-900 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10"><FileText className="size-16" /></div>
          <CardContent className="pt-6">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Total Billed</p>
            <p className="text-2xl font-black">${totalRevenue.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm overflow-hidden relative">
          <CardContent className="pt-6">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1 text-emerald-600">Total Collected</p>
            <p className="text-2xl font-black text-emerald-600">${paid.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm overflow-hidden relative">
          <CardContent className="pt-6">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1 text-rose-600">Outstanding</p>
            <p className="text-2xl font-black text-rose-600">${outstanding.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm overflow-hidden relative">
          <CardContent className="pt-6">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Pending Invoices</p>
            <p className="text-2xl font-black">{pendingCount}</p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by patient or invoice ID..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-6">Invoice ID</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                <TableHead className="hidden md:table-cell">Due Date</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((inv) => (
                <TableRow key={inv.id} className="group hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => openInvoice(inv)}>
                  <TableCell className="font-mono text-xs font-bold text-primary px-6">{inv.invoiceId}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900 uppercase text-xs">{inv.patientName}</span>
                      <span className="text-[10px] text-slate-400 font-medium">#{inv.patientId.slice(0, 8)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs font-medium text-slate-500">
                    {inv.date ? format(new Date(inv.date), "MMM d, yyyy") : "—"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex items-center gap-2">
                      <Calendar className="size-3 text-slate-300" />
                      <span className="text-xs font-bold text-slate-600">
                        {inv.dueDate ? format(new Date(inv.dueDate), "MMM d, yyyy") : "—"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-black text-slate-900">${Number(inv.total || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-right font-bold text-emerald-600">${Number(inv.paidAmount || 0).toLocaleString()}</TableCell>
                  <TableCell><StatusBadge status={inv.status} /></TableCell>
                  <TableCell className="text-right pr-6" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-xl border-slate-100">
                        <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-slate-400">Actions</DropdownMenuLabel>
                        <DropdownMenuItem className="font-bold flex gap-2" onClick={() => openInvoice(inv)}>
                          <Eye className="size-4" /> View Invoice
                        </DropdownMenuItem>
                        {inv.status !== "paid" && (
                          <DropdownMenuItem className="font-bold flex gap-2 text-emerald-600" onClick={() => openPayment(inv)}>
                            <CreditCard className="size-4" /> Record Payment
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="font-bold flex gap-2" onClick={() => { setSelectedInvoice(inv); setTimeout(handlePrint, 100); }}>
                          <Printer className="size-4" /> Quick Print
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground font-medium">
                    No invoices found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* MODAL: INVOICE DETAIL */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent
          className="max-h-[96vh] rounded-2xl p-0 overflow-hidden border-none shadow-2xl flex flex-col"
          style={{ maxWidth: '1000px', width: '95vw' }}
        >
          <style>{`
            @media print {
              @page { size: A4; margin: 0; }
              body * { visibility: hidden !important; pointer-events: none; }
              .printable-area, .printable-area * { visibility: visible !important; }
              .printable-area {
                position: fixed;
                left: 0;
                top: 0;
                width: 210mm;
                height: 297mm;
                padding: 15mm;
                background: white !important;
                z-index: 9999;
                box-shadow: none !important;
                border: none !important;
                color-adjust: exact;
                -webkit-print-color-adjust: exact;
              }
              .no-print { display: none !important; }
            }
          `}</style>

          <ScrollArea className="flex-1">
            <div id="invoice-content" className="printable-area">
              {/* Header */}
              <div className="bg-slate-900 p-10 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-10">
                  <Receipt className="size-32" />
                </div>
                <div className="relative z-10 flex justify-between items-start">
                  <div>
                    <Badge className="bg-emerald-500 text-white border-none mb-4 px-3 py-1 text-xs font-black tracking-widest uppercase">
                      Official Invoice
                    </Badge>
                    <h2 className="text-3xl font-black tracking-tighter mb-1 uppercase">MedCore Clinical Center</h2>
                    <p className="text-slate-400 text-sm font-medium tracking-tight">Main Billing & Financial Department</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-[10px] text-slate-400 mb-1 tracking-widest uppercase">Invoice Number</p>
                    <p className="text-2xl font-black tracking-tighter">{selectedInvoice?.invoiceId}</p>
                    <p className="text-slate-400 text-xs font-bold mt-2 uppercase tracking-tight">
                      Date: {selectedInvoice?.date ? format(new Date(selectedInvoice.date), "PPP") : ""}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-10 bg-white space-y-10">
                {/* Demographics */}
                <div className="grid grid-cols-2 gap-12 border-b pb-10">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Billed To</h4>
                    <div className="space-y-2">
                      <p className="text-xl font-black text-slate-900 uppercase tracking-tight">{selectedInvoice?.patientName}</p>
                      <div className="flex flex-col gap-1 text-xs font-bold text-slate-500">
                        <span>PATIENT ID: {selectedInvoice?.patientId}</span>
                        <span>CONTACT: Patient Registered File</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4 text-right">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment Summary</h4>
                    <div className="inline-block space-y-1">
                      <div className="flex justify-between gap-8 text-xs font-bold mb-2">
                        <span className="text-slate-400 uppercase">Status</span>
                        <StatusBadge status={selectedInvoice?.status || "unpaid"} />
                      </div>
                      <div className="flex justify-between gap-8 text-xs font-bold">
                        <span className="text-slate-400 uppercase">Due Date</span>
                        <span className="text-slate-900">{selectedInvoice?.dueDate ? format(new Date(selectedInvoice.dueDate), "PPP") : "N/A"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-6">
                  <h4 className="font-black text-slate-900 uppercase tracking-tighter text-lg flex items-center gap-2">
                    Billable Items & Services
                  </h4>
                  <div className="border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="px-8 h-12 text-[10px] font-black text-slate-500 uppercase tracking-widest">Description</TableHead>
                          <TableHead className="h-12 text-[10px] font-black text-slate-500 uppercase text-center tracking-widest">Category</TableHead>
                          <TableHead className="h-12 text-[10px] font-black text-slate-500 uppercase text-center tracking-widest">Qty</TableHead>
                          <TableHead className="px-8 h-12 text-[10px] font-black text-slate-500 uppercase text-right tracking-widest">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedInvoice?.items && selectedInvoice.items.length > 0 ? (
                          selectedInvoice.items.map((item, i) => (
                            <TableRow key={i} className="border-slate-50">
                              <TableCell className="px-8 py-5 font-bold text-slate-800 uppercase text-xs">{item.description}</TableCell>
                              <TableCell className="py-5 text-center"><Badge variant="outline" className="text-[9px] uppercase font-black tracking-tighter">{item.category}</Badge></TableCell>
                              <TableCell className="py-5 text-center font-mono font-bold text-slate-500">{item.quantity}</TableCell>
                              <TableCell className="px-8 py-5 text-right font-black text-slate-900">${(item.unitPrice * item.quantity).toLocaleString()}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="h-32 text-center text-slate-400 font-medium italic">No items found on this invoice.</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Totals */}
                <div className="flex justify-end pt-6">
                  <div className="w-80 space-y-3">
                    <div className="flex justify-between text-sm font-bold text-slate-500">
                      <span className="uppercase tracking-widest text-[10px]">Subtotal</span>
                      <span>${selectedInvoice?.subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-slate-500">
                      <span className="uppercase tracking-widest text-[10px]">Tax & Service</span>
                      <span>${selectedInvoice?.tax.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-rose-500">
                      <span className="uppercase tracking-widest text-[10px]">Discount</span>
                      <span>-${selectedInvoice?.discount.toLocaleString()}</span>
                    </div>
                    <div className="h-px bg-slate-100 my-4"></div>
                    <div className="flex justify-between items-center py-2">
                      <span className="font-black uppercase tracking-tighter text-slate-900">Total Billed</span>
                      <span className="text-3xl font-black text-primary tracking-tighter">${selectedInvoice?.total.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 px-4 bg-emerald-50 rounded-2xl">
                      <span className="font-black uppercase tracking-tighter text-emerald-600 text-[10px]">Amount Paid</span>
                      <span className="text-xl font-black text-emerald-600 tracking-tighter">${selectedInvoice?.paidAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="grid grid-cols-2 gap-8 pt-12 border-t mt-12 opacity-60">
                  <div className="text-[9px] text-slate-400 font-medium uppercase leading-relaxed max-w-xs">
                    This invoice is a legal document from MedCore Clinical Center. All payments are subject to our financial policies. Thank you for choosing our healthcare services.
                  </div>
                  <div className="text-right">
                    <div className="h-0.5 w-40 bg-slate-900 ml-auto mb-2"></div>
                    <p className="font-black text-xs text-slate-900 uppercase">Chief Financial Officer</p>
                    <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mt-1">Authorized Billing Signature</p>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="p-6 bg-slate-50 border-t flex justify-between items-center no-print">
            <Button variant="ghost" className="rounded-xl h-12 px-8 font-black text-slate-400 hover:text-slate-900 uppercase tracking-widest text-xs" onClick={() => setIsDetailModalOpen(false)}>Close Review</Button>
            <div className="flex gap-3">
              <Button variant="outline" className="rounded-xl h-12 px-8 font-black border-2 border-slate-200 shadow-sm transition-all hover:bg-white hover:border-slate-300 uppercase tracking-widest text-xs" onClick={handleDownload}>
                <Download className="size-4 mr-2" />
                Download PDF
              </Button>
              <Button className="rounded-xl h-12 px-10 font-black shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] uppercase tracking-widest text-xs" onClick={handlePrint}>
                <Printer className="size-4 mr-2" />
                Print Invoice
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: RECORD PAYMENT */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-8 bg-emerald-600 text-white relative">
            <div className="absolute top-0 right-0 p-8 opacity-10"><CreditCard className="size-20" /></div>
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Record Payment</DialogTitle>
            <p className="text-emerald-100/80 text-sm font-medium">Capture financial settlement for {selectedInvoice?.invoiceId}</p>
          </DialogHeader>
          <div className="p-8 space-y-6">
            <div className="space-y-4 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Apply Insurance Policy (Optional)</Label>
                <Select value={selectedPolicyId || "none"} onValueChange={(v) => {
                  const polId = v === "none" ? null : v
                  setSelectedPolicyId(polId)
                  if (polId) {
                    const pol = patientPolicies.find(p => p.id === polId)
                    if (pol) {
                      // Auto-calculate amount based on co-pay if applicable
                      const remainingTotal = (selectedInvoice?.total || 0) - (selectedInvoice?.paidAmount || 0)
                      const patientPortion = (pol.coPayPercent / 100) * remainingTotal
                      setPaymentData(prev => ({ ...prev, amount: patientPortion, method: 'insurance' }))
                    }
                  }
                }}>
                  <SelectTrigger className="h-12 rounded-2xl border-slate-200 font-bold bg-white">
                    <SelectValue placeholder="No Insurance Applied" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-slate-200">
                    <SelectItem value="none" className="font-bold py-3 rounded-xl">No Insurance (Cash/Card)</SelectItem>
                    {patientPolicies.map(pol => (
                      <SelectItem key={pol.id} value={pol.id} className="font-bold py-3 rounded-xl">
                        {pol.companyName} ({pol.policyNumber})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedPolicyId && (
                  <div className="flex items-center gap-2 p-2 bg-white rounded-xl border border-emerald-200">
                    <ShieldCheck className="size-4 text-emerald-600" />
                    <span className="text-[10px] font-bold text-emerald-600 uppercase">
                      Policy Active · {patientPolicies.find(p => p.id === selectedPolicyId)?.coPayPercent}% Patient Co-Pay Applied
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Payment Amount ($)</Label>
                {selectedPolicyId && (
                  <span className="text-[9px] font-black text-emerald-600 uppercase">Auto-Calculated Co-Pay</span>
                )}
              </div>
              <Input
                type="number"
                className="h-14 rounded-2xl border-slate-200 font-black text-2xl focus:ring-emerald-500/20"
                value={paymentData.amount}
                onChange={(e) => setPaymentData({ ...paymentData, amount: parseFloat(e.target.value) || 0 })}
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase">
                <span>Balance Remaining: ${((selectedInvoice?.total || 0) - (selectedInvoice?.paidAmount || 0) - paymentData.amount).toLocaleString()}</span>
                {selectedPolicyId && (
                  <span className="text-emerald-600">Insurance Coverage: ${((selectedInvoice?.total || 0) - (selectedInvoice?.paidAmount || 0) - paymentData.amount).toLocaleString()}</span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Settle via Method</Label>
              <Select value={paymentData.method} onValueChange={(v) => setPaymentData({ ...paymentData, method: v })}>
                <SelectTrigger className="h-12 rounded-2xl border-slate-200 font-bold">
                  <SelectValue placeholder="Select Method" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-slate-200">
                  <SelectItem value="cash" className="font-bold py-3 rounded-xl">Cash Payment</SelectItem>
                  <SelectItem value="card" className="font-bold py-3 rounded-xl">Debit/Credit Card</SelectItem>
                  <SelectItem value="bank_transfer" className="font-bold py-3 rounded-xl">Bank Transfer</SelectItem>
                  <SelectItem value="insurance" className="font-bold py-3 rounded-xl">Insurance Billing</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Internal Remarks</Label>
              <Input
                placeholder="e.g. Transaction Ref, Check No."
                className="h-12 rounded-2xl border-slate-200 font-medium"
                value={paymentData.notes}
                onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter className="p-8 bg-slate-50 flex gap-3 sm:justify-end">
            <Button variant="ghost" className="rounded-2xl h-12 px-8 font-black text-slate-400 hover:text-slate-900" onClick={() => setIsPaymentModalOpen(false)}>CANCEL</Button>
            <Button
              className="rounded-2xl h-12 px-10 font-black shadow-xl bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
              onClick={handleProcessPayment}
              disabled={processing}
            >
              {processing ? <Clock className="size-5 animate-spin mr-2" /> : <CheckCircle2 className="size-5 mr-2" />}
              CONFIRM SETTLEMENT
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
