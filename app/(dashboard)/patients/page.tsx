"use client"

import { useState, useEffect } from "react"
import { patientsApi } from "@/lib/api"
import type { Patient } from "@/lib/api"
import { PatientsContent } from "@/components/patients/patients-content"

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = () => {
    setLoading(true)
    patientsApi.getAll().then(setPatients).catch(console.error).finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading patients...</p></div>

  return <PatientsContent patients={patients as any} onRefresh={loadData} />
}
