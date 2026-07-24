"use client"

import { useState } from "react"
import {
  ArrowUpRight,
  Calendar as CalendarIcon,
  Download,
  Percent,
  Printer,
  RefreshCcw,
  Wallet,
  DollarSign,
} from "lucide-react"
import { toast } from "sonner"
import { format, startOfMonth, startOfWeek } from "date-fns"
import { LiveRevenueReport } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PageHeader } from "@/components/shared/page-header"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface RevenueAnalyticsContentProps {
  report: LiveRevenueReport | null
  loading: boolean
  onRefresh: (start?: string, end?: string, source?: string) => void
}

const fmtMoney = (value?: number) =>
  `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const fmtDate = (value?: string) => {
  if (!value) return "—"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function RevenueAnalyticsContent({ report, loading, onRefresh }: RevenueAnalyticsContentProps) {
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: startOfMonth(new Date()),
    to: new Date(),
  })
  const [sourceFilter, setSourceFilter] = useState("ALL")

  const handlePrint = () => window.print()

  const exportData = (type: "excel" | "pdf") => {
    toast.info(`Generating ${type.toUpperCase()} report...`)
    setTimeout(() => {
      toast.success(`${type.toUpperCase()} export is ready.`)
    }, 1200)
  }

  const applyFilters = (sourceValue = sourceFilter) => {
    onRefresh(
      dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : undefined,
      dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : undefined,
      sourceValue
    )
  }

  const setRange = (type: "today" | "week" | "month") => {
    const now = new Date()
    let from = now
    if (type === "week") from = startOfWeek(now)
    if (type === "month") from = startOfMonth(now)
    setDateRange({ from, to: now })
    onRefresh(format(from, "yyyy-MM-dd"), format(now, "yyyy-MM-dd"), sourceFilter)
  }

  const summary = report?.summary
  const rows = report?.rows || []

  return (
    <div className="flex flex-col gap-6 print:gap-4 print:p-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <PageHeader
          title="Revenue Analytics"
          description="Live revenue from reception POS and pharmacy transactions."
        />
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handlePrint} className="hidden sm:flex">
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Download className="mr-2 h-4 w-4" />
                Export Report
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Format</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => exportData("excel")}>Excel Spreadsheet</DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportData("pdf")}>PDF Document</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Card className="print:hidden border-slate-200 shadow-sm">
        <CardContent className="p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex bg-slate-100 p-1 rounded-md">
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setRange("today")}>Today</Button>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setRange("week")}>Weekly</Button>
              <Button variant="ghost" size="sm" className="text-xs h-7 font-semibold bg-white shadow-sm" onClick={() => setRange("month")}>Monthly</Button>
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "w-[240px] h-9 justify-start text-left font-normal border-slate-200",
                    !dateRange.from && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>{format(dateRange.from, "MMM dd")} - {format(dateRange.to, "MMM dd, yyyy")}</>
                    ) : (
                      format(dateRange.from, "PPP")
                    )
                  ) : (
                    <span>Custom Range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange.from}
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range: any) => setDateRange(range || { from: undefined, to: undefined })}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>

            <Select
              value={sourceFilter}
              onValueChange={(value) => {
                setSourceFilter(value)
                onRefresh(
                  dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : undefined,
                  dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : undefined,
                  value
                )
              }}
            >
              <SelectTrigger className="w-[200px] h-9 border-slate-200">
                <SelectValue placeholder="Transaction source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Sources</SelectItem>
                <SelectItem value="PHARMACY">Pharmacy Transactions</SelectItem>
                <SelectItem value="POS">Reception POS</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="default"
            size="sm"
            className="bg-slate-900 hover:bg-slate-800"
            onClick={() => applyFilters()}
            disabled={loading}
          >
            <RefreshCcw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
            Update Results
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 print:grid-cols-2">
        <Card className="border-none shadow-sm ring-1 ring-slate-200 overflow-hidden">
          <div className="h-1 bg-primary" />
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{fmtMoney(summary?.totalRevenue)}</div>
            <div className="flex items-center mt-2 text-xs font-medium text-emerald-600">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              {summary?.transactionCount || 0} live transactions
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm ring-1 ring-slate-200 overflow-hidden">
          <div className="h-1 bg-rose-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Discount Given</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-rose-600">{fmtMoney(summary?.totalDiscount)}</div>
            <div className="flex items-center mt-2 text-xs font-medium text-slate-500">
              <Percent className="h-3 w-3 mr-1" />
              Discount from POS and pharmacy
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm ring-1 ring-slate-200 overflow-hidden">
          <div className="h-1 bg-emerald-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Collected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">{fmtMoney(summary?.totalPaid)}</div>
            <div className="flex items-center mt-2 text-xs font-medium text-slate-500">
              <Wallet className="h-3 w-3 mr-1" />
              Paid amount recorded
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm ring-1 ring-slate-200 overflow-hidden">
          <div className="h-1 bg-amber-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">{fmtMoney(summary?.totalOutstanding)}</div>
            <div className="flex items-center mt-2 text-xs font-medium text-slate-500">
              <DollarSign className="h-3 w-3 mr-1" />
              Remaining unpaid balance
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-black">Revenue by Source</CardTitle>
            <CardDescription className="text-xs">Filtered live totals</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(summary?.bySource || {}).length === 0 ? (
              <p className="text-sm text-slate-400">No source totals for this filter.</p>
            ) : (
              Object.entries(summary?.bySource || {}).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <span className="text-sm font-bold text-slate-700">{key}</span>
                  <span className="text-sm font-black text-slate-900">{fmtMoney(Number(value))}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-black">Payment Methods</CardTitle>
            <CardDescription className="text-xs">Collected amount by method</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {Object.entries(summary?.byMethod || {}).length === 0 ? (
              <p className="text-sm text-slate-400">No payment data for this filter.</p>
            ) : (
              Object.entries(summary?.byMethod || {}).map(([key, value]) => (
                <Badge key={key} variant="outline" className="px-3 py-2 rounded-xl text-xs font-bold border-slate-200 bg-slate-50">
                  {key}: {fmtMoney(Number(value))}
                </Badge>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-md ring-1 ring-slate-200 overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-black">Transaction Details</CardTitle>
          <CardDescription className="text-xs">Real data from pharmacy transactions and reception POS.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative overflow-auto max-h-[650px]">
            <Table className="min-w-[1180px]">
              <TableHeader className="sticky top-0 z-20 shadow-sm">
                <TableRow className="bg-slate-900 hover:bg-slate-900 border-none">
                  <TableHead className="text-white font-bold">Source</TableHead>
                  <TableHead className="text-white font-bold">Invoice</TableHead>
                  <TableHead className="text-white font-bold">Patient</TableHead>
                  <TableHead className="text-right text-white font-bold">Subtotal</TableHead>
                  <TableHead className="text-right text-white font-bold">Discount</TableHead>
                  <TableHead className="text-right text-white font-bold">Total</TableHead>
                  <TableHead className="text-right text-white font-bold">Paid</TableHead>
                  <TableHead className="text-right text-white font-bold">Due</TableHead>
                  <TableHead className="text-white font-bold">Method</TableHead>
                  <TableHead className="text-white font-bold">Status</TableHead>
                  <TableHead className="text-white font-bold">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={11} className="h-72 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="h-12 w-12 rounded-full border-4 border-slate-200 border-t-primary animate-spin" />
                        <span className="text-slate-500 font-medium">Loading live revenue data...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="h-64 text-center text-slate-400">
                      No matching transactions found for the selected date and source.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row, idx) => (
                    <TableRow
                      key={`${row.source}-${row.id}`}
                      className={cn(idx % 2 === 0 ? "bg-white" : "bg-slate-50/30", "hover:bg-primary/5")}
                    >
                      <TableCell>
                        <Badge variant="outline" className="rounded-full font-bold border-slate-200 bg-slate-50">
                          {row.source}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs font-bold text-primary">{row.invoiceId}</TableCell>
                      <TableCell className="font-semibold text-slate-800">{row.patientName}</TableCell>
                      <TableCell className="text-right font-medium text-slate-700">{fmtMoney(row.subtotalAmount)}</TableCell>
                      <TableCell className="text-right font-bold text-rose-600">{row.discountAmount > 0 ? fmtMoney(row.discountAmount) : "—"}</TableCell>
                      <TableCell className="text-right font-black text-slate-900">{fmtMoney(row.totalAmount)}</TableCell>
                      <TableCell className="text-right font-medium text-emerald-700">{fmtMoney(row.paidAmount)}</TableCell>
                      <TableCell className="text-right font-medium text-amber-700">{row.outstandingAmount > 0 ? fmtMoney(row.outstandingAmount) : "—"}</TableCell>
                      <TableCell className="text-xs font-bold uppercase text-slate-600">{row.paymentMethod || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-bold capitalize">
                          {row.status || "completed"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 whitespace-nowrap">{fmtDate(row.date)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
