"use client"

import { useState, useEffect } from "react"
import { dashboardApi, billingApi, appointmentsApi, patientsApi, accountsApi } from "@/lib/api"
import { ReportsContent } from "@/components/reports/reports-content"

export default function ReportsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      dashboardApi.getStats(),
      billingApi.getAll(),
      appointmentsApi.getAll(),
      patientsApi.getAll(),
      accountsApi.getAll(),
    ]).then(([dash, invoices, appointments, patients, accountData]) => {
      setData({
        stats: dash.stats,
        invoices,
        appointments,
        patients,
        accountEntries: (accountData as any).entries || accountData,
      })
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading reports...</p></div>
  if (!data) return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Failed to load report data.</p></div>

  return (
    <ReportsContent
      stats={data.stats}
      invoices={data.invoices}
      appointments={data.appointments}
      patients={data.patients}
      accountEntries={data.accountEntries}
    />
  )
}
