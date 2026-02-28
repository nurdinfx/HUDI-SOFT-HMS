"use client"

import { useState, useEffect } from "react"
import { dashboardApi, patientsApi, doctorsApi } from "@/lib/api"
import { DashboardContent } from "@/components/dashboard/dashboard-content"

export default function DashboardPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const dashData = await dashboardApi.getStats()
        setData(dashData)
      } catch (e) {
        console.error("Failed to load dashboard:", e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading dashboard...</p></div>
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
