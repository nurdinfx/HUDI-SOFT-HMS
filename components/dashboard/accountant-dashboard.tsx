"use client"

import { useMemo } from "react"
import {
    DollarSign,
    TrendingUp,
    TrendingDown,
    Wallet,
    Receipt,
    PieChart as PieChartIcon,
    Activity,
    ArrowUpRight,
    ArrowDownRight,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatCard } from "@/components/shared/stat-card"
import { PageHeader } from "@/components/shared/page-header"
import { RevenueChart } from "./revenue-chart"
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip as RechartsTooltip,
    Legend,
} from "recharts"
import type { AccountsSummary, CashFlowEntry } from "@/lib/api"
import { format } from "date-fns"

interface AccountantDashboardProps {
    summary: AccountsSummary
    cashFlow: CashFlowEntry[]
}

const COLORS = ["#0ea5e9", "#10b981", "#f59e0b", "#6366f1", "#ec4899", "#8b5cf6"]

export function AccountantDashboard({ summary, cashFlow }: AccountantDashboardProps) {
    const deptData = useMemo(() => {
        return summary.departmentRevenue.map((d) => ({
            name: d.department,
            value: d.amount,
        }))
    }, [summary.departmentRevenue])

    const todayDeptData = useMemo(() => {
        return summary.todayDeptRevenue.map((d) => ({
            name: d.department,
            value: d.amount,
        }))
    }, [summary.todayDeptRevenue])

    const totalToday = summary.incomeToday

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Financial Dashboard"
                description="Real-time financial metrics and revenue performance."
            />

            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <StatCard
                    title="Revenue Today"
                    value={`$${summary.incomeToday.toLocaleString()}`}
                    icon={TrendingUp}
                    iconClassName="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                />
                <StatCard
                    title="Monthly Revenue"
                    value={`$${summary.incomeMonth.toLocaleString()}`}
                    icon={Activity}
                    iconClassName="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                />
                <StatCard
                    title="Outstanding Bal."
                    value={`$${summary.outstandingBalance.toLocaleString()}`}
                    icon={Receipt}
                    description="Unpaid invoices"
                    iconClassName="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
                />
                <StatCard
                    title="Total Expenses"
                    value={`$${summary.totalExpense.toLocaleString()}`}
                    icon={TrendingDown}
                    iconClassName="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                />
                <StatCard
                    title="Net Profit"
                    value={`$${summary.profit.toLocaleString()}`}
                    icon={Wallet}
                    iconClassName="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
                />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
                {/* Main Revenue Chart */}
                <Card className="lg:col-span-4">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <TrendingUp className="size-4" />
                            Monthly Income Trend
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <RevenueChart data={cashFlow.map(c => ({ month: c.month, revenue: c.income }))} />
                    </CardContent>
                </Card>

                {/* Department Distribution */}
                <Card className="lg:col-span-3">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <PieChartIcon className="size-4" />
                            Revenue by Department
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center">
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={deptData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {deptData.map((_entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip
                                        formatter={(value: number) => [`$${value.toLocaleString()}`, "Amount"]}
                                    />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* Today's Breakdown */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base font-semibold">Today's Revenue Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {todayDeptData.length > 0 ? (
                                todayDeptData.map((d, i) => (
                                    <div key={d.name} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="size-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                            <span className="text-sm font-medium">{d.name}</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-sm font-semibold">${d.value.toLocaleString()}</span>
                                            <span className="text-xs text-muted-foreground w-12 text-right">
                                                {((d.value / totalToday) * 100).toFixed(1)}%
                                            </span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-8">No revenue recorded today.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Transactions */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base font-semibold">Recent Transactions</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="flex flex-col">
                            {summary.recentEntries.map((entry) => (
                                <div key={entry.id} className="flex items-center justify-between p-4 border-b last:border-0">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-full ${entry.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                            {entry.type === 'income' ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">{entry.description}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {format(new Date(entry.date), "MMM d")} • {entry.paymentMethod}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`text-sm font-bold ${entry.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {entry.type === 'income' ? '+' : '-'}${entry.amount.toLocaleString()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
