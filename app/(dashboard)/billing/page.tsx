"use client"

import { useState, useEffect } from "react"
import { billingApi, patientsApi, settingsApi } from "@/lib/api"
import { BillingContent } from "@/components/billing/billing-content"

export default function BillingPage() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [patients, setPatients] = useState<any[]>([])
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    try {
      const [inv, pats, sett] = await Promise.all([
        billingApi.getAll(),
        patientsApi.getAll(),
        settingsApi.get().catch(() => null),
      ])
      setInvoices(Array.isArray(inv) ? inv : [])
      setPatients(Array.isArray(pats) ? pats : [])
      setSettings(sett)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading billing...</p></div>

  return <BillingContent invoices={invoices} patients={patients} settings={settings} onRefresh={fetchData} />
}
