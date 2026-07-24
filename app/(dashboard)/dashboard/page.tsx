"use client"

import { useState, useEffect } from "react"
import { accountsApi } from "@/lib/api"
import { DashboardContent } from "@/components/dashboard/dashboard-content"
import { AccountantDashboard } from "@/components/dashboard/accountant-dashboard"
import { useAuth } from "@/lib/auth-context"

export default function DashboardPage() {
  const { user } = useAuth()
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
        }
      } catch (e) {
        console.error("Failed to load accountant dashboard:", e)
      } finally {
        setLoading(false)
      }
    }
    if (user) load()
    else setLoading(false)
  }, [user])

  // Accountant role: show financial dashboard
  if (user?.role === 'accountant') {
    if (loading) return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading financial data...</p></div>
    if (!accSummary) return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Failed to load account data.</p></div>
    return <AccountantDashboard summary={accSummary} cashFlow={cashFlow} />
  }

  // All other roles: DashboardContent fetches its own data internally
  return <DashboardContent />
}
