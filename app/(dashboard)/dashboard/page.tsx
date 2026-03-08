"use client"

import { useState, useEffect } from "react"
import { dashboardApi, accountsApi } from "@/lib/api"
import { DashboardContent } from "@/components/dashboard/dashboard-content"
import { AccountantDashboard } from "@/components/dashboard/accountant-dashboard"
import { useAuth } from "@/lib/auth-context"

export default function DashboardPage() {
  const { user } = useAuth()
  const [data, setData] = useState<any>(null)
  const [accSummary, setAccSummary] = useState<any>(null)
  const [cashFlow, setCashFlow] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        if (user?.role === 'accountant') {
          const [summary, flow] = await Promise.all([
            accountsApi.getSummary(),
            accountsApi.getCashFlow()
          ])
          setAccSummary(summary)
          setCashFlow(flow)
        } else {
          const dashData = await dashboardApi.getStats()
          setData(dashData)
        }
      } catch (e) {
        console.error("Failed to load dashboard:", e)
      } finally {
        setLoading(false)
      }
    }
    if (user) load()
  }, [user])

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading dashboard...</p></div>

  if (user?.role === 'accountant') {
    if (!accSummary) return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Failed to load account data.</p></div>
    return <AccountantDashboard summary={accSummary} cashFlow={cashFlow} />
  }

  if (!data) return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Failed to load dashboard data.</p></div>

  return (
    <DashboardContent
      stats={data.stats}
      recentAppointments={data.recentAppointments || []}
      revenueByMonth={data.revenueByMonth || []}
      apptByStatus={data.apptByStatus || []}
      recentPatients={[]}
      doctors={[]}
    />
  )
}
