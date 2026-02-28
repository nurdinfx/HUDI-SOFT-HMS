"use client"

import { useState, useEffect } from "react"
import { opdApi, doctorsApi, patientsApi } from "@/lib/api"
import { OPDContent } from "@/components/opd/opd-content"

export default function OPDPage() {
  const [visits, setVisits] = useState<any[]>([])
  const [doctors, setDoctors] = useState<any[]>([])
  const [patients, setPatients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = () => {
    setLoading(true)
    Promise.all([
      opdApi.getAll(),
      doctorsApi.getAll(),
      patientsApi.getAll(),
    ]).then(([v, d, p]) => {
      setVisits(Array.isArray(v) ? v : [])
      setDoctors(Array.isArray(d) ? d : [])
      setPatients(Array.isArray(p) ? p : [])
    }).catch(console.error).finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading OPD...</p></div>

  return <OPDContent visits={visits} doctors={doctors} patients={patients} onRefresh={loadData} />
}
