"use client"

import { useEffect, useState } from "react"
import { Calendar as CalendarIcon, Percent, RefreshCcw, Receipt, ShoppingCart } from "lucide-react"
import { format, startOfMonth, startOfWeek } from "date-fns"
import { revenueAnalyticsApi, DiscountReport } from "@/lib/api"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

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

export function DiscountsContent() {
  const [report, setReport] = useState<DiscountReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [sourceFilter, setSourceFilter] = useState("ALL")
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: startOfMonth(new Date()),
    to: new Date(),
  })

  const loadData = async (startDate?: string, endDate?: string, source?: string) => {
    setLoading(true)
    try {
      const data = await revenueAnalyticsApi.getDiscounts({ startDate, endDate, source })
      setReport(data)
    } catch (error: any) {
      toast.error(error.message || "Failed to load discounts")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const now = new Date()
    loadData(format(startOfMonth(now), "yyyy-MM-dd"), format(now, "yyyy-MM-dd"), "ALL")
  }, [])

  const applyFilters = (sourceValue = sourceFilter) => {
    loadData(
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
    loadData(format(from, "yyyy-MM-dd"), format(now, "yyyy-MM-dd"), sourceFilter)
  }

  const rows = report?.rows || []
  const summary = report?.summary

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Discounts"
        description="All POS and pharmacy discounts in one page."
      />

      <Card className="border-slate-200 shadow-sm">
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
                applyFilters(value)
              }}
            >
              <SelectTrigger className="w-[200px] h-9 border-slate-200">
                <SelectValue placeholder="Discount source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Sources</SelectItem>
                <SelectItem value="PHARMACY">Pharmacy Transactions</SelectItem>
                <SelectItem value="POS">Reception POS</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button className="bg-slate-900 hover:bg-slate-800" size="sm" onClick={() => applyFilters()} disabled={loading}>
            <RefreshCcw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="border-none shadow-sm ring-1 ring-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Discounts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-rose-600">{fmtMoney(summary?.totalDiscount)}</div>
            <div className="text-xs text-slate-500 mt-2 flex items-center gap-1">
              <Percent className="size-3.5" />
              Total value discounted
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm ring-1 ring-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Discounted Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{summary?.transactionCount || 0}</div>
            <div className="text-xs text-slate-500 mt-2 flex items-center gap-1">
              <Receipt className="size-3.5" />
              Transactions with discount
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm ring-1 ring-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Revenue After Discount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">{fmtMoney(summary?.totalRevenue)}</div>
            <div className="text-xs text-slate-500 mt-2 flex items-center gap-1">
              <ShoppingCart className="size-3.5" />
              Net discounted sales
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-md ring-1 ring-slate-200 overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-black">Discount Transactions</CardTitle>
          <CardDescription className="text-xs">Every transaction where a discount was applied.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto max-h-[700px]">
            <Table className="min-w-[1100px]">
              <TableHeader className="sticky top-0 z-20 shadow-sm">
                <TableRow className="bg-slate-900 hover:bg-slate-900 border-none">
                  <TableHead className="text-white font-bold">Source</TableHead>
                  <TableHead className="text-white font-bold">Invoice</TableHead>
                  <TableHead className="text-white font-bold">Patient</TableHead>
                  <TableHead className="text-right text-white font-bold">Subtotal</TableHead>
                  <TableHead className="text-right text-white font-bold">Discount</TableHead>
                  <TableHead className="text-right text-white font-bold">Net Total</TableHead>
                  <TableHead className="text-right text-white font-bold">Paid</TableHead>
                  <TableHead className="text-white font-bold">Method</TableHead>
                  <TableHead className="text-white font-bold">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-64 text-center text-slate-500">
                      Loading discounts...
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-64 text-center text-slate-400">
                      No discounts found for the selected filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row, idx) => (
                    <TableRow key={`${row.source}-${row.id}`} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/30"}>
                      <TableCell>
                        <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 font-bold">
                          {row.source}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs font-bold text-primary">{row.invoiceId}</TableCell>
                      <TableCell className="font-semibold text-slate-800">{row.patientName}</TableCell>
                      <TableCell className="text-right font-medium text-slate-700">{fmtMoney(row.subtotalAmount)}</TableCell>
                      <TableCell className="text-right font-black text-rose-600">{fmtMoney(row.discountAmount)}</TableCell>
                      <TableCell className="text-right font-black text-slate-900">{fmtMoney(row.totalAmount)}</TableCell>
                      <TableCell className="text-right font-medium text-emerald-700">{fmtMoney(row.paidAmount)}</TableCell>
                      <TableCell className="text-xs font-bold uppercase text-slate-600">{row.paymentMethod || "—"}</TableCell>
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
