"use client"

import { useState, useEffect } from "react"
import { billingApi, patientsApi } from "@/lib/api"
import { BillingContent } from "@/components/billing/billing-content"

export default function BillingPage() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [patients, setPatients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    try {
      const [inv, pats] = await Promise.all([
        billingApi.getAll(),
        patientsApi.getAll(),
      ])
      setInvoices(Array.isArray(inv) ? inv : [])
      setPatients(Array.isArray(pats) ? pats : [])
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

  return <BillingContent invoices={invoices} patients={patients} onRefresh={fetchData} />
}
