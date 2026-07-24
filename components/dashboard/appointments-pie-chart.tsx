"use client"

import { useMemo } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"

const COLORS = ["oklch(0.55 0.15 195)", "oklch(0.65 0.12 160)", "oklch(0.72 0.16 80)", "oklch(0.58 0.20 30)", "oklch(0.6 0.14 280)"]

interface AppointmentsPieChartProps {
  data?: { status: string; count: number }[]
  appointments?: { type?: string; status?: string }[]
}

export function AppointmentsPieChart({ data: statusData = [], appointments = [] }: AppointmentsPieChartProps) {
  const data = useMemo(() => {
    if (Array.isArray(statusData) && statusData.length > 0) {
      return statusData.map((d, i) => ({
        name: (d.status || "").replace(/-/g, " "),
        value: Number(d.count) || 0,
        color: COLORS[i % COLORS.length],
      })).filter((d) => d.value > 0)
    }
    const list = Array.isArray(appointments) ? appointments : []
    const byType: Record<string, number> = {}
    list.forEach((a) => {
      const t = a.type || "Other"
      byType[t] = (byType[t] || 0) + 1
    })
    return Object.entries(byType).map(([name, value], i) => ({
      name: name.replace(/-/g, " "),
      value,
      color: COLORS[i % COLORS.length],
    })).filter((d) => d.value > 0)
  }, [statusData, appointments])

  if (data.length === 0) {
    return (
      <div className="h-[300px] w-full flex items-center justify-center text-muted-foreground text-sm">
        No appointment data yet
      </div>
    )
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="45%"
            innerRadius={60}
            outerRadius={95}
            paddingAngle={4}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "oklch(1 0 0)",
              border: "1px solid oklch(0.90 0.01 220)",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            formatter={(value: number) => [value, ""]}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            iconSize={8}
            formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
