"use client"

import { useState, useEffect } from "react"
import {
  Receipt, TrendingUp, CreditCard, Banknote, Smartphone,
  Calendar, RefreshCw, Filter, Users, AlertCircle, ChevronDown, Plus, X
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { pharmacyApi } from "@/lib/api"
import { toast } from "sonner"

// ── Date range presets ─────────────────────────────────────────────
type DatePreset = "today" | "week" | "month" | "year" | "custom"

const pad  = (n: number) => String(n).padStart(2, "0")
const fmt  = (d: Date)   => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

function getRange(preset: DatePreset, customStart?: string, customEnd?: string): { startDate: string; endDate: string } {
  const now  = new Date()
  const today = fmt(now)

  if (preset === "today")  return { startDate: today, endDate: today }
  if (preset === "week") {
    const d = new Date(now); d.setDate(now.getDate() - 6)
    return { startDate: fmt(d), endDate: today }
  }
  if (preset === "month") {
    return { startDate: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`, endDate: today }
  }
  if (preset === "year") {
    return { startDate: `${now.getFullYear()}-01-01`, endDate: today }
  }
  if (preset === "custom") {
    return { startDate: customStart || today, endDate: customEnd || today }
  }
  return { startDate: today, endDate: today }
}

// ── Payment method colour helper ───────────────────────────────────
const methodColor: Record<string, string> = {
  ZAAD:    "bg-emerald-100 text-emerald-700",
  SAHAL:   "bg-blue-100   text-blue-700",
  EDAHAB: "bg-purple-100 text-purple-700",
  MYCASH: "bg-indigo-100 text-indigo-700",
  CASH:    "bg-yellow-100 text-yellow-700",
  CARD:    "bg-slate-100  text-slate-700",
  CREDIT:  "bg-rose-100   text-rose-700",
  INS:     "bg-cyan-100   text-cyan-700",
  OTHER:   "bg-gray-100   text-gray-600",
}
function MethodBadge({ method }: { method?: string }) {
  const key = (method || "OTHER").toUpperCase()
  return (
    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${methodColor[key] || methodColor.OTHER}`}>
      {key}
    </span>
  )
}

function fmtDate(d?: string) {
  if (!d) return "—"
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return d
  return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}
function fmtMoney(n?: number) {
  return `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const PAYMENT_METHODS = ["ZAAD", "SAHAL", "EDAHAB", "MYCASH", "CASH", "CARD", "CREDIT", "INS"]

// ── Add Receipt Modal ───────────────────────────────────────────────
interface AddReceiptModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

function AddReceiptModal({ open, onClose, onSuccess }: AddReceiptModalProps) {
  const today = fmt(new Date())
  const [date, setDate]             = useState(today)
  const [amount, setAmount]         = useState("")
  const [paymentMethod, setPayMethod] = useState("CASH")
  const [referenceName, setRefName] = useState("")
  const [invoiceNumber, setInvNum]  = useState("")
  const [saving, setSaving]         = useState(false)

  // Reset form when opened
  useEffect(() => {
    if (open) {
      setDate(today)
      setAmount("")
      setPayMethod("CASH")
      setRefName("")
      setInvNum("")
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async () => {
    if (!date) { toast.error("Please select a date"); return }
    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) { toast.error("Please enter a valid positive amount"); return }
    if (!paymentMethod) { toast.error("Please select a payment method"); return }

    setSaving(true)
    try {
      const result = await pharmacyApi.addManualReceipt({
        date,
        amount: parsedAmount,
        paymentMethod,
        referenceName: referenceName || undefined,
        invoiceNumber: invoiceNumber || undefined,
      })
      toast.success(`Receipt added: ${result.invoiceId}`)
      onSuccess()
      onClose()
    } catch (err: any) {
      toast.error(err.message || "Failed to add receipt")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-black">
            <Plus className="size-4 text-primary" />
            Add Manual Sales Receipt
          </DialogTitle>
          <DialogDescription className="text-xs">
            Transfer a QuickBooks or historical sales receipt into the system. This will update pharmacy totals and financial records.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Date */}
          <div className="grid gap-1.5">
            <Label htmlFor="receipt-date" className="text-xs font-bold text-slate-700">
              Receipt Date <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="receipt-date"
              type="date"
              value={date}
              max={today}
              onChange={(e) => setDate(e.target.value)}
              className="h-9 text-xs"
            />
            <p className="text-[10px] text-slate-400">Select the date when this sale originally occurred (can be a past date).</p>
          </div>

          {/* Amount */}
          <div className="grid gap-1.5">
            <Label htmlFor="receipt-amount" className="text-xs font-bold text-slate-700">
              Amount ($) <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="receipt-amount"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          {/* Payment Method */}
          <div className="grid gap-1.5">
            <Label htmlFor="receipt-method" className="text-xs font-bold text-slate-700">
              Payment Method <span className="text-rose-500">*</span>
            </Label>
            <Select value={paymentMethod} onValueChange={setPayMethod}>
              <SelectTrigger id="receipt-method" className="h-9 text-xs">
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map(m => (
                  <SelectItem key={m} value={m} className="text-xs font-bold">
                    <span className={`inline-block mr-2 text-[10px] font-black px-2 py-0.5 rounded-full ${methodColor[m] || methodColor.OTHER}`}>{m}</span>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reference Name (optional) */}
          <div className="grid gap-1.5">
            <Label htmlFor="receipt-refname" className="text-xs font-bold text-slate-700">
              Patient / Reference Name <span className="text-slate-400 font-normal">(optional)</span>
            </Label>
            <Input
              id="receipt-refname"
              type="text"
              placeholder="e.g. Walk-In Customer or QuickBooks Import"
              value={referenceName}
              onChange={(e) => setRefName(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          {/* Invoice / Doc Number (optional) */}
          <div className="grid gap-1.5">
            <Label htmlFor="receipt-invnum" className="text-xs font-bold text-slate-700">
              QuickBooks Invoice / Doc # <span className="text-slate-400 font-normal">(optional)</span>
            </Label>
            <Input
              id="receipt-invnum"
              type="text"
              placeholder="e.g. QB-2020-0012"
              value={invoiceNumber}
              onChange={(e) => setInvNum(e.target.value)}
              className="h-9 text-xs"
            />
            <p className="text-[10px] text-slate-400">If left blank, a unique ID will be auto-generated.</p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving} className="text-xs">
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={saving} className="text-xs gap-1.5 bg-primary text-white hover:bg-primary/90">
            {saving ? (
              <><RefreshCw className="size-3.5 animate-spin" /> Adding…</>
            ) : (
              <><Plus className="size-3.5" /> Add Receipt</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main component ─────────────────────────────────────────────────
export function SalesReceiptsHub() {
  const now   = new Date()
  const today = fmt(now)
  const monthStart = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`

  const [preset, setPreset]           = useState<DatePreset>("today")
  const [customStart, setCustomStart] = useState(monthStart)
  const [customEnd,   setCustomEnd]   = useState(today)
  const [payFilter, setPayFilter]     = useState("ALL")
  const [loading, setLoading]         = useState(false)
  const [data, setData]               = useState<any>(null)
  const [innerTab, setInnerTab]       = useState("pharmacy")
  const [showAddModal, setShowAddModal] = useState(false)
  // pendingOnly: true = show only untransferred (fresh daily slate); false = show all
  const [pendingOnly, setPendingOnly] = useState(true)

  const [pendingTransfers, setPendingTransfers] = useState<any[]>([])
  const [transferring, setTransferring]         = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [selectedTransferDate, setSelectedTransferDate] = useState<string | null>(null)

  const { startDate, endDate } = getRange(preset, customStart, customEnd)

  const loadPendingTransfers = async () => {
    try {
      const res = await pharmacyApi.getPendingTransfers()
      setPendingTransfers(res)
    } catch (err: any) {
      console.error("Failed to load pending transfers:", err.message)
    }
  }

  // Core load — respects pendingOnly flag
  const load = async (overridePendingOnly?: boolean) => {
    setLoading(true)
    const usePendingOnly = overridePendingOnly !== undefined ? overridePendingOnly : pendingOnly
    try {
      const res = await pharmacyApi.getSalesReceipts({
        startDate,
        endDate,
        paymentMethod: payFilter === "ALL" ? undefined : payFilter,
        pendingOnly: usePendingOnly,
      })
      setData(res)
      await loadPendingTransfers()
    } catch (err: any) {
      toast.error(err.message || "Failed to load sales receipts")
    } finally {
      setLoading(false)
    }
  }

  const executeTransfer = async (date: string) => {
    setTransferring(true)
    try {
      const res = await pharmacyApi.transferDailySales({ date })
      toast.success(res.message || `Daily sales for ${date} transferred successfully.`)
      // After transfer: force pendingOnly=true so cleared list shows only new sales
      setPendingOnly(true)
      await load(true)
    } catch (err: any) {
      toast.error(err.message || "Failed to transfer daily sales")
    } finally {
      setTransferring(false)
      setShowTransferModal(false)
      setSelectedTransferDate(null)
    }
  }

  // When preset changes: "today" → pendingOnly=true; broader ranges → pendingOnly=false
  const handlePresetChange = (p: DatePreset) => {
    setPreset(p)
    if (p === "today") {
      setPendingOnly(true)
    } else if (p !== "custom") {
      setPendingOnly(false)
    }
  }

  // Auto-load when preset or pay filter changes (not on custom date typing)
  useEffect(() => {
    if (preset !== "custom") {
      load()
    }
  }, [preset, payFilter, pendingOnly]) // eslint-disable-line react-hooks/exhaustive-deps

  // When custom dates are applied via the "Apply" button
  const handleApplyCustom = () => {
    load()
  }

  const summary    = data?.summary    || {}
  const pharmTxns  = data?.pharmacyTransactions || []
  const hospIncome = data?.hospitalIncome       || []
  const ar         = data?.accountsReceivable   || []

  const presetLabels: Record<DatePreset, string> = {
    today: "Today", week: "This Week", month: "This Month", year: "This Year", custom: "Custom",
  }

  const paymentMethods = ["ALL", "ZAAD", "SAHAL", "EDAHAB", "MYCASH", "CASH", "CARD", "CREDIT", "INS"]

  const isSingleDay = startDate === endDate
  const allDayTxns = isSingleDay ? pharmTxns : []
  // For status badge, check original data regardless of pendingOnly
  const hasSales = allDayTxns.length > 0 || pendingTransfers.some(pt => pt.date === startDate)
  const hasUntransferred = allDayTxns.some((t: any) => !t.isTransferred) || pendingTransfers.some(pt => pt.date === startDate)
  const isTransferredDay = hasSales && !hasUntransferred && !pendingOnly

  return (
    <div className="space-y-6">

      {/* Pending Transfers Alert */}
      {pendingTransfers.length > 0 && (
        <Card className="border-rose-200 bg-rose-50/50 shadow-sm transition-all hover:bg-rose-50">
          <CardContent className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-100 text-rose-600 rounded-lg">
                <AlertCircle className="size-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-rose-950">Pending Daily Sales Transfers</h4>
                <p className="text-xs text-rose-700 font-medium">
                  {pendingTransfers.length} day(s) with untransferred pharmacy sales (including today). Transfer them to the hospital revenue ledger to close the books.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select
                onValueChange={(val) => {
                  setSelectedTransferDate(val)
                  setShowTransferModal(true)
                }}
              >
                <SelectTrigger className="w-[180px] h-9 text-xs border-rose-200 bg-white text-rose-800 font-bold hover:bg-rose-100 transition-colors">
                  <SelectValue placeholder="Choose Date" />
                </SelectTrigger>
                <SelectContent>
                  {pendingTransfers.map((item) => (
                    <SelectItem key={item.date} value={item.date} className="text-xs font-semibold">
                      {item.date} ({fmtMoney(item.totalAmount)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Filter Bar ── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Preset pills */}
        <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
          {(["today","week","month","year","custom"] as DatePreset[]).map(p => (
            <button
              key={p}
              onClick={() => handlePresetChange(p)}
              className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                preset === p ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {presetLabels[p]}
            </button>
          ))}
        </div>

        {/* Custom date range — shown when "Custom" is selected */}
        {preset === "custom" && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2 py-1 bg-white">
              <Calendar className="size-3.5 text-slate-400" />
              <input
                type="date"
                value={customStart}
                max={customEnd}
                onChange={(e) => setCustomStart(e.target.value)}
                className="text-xs text-slate-700 outline-none w-32 bg-transparent"
              />
              <span className="text-xs text-slate-400">→</span>
              <input
                type="date"
                value={customEnd}
                min={customStart}
                max={today}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="text-xs text-slate-700 outline-none w-32 bg-transparent"
              />
            </div>
            <Button size="sm" onClick={handleApplyCustom} disabled={loading} className="h-8 px-3 text-xs font-bold">
              Apply
            </Button>
          </div>
        )}

        {/* Payment filter */}
        <Select value={payFilter} onValueChange={setPayFilter}>
          <SelectTrigger className="w-36 h-9 text-xs font-bold border-slate-200">
            <CreditCard className="size-3.5 mr-1.5 text-slate-400" />
            <SelectValue placeholder="Payment" />
          </SelectTrigger>
          <SelectContent>
            {paymentMethods.map(m => (
              <SelectItem key={m} value={m} className="text-xs font-bold">{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Pending Only / Show All toggle */}
        <Button
          size="sm"
          variant={pendingOnly ? "default" : "outline"}
          onClick={() => setPendingOnly(v => !v)}
          disabled={loading}
          className={`h-9 gap-1.5 text-xs font-bold transition-all ${
            pendingOnly
              ? "bg-amber-500 text-white hover:bg-amber-600 border-amber-500"
              : "border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          {pendingOnly ? (
            <><X className="size-3.5" /> Pending Only</>
          ) : (
            <><Filter className="size-3.5" /> Show All</>
          )}
        </Button>

        {/* Refresh */}
        <Button size="sm" variant="outline" onClick={() => load()} disabled={loading} className="h-9 gap-1.5">
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>

        {/* Add Receipt (QuickBooks import) */}
        <Button
          size="sm"
          onClick={() => setShowAddModal(true)}
          disabled={loading}
          className="h-9 gap-1.5 bg-primary text-white hover:bg-primary/90"
        >
          <Plus className="size-3.5" />
          Add Receipt
        </Button>

        {/* Date display & Daily Transfer Actions */}
        {isSingleDay ? (
          <div className="flex items-center gap-2 ml-auto">
            {isTransferredDay ? (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-bold py-1 px-2.5">
                ✓ Transferred to Ledger
              </Badge>
            ) : hasUntransferred ? (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs font-bold py-1 px-2.5">
                  Pending Transfer
                </Badge>
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedTransferDate(startDate)
                    setShowTransferModal(true)
                  }}
                  disabled={loading || transferring}
                  className="h-9 px-4 text-xs font-black bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  <RefreshCw className={`size-3.5 mr-1 ${transferring ? "animate-spin" : ""}`} />
                  End Day &amp; Transfer
                </Button>
              </div>
            ) : (
              <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 text-xs font-bold py-1 px-2.5">
                {pendingOnly ? "✓ All Transferred — Ready for New Sales" : "No Sales"}
              </Badge>
            )}
          </div>
        ) : (
          preset !== "custom" && (
            <span className="text-xs text-slate-400 ml-auto">
              <Calendar className="size-3.5 inline mr-1" />
              {startDate} → {endDate}
            </span>
          )
        )}
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-emerald-200 bg-emerald-50/40">
          <CardContent className="p-4">
            <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Pharmacy Sales</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{fmtMoney(summary.pharmacyTotal)}</p>
            <p className="text-[10px] text-slate-400 mt-1">{pharmTxns.length} transactions</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/40">
          <CardContent className="p-4">
            <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Hospital Revenue</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{fmtMoney(summary.hospitalTotal)}</p>
            <p className="text-[10px] text-slate-400 mt-1">{hospIncome.length} income entries</p>
          </CardContent>
        </Card>
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <p className="text-[10px] font-black uppercase text-primary tracking-widest">Grand Total</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{fmtMoney(summary.grandTotal)}</p>
            <p className="text-[10px] text-slate-400 mt-1">All sources combined</p>
          </CardContent>
        </Card>
        <Card className="border-rose-200 bg-rose-50/40">
          <CardContent className="p-4">
            <p className="text-[10px] font-black uppercase text-rose-600 tracking-widest">Discounts</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{fmtMoney(summary.discountTotal)}</p>
            <p className="text-[10px] text-slate-400 mt-1">POS and pharmacy discounts</p>
          </CardContent>
        </Card>
        <Card className="border-rose-200 bg-rose-50/40">
          <CardContent className="p-4">
            <p className="text-[10px] font-black uppercase text-rose-600 tracking-widest">Accounts Receivable</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{fmtMoney(summary.arTotal)}</p>
            <p className="text-[10px] text-slate-400 mt-1">{ar.length} outstanding accounts</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Payment Method Breakdown ── */}
      {summary.byMethod && Object.keys(summary.byMethod).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-black">Payment Method Breakdown</CardTitle>
            <CardDescription className="text-xs">Pharmacy sales by payment channel</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {Object.entries(summary.byMethod as Record<string, number>).map(([method, amount]) => (
                <div key={method} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
                  <MethodBadge method={method} />
                  <span className="font-black text-slate-800 text-sm">{fmtMoney(amount)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Detail Tabs ── */}
      <Tabs value={innerTab} onValueChange={setInnerTab}>
        <TabsList className="bg-transparent border-b rounded-none h-10 w-full justify-start gap-6 p-0">
          <TabsTrigger value="pharmacy" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none text-xs font-black uppercase tracking-wider pb-2">
            Pharmacy Transactions ({pharmTxns.length})
          </TabsTrigger>
          <TabsTrigger value="hospital" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none text-xs font-black uppercase tracking-wider pb-2">
            Hospital Revenue ({hospIncome.length})
          </TabsTrigger>
          <TabsTrigger value="ar" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none text-xs font-black uppercase tracking-wider pb-2">
            Accounts Receivable ({ar.length})
          </TabsTrigger>
        </TabsList>

        {/* Pharmacy Transactions */}
        <TabsContent value="pharmacy" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {pharmTxns.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <Receipt className="size-10 mb-3 opacity-20" />
                  <p className="text-sm font-medium">
                    {pendingOnly 
                      ? "✓ All sales have been transferred to the ledger. Ready for new sales!"
                      : "No pharmacy transactions found for this period."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="pl-4 text-xs font-bold">#</TableHead>
                        <TableHead className="text-xs font-bold">Invoice</TableHead>
                        <TableHead className="text-xs font-bold">Patient</TableHead>
                        <TableHead className="text-xs font-bold">Items</TableHead>
                        <TableHead className="text-xs font-bold">Method</TableHead>
                        <TableHead className="text-xs font-bold text-right">Discount</TableHead>
                        <TableHead className="text-xs font-bold text-right">Total</TableHead>
                        <TableHead className="text-xs font-bold text-right">Paid</TableHead>
                        <TableHead className="text-xs font-bold text-right">On Credit</TableHead>
                        <TableHead className="text-xs font-bold">Status</TableHead>
                        <TableHead className="text-xs font-bold">Transfer</TableHead>
                        <TableHead className="text-xs font-bold">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pharmTxns.map((t: any, i: number) => (
                        <TableRow key={t.id} className="border-b border-slate-50 hover:bg-slate-50">
                          <TableCell className="pl-4 text-xs text-slate-400">{i + 1}</TableCell>
                          <TableCell className="text-xs font-bold text-primary">{t.invoiceId}</TableCell>
                          <TableCell className="text-xs font-semibold text-slate-800">{t.patientName}</TableCell>
                          <TableCell className="text-xs text-slate-500 max-w-[180px] truncate">{t.itemsSummary || "—"}</TableCell>
                          <TableCell><MethodBadge method={t.paymentMethod} /></TableCell>
                          <TableCell className="text-right text-xs text-rose-600 font-semibold">{t.discountAmount > 0 ? fmtMoney(t.discountAmount) : "—"}</TableCell>
                          <TableCell className="text-right text-xs font-black text-slate-800">{fmtMoney(t.totalAmount)}</TableCell>
                          <TableCell className="text-right text-xs text-emerald-700 font-semibold">{fmtMoney(t.paidAmount)}</TableCell>
                          <TableCell className="text-right text-xs text-rose-600 font-semibold">{t.creditAmount > 0 ? fmtMoney(t.creditAmount) : "—"}</TableCell>
                          <TableCell>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              t.status === "Completed" || t.status === "Paid" ? "bg-green-100 text-green-700" :
                              t.status === "Partial"   ? "bg-yellow-100 text-yellow-700" :
                              t.status === "Credit"    ? "bg-rose-100 text-rose-700" :
                              "bg-slate-100 text-slate-600"
                            }`}>{t.status}</span>
                          </TableCell>
                          <TableCell>
                            {t.isTransferred ? (
                              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] py-0 px-2 font-bold whitespace-nowrap">
                                Transferred
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] py-0 px-2 font-bold whitespace-nowrap">
                                Pending
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-slate-500 whitespace-nowrap">{fmtDate(t.date)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hospital Revenue */}
        <TabsContent value="hospital" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {hospIncome.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <TrendingUp className="size-10 mb-3 opacity-20" />
                  <p className="text-sm font-medium">No hospital income entries found for this period.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="pl-4 text-xs font-bold">#</TableHead>
                        <TableHead className="text-xs font-bold">Source</TableHead>
                        <TableHead className="text-xs font-bold">Reference</TableHead>
                        <TableHead className="text-xs font-bold">Description</TableHead>
                        <TableHead className="text-xs font-bold">Method</TableHead>
                        <TableHead className="text-xs font-bold text-right">Discount</TableHead>
                        <TableHead className="text-xs font-bold text-right">Amount</TableHead>
                        <TableHead className="text-xs font-bold">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {hospIncome.map((e: any, i: number) => (
                        <TableRow key={e.id} className="border-b border-slate-50 hover:bg-slate-50">
                          <TableCell className="pl-4 text-xs text-slate-400">{i + 1}</TableCell>
                          <TableCell>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              e.source === 'POS' ? 'bg-blue-100 text-blue-700' :
                              e.source === 'Billing' ? 'bg-purple-100 text-purple-700' :
                              'bg-slate-100 text-slate-600'
                            }`}>{e.source}</span>
                          </TableCell>
                          <TableCell className="text-xs font-bold text-primary">{e.referenceId || "—"}</TableCell>
                          <TableCell className="text-xs text-slate-700 max-w-[200px] truncate">{e.description}</TableCell>
                          <TableCell><MethodBadge method={e.paymentMethod} /></TableCell>
                          <TableCell className="text-right text-xs text-rose-600 font-semibold">{e.discountAmount > 0 ? fmtMoney(e.discountAmount) : "—"}</TableCell>
                          <TableCell className="text-right text-xs font-black text-slate-800">{fmtMoney(e.amount)}</TableCell>
                          <TableCell className="text-xs text-slate-500 whitespace-nowrap">{fmtDate(e.date)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Accounts Receivable */}
        <TabsContent value="ar" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-black flex items-center gap-2">
                <Users className="size-4 text-rose-500" />
                Outstanding Credit Accounts
              </CardTitle>
              <CardDescription className="text-xs">Customers with unpaid balances owed to the hospital</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {ar.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <AlertCircle className="size-10 mb-3 opacity-20" />
                  <p className="text-sm font-medium">No outstanding accounts receivable.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="pl-4 text-xs font-bold">#</TableHead>
                        <TableHead className="text-xs font-bold">Customer</TableHead>
                        <TableHead className="text-xs font-bold">Phone</TableHead>
                        <TableHead className="text-xs font-bold text-right">Credit Taken</TableHead>
                        <TableHead className="text-xs font-bold text-right">Paid So Far</TableHead>
                        <TableHead className="text-xs font-bold text-right">Outstanding</TableHead>
                        <TableHead className="text-xs font-bold text-right">Credit Limit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ar.map((r: any, i: number) => (
                        <TableRow key={r.id} className="border-b border-slate-50 hover:bg-slate-50">
                          <TableCell className="pl-4 text-xs text-slate-400">{i + 1}</TableCell>
                          <TableCell>
                            <p className="text-xs font-bold text-slate-800">{r.fullName}</p>
                            <p className="text-[10px] text-slate-400">{r.customerId}</p>
                          </TableCell>
                          <TableCell className="text-xs text-slate-500">{r.phone || "—"}</TableCell>
                          <TableCell className="text-right text-xs text-slate-700 font-semibold">{fmtMoney(r.totalCreditTaken)}</TableCell>
                          <TableCell className="text-right text-xs text-green-700 font-semibold">{fmtMoney(r.totalPaid)}</TableCell>
                          <TableCell className="text-right text-xs font-black text-rose-600">{fmtMoney(r.outstandingBalance)}</TableCell>
                          <TableCell className="text-right text-xs text-slate-500">{fmtMoney(r.creditLimit)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Add Receipt Modal ── */}
      <AddReceiptModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => load()}
      />

      {/* ── Transfer Confirmation Modal ── */}
      <Dialog open={showTransferModal} onOpenChange={(v) => !v && setShowTransferModal(false)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-black text-slate-900">
              <RefreshCw className="size-4 text-emerald-600" />
              Transfer to Hospital Revenue
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              This will group all pharmacy sales for <span className="font-bold text-slate-800">{selectedTransferDate}</span> by payment method and record them as income entries in the hospital ledger (Hospital Revenue).
            </DialogDescription>
          </DialogHeader>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 my-2">
            <h5 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2">Summary for {selectedTransferDate}</h5>
            {(() => {
              const pendingInfo = pendingTransfers.find(pt => pt.date === selectedTransferDate)
              const totalAmount = pendingInfo?.totalAmount || (startDate === selectedTransferDate ? pharmTxns.reduce((s: any, r: any) => s + (r.isTransferred ? 0 : r.paidAmount), 0) : 0)
              const txCount = pendingInfo?.transactionCount || (startDate === selectedTransferDate ? pharmTxns.filter((t: any) => !t.isTransferred).length : 0)

              return (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Transactions Pending:</span>
                    <span className="font-bold text-slate-800">{txCount}</span>
                  </div>
                  <div className="flex justify-between text-xs border-t pt-1.5 mt-1.5">
                    <span className="text-slate-500 font-bold">Total Transfer Amount:</span>
                    <span className="font-black text-emerald-700">{fmtMoney(totalAmount)}</span>
                  </div>
                </div>
              )
            })()}
          </div>

          <DialogFooter className="gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowTransferModal(false)
                setSelectedTransferDate(null)
              }}
              disabled={transferring}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (selectedTransferDate) {
                  executeTransfer(selectedTransferDate)
                }
              }}
              disabled={transferring}
              className="text-xs gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {transferring ? (
                <><RefreshCw className="size-3.5 animate-spin" /> Transferring…</>
              ) : (
                <>Confirm & Transfer</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
