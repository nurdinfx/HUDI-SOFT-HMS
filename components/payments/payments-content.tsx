"use client"

import { useState, useMemo } from "react"
import {
    Search,
    Filter,
    Download,
    MoreHorizontal,
    DollarSign,
    Calendar,
    CheckCircle2,
    Clock,
    Printer,
    FileDown,
    Wallet,
    Activity,
} from "lucide-react"
import { Input } from "@/components/ui/input"
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { StatCard } from "@/components/shared/stat-card"
import { format } from "date-fns"
import type { Payment } from "@/lib/api"

interface PaymentsContentProps {
    payments: Payment[]
    onRefresh?: () => void
}

export function PaymentsContent({ payments, onRefresh }: PaymentsContentProps) {
    const [search, setSearch] = useState("")
    const [method, setMethod] = useState("all")
    const [dateFilter, setDateFilter] = useState("all")

    const filteredPayments = useMemo(() => {
        return payments.filter((p) => {
            const matchSearch =
                !search ||
                p.patientName.toLowerCase().includes(search.toLowerCase()) ||
                p.invoiceId?.toLowerCase().includes(search.toLowerCase()) ||
                p.description.toLowerCase().includes(search.toLowerCase())

            const matchMethod = method === "all" || p.method === method

            return matchSearch && matchMethod
        })
    }, [payments, search, method])

    const stats = useMemo(() => {
        const total = payments.reduce((acc, curr) => acc + curr.amount, 0)
        const today = payments.filter(p => p.date === format(new Date(), "yyyy-MM-dd")).reduce((acc, curr) => acc + curr.amount, 0)
        const cash = payments.filter(p => p.method === 'cash').reduce((acc, curr) => acc + curr.amount, 0)
        const online = payments.filter(p => p.method !== 'cash').length

        return { total, today, cash, online }
    }, [payments])

    const exportData = () => {
        const csvContent = "data:text/csv;charset=utf-8,"
            + ["Date,Patient,Invoice,Method,Amount,Description"].join(",") + "\n"
            + filteredPayments.map(p => `${p.date},${p.patientName},${p.invoiceId},${p.method},${p.amount},${p.description}`).join("\n")

        const encodedUri = encodeURI(csvContent)
        const link = document.createElement("a")
        link.setAttribute("href", encodedUri)
        link.setAttribute("download", `payments_report_${format(new Date(), "yyyy-MM-dd")}.csv`)
        document.body.appendChild(link)
        link.click()
    }

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Payment Management"
                description="Monitor and reconcile all hospital transactions and POS payments."
            >
                <div className="flex gap-2">
                    <Button variant="outline" onClick={exportData}>
                        <Download className="mr-2 size-4" />
                        Export CSV
                    </Button>
                    <Button onClick={onRefresh}>
                        <Clock className="mr-2 size-4" />
                        Refresh
                    </Button>
                </div>
            </PageHeader>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Total Collections"
                    value={`$${stats.total.toLocaleString()}`}
                    icon={DollarSign}
                    iconClassName="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                />
                <StatCard
                    title="Collections Today"
                    value={`$${stats.today.toLocaleString()}`}
                    icon={CheckCircle2}
                    iconClassName="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                />
                <StatCard
                    title="Cash Payments"
                    value={`$${stats.cash.toLocaleString()}`}
                    icon={Wallet}
                    iconClassName="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
                />
                <StatCard
                    title="Digital Transactions"
                    value={stats.online}
                    icon={Activity}
                    description="Card, Insurance, MPesa"
                    iconClassName="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
                />
            </div>

            <Card>
                <CardHeader>
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <CardTitle className="text-base font-semibold">Transaction History</CardTitle>
                        <div className="flex flex-wrap gap-2">
                            <div className="relative w-full md:w-64">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search patient or invoice..."
                                    className="pl-9"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <Select value={method} onValueChange={setMethod}>
                                <SelectTrigger className="w-[130px]">
                                    <SelectValue placeholder="Method" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Methods</SelectItem>
                                    <SelectItem value="cash">Cash</SelectItem>
                                    <SelectItem value="card">Card</SelectItem>
                                    <SelectItem value="insurance">Insurance</SelectItem>
                                    <SelectItem value="mpesa">MPesa</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="pl-6">Date</TableHead>
                                <TableHead>Invoice #</TableHead>
                                <TableHead>Patient</TableHead>
                                <TableHead>Method</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right pr-6">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredPayments.map((p) => (
                                <TableRow key={p.id}>
                                    <TableCell className="pl-6">{format(new Date(p.date), "MMM d, yyyy")}</TableCell>
                                    <TableCell className="font-mono text-xs">{p.invoiceId || "POS-N/A"}</TableCell>
                                    <TableCell className="font-medium">{p.patientName}</TableCell>
                                    <TableCell>
                                        <StatusBadge status={p.method} />
                                    </TableCell>
                                    <TableCell className="font-bold text-emerald-600 dark:text-emerald-400">
                                        ${p.amount.toLocaleString()}
                                    </TableCell>
                                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                                        {p.description}
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="size-8">
                                                    <MoreHorizontal className="size-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem>
                                                    <Printer className="mr-2 size-4" />
                                                    Print Receipt
                                                </DropdownMenuItem>
                                                <DropdownMenuItem>
                                                    <FileDown className="mr-2 size-4" />
                                                    View Invoice
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filteredPayments.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                                        No transactions found matching your criteria.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
