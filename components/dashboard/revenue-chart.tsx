"use client"

import { useMemo } from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts"

interface RevenueChartProps {
  data?: { month: string; revenue: number; count?: number }[]
}

export function RevenueChart({ data: backendData = [] }: RevenueChartProps) {
  const data = useMemo(() => {
    if (Array.isArray(backendData) && backendData.length > 0) {
      return backendData.map((d) => {
        const [y, m] = (d.month || "").split("-")
        const monthLabel = m && y ? new Date(Number(y), Number(m) - 1).toLocaleString("default", { month: "short" }) + " " + y : d.month
        return {
          month: monthLabel,
          revenue: Number(d.revenue) || 0,
          expenses: 0,
        }
      })
    }
    return []
  }, [backendData])

  if (data.length === 0) {
    return (
      <div className="h-[300px] w-full flex items-center justify-center text-muted-foreground text-sm">
        No revenue data yet
      </div>
    )
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="oklch(0.55 0.15 195)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="oklch(0.55 0.15 195)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="oklch(0.65 0.12 160)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="oklch(0.65 0.12 160)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12 }}
            className="text-muted-foreground"
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            className="text-muted-foreground"
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "oklch(1 0 0)",
              border: "1px solid oklch(0.90 0.01 220)",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            formatter={(value: number) => [`$${value.toLocaleString()}`, ""]}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="oklch(0.55 0.15 195)"
            fill="url(#revenueGrad)"
            strokeWidth={2}
            name="Revenue"
          />
          <Area
            type="monotone"
            dataKey="expenses"
            stroke="oklch(0.65 0.12 160)"
            fill="url(#expenseGrad)"
            strokeWidth={2}
            name="Expenses"
            hide
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
