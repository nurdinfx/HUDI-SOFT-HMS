"use client"

import { useState, useMemo } from "react"
import { 
  Download, 
  Printer, 
  Calendar as CalendarIcon, 
  RefreshCcw, 
  ArrowUpRight,
  ChevronRight,
  LayoutDashboard,
  FileSpreadsheet,
  FileText
} from "lucide-react"
import { toast } from "sonner"
import { RevenueReport } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
import { format, startOfMonth, startOfWeek, endOfDay } from "date-fns"
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
  report: RevenueReport | null
  loading: boolean
  onRefresh: (start?: string, end?: string) => void
}

export function RevenueAnalyticsContent({ report, loading, onRefresh }: RevenueAnalyticsContentProps) {
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: startOfMonth(new Date()),
    to: new Date(),
  })

  const handlePrint = () => {
    window.print()
  }

  const exportData = (type: 'excel' | 'pdf') => {
    toast.info(`Generating ${type.toUpperCase()} report...`)
    // Simulation of export
    setTimeout(() => {
        toast.success(`${type.toUpperCase()} report generated and downloaded.`)
    }, 1500)
  }

  const applyFilters = () => {
    onRefresh(
        dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : undefined,
        dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : undefined
    )
  }

  const setRange = (type: 'today' | 'week' | 'month') => {
    const now = new Date();
    let from = now;
    if (type === 'week') from = startOfWeek(now);
    if (type === 'month') from = startOfMonth(now);
    
    setDateRange({ from, to: now });
    onRefresh(format(from, "yyyy-MM-dd"), format(now, "yyyy-MM-dd"));
  }

  return (
    <div className="flex flex-col gap-6 print:gap-4 print:p-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <PageHeader 
          title="Revenue Analytics" 
          description="Detailed financial breakdown by department and service category" 
          icon={<LayoutDashboard className="h-4 w-4 text-primary" />}
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
                    <DropdownMenuItem onClick={() => exportData('excel')}>
                        <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" />
                        Excel Spreadsheet
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportData('pdf')}>
                        <FileText className="mr-2 h-4 w-4 text-rose-600" />
                        PDF Document
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>

      <Card className="print:hidden border-slate-200 shadow-sm">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex bg-slate-100 p-1 rounded-md">
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-xs h-7" 
                    onClick={() => setRange('today')}
                >Today</Button>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-xs h-7"
                    onClick={() => setRange('week')}
                >Weekly</Button>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-xs h-7 font-semibold bg-white shadow-sm"
                    onClick={() => setRange('month')}
                >Monthly</Button>
            </div>
            
            <div className="h-6 w-px bg-slate-200 mx-1" />

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
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
          </div>

          <Button 
            variant="default" 
            size="sm"
            className="bg-slate-900 hover:bg-slate-800"
            onClick={applyFilters}
            disabled={loading}
          >
            <RefreshCcw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
            Update Results
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 print:grid-cols-2">
        <Card className="border-none shadow-sm ring-1 ring-slate-200 overflow-hidden">
            <div className="h-1 bg-primary" />
            <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-bold text-slate-900">${report?.grandTotal.toLocaleString() || "0"}</div>
                <div className="flex items-center mt-2 text-xs font-medium text-emerald-600">
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                    Global Income
                </div>
            </CardContent>
        </Card>
        
        {/* We can dynamically add more metrics here like "Top Department" or "Highest Category" */}
        <Card className="border-none shadow-sm ring-1 ring-slate-200 bg-emerald-50/10">
            <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Performance</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-xl font-bold text-slate-900">
                    {report?.rows.length || 0} Departments
                </div>
                <div className="text-slate-500 text-xs mt-1">Actively recording revenue</div>
            </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-md ring-1 ring-slate-200 overflow-hidden">
        <div className="relative overflow-auto max-h-[650px]">
          <Table className="border-collapse min-w-[1000px]">
            <TableHeader className="sticky top-0 z-20 shadow-sm">
              <TableRow className="bg-slate-900 hover:bg-slate-900 border-none">
                <TableHead className="w-[200px] text-white font-bold bg-slate-900 sticky left-0 z-30 ring-1 ring-slate-800">
                    DEPARTMENT
                </TableHead>
                {report?.columns.map(col => (
                  <TableHead key={col} className="text-center text-white font-bold border-x border-slate-800 px-4">
                    {col.toUpperCase()}
                  </TableHead>
                ))}
                <TableHead className="text-right text-white font-black bg-slate-950 sticky right-0 z-30 ring-1 ring-slate-800">
                    TOTAL
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={(report?.columns.length || 0) + 2} className="h-96 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                        <div className="h-12 w-12 rounded-full border-4 border-slate-200 border-t-primary animate-spin" />
                        <span className="text-slate-500 font-medium">Analyzing financial data streams...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : !report || report.rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={(report?.columns.length || 0) + 2} className="h-64 text-center text-slate-400">
                    No matching financial records found for the selected criteria.
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {report.rows.map((row, idx) => (
                    <TableRow key={row.department} className={cn("transition-colors", idx % 2 === 0 ? "bg-white" : "bg-slate-50/30", "hover:bg-primary/5")}>
                      <TableCell className="font-bold text-slate-700 bg-inherit sticky left-0 z-10 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                        {row.department}
                      </TableCell>
                      {report.columns.map(col => (
                        <TableCell key={col} className="text-center font-mono text-slate-600 px-4">
                          {row.totals[col] > 0 ? (
                              <span className="font-medium text-slate-900">${row.totals[col].toLocaleString()}</span>
                          ) : (
                              <span className="text-slate-300 font-light">$0</span>
                          )}
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-black text-slate-900 bg-slate-50 sticky right-0 z-10 border-l border-slate-200 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                        ${row.rowTotal.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  
                  {/* Summary Row */}
                  <TableRow className="bg-slate-900 hover:bg-slate-900 h-14 border-t-2 border-slate-400">
                    <TableCell className="font-black text-white bg-slate-900 sticky left-0 z-10 ring-1 ring-slate-800">
                        COL TOTAL
                    </TableCell>
                    {report.columns.map(col => (
                      <TableCell key={col} className="text-center font-black text-slate-100 bg-slate-800">
                        ${report.columnTotals[col].toLocaleString()}
                      </TableCell>
                    ))}
                    <TableCell className="text-right font-black text-emerald-400 bg-slate-950 sticky right-0 z-10 ring-1 ring-slate-800 border-l border-emerald-900">
                      ${report.grandTotal.toLocaleString()}
                    </TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
      
      <div className="hidden print:flex flex-col items-center mt-12 gap-2 text-xs text-slate-400 border-t pt-4">
        <p className="font-bold text-slate-600 uppercase tracking-widest">Official Financial Document</p>
        <p>HUDI SOFT Hospital Management System | Revenue Analytics Report</p>
        <p>Generated on: {format(new Date(), "PPpp")}</p>
        <div className="flex gap-12 mt-4 text-slate-600">
            <div className="flex flex-col items-center">
                <div className="w-32 h-px bg-slate-400 mb-1" />
                <span>Accountant Signature</span>
            </div>
            <div className="flex flex-col items-center">
                <div className="w-32 h-px bg-slate-400 mb-1" />
                <span>Administrator Stamp</span>
            </div>
        </div>
      </div>
    </div>
  )
}
