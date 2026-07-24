"use client"

import { useState, useEffect } from "react"
import { ipdApi, patientsApi, doctorsApi } from "@/lib/api"
import { IPDContent } from "@/components/ipd/ipd-content"

export default function IPDPage() {
  const [admissions, setAdmissions] = useState<any[]>([])
  const [beds, setBeds] = useState<any[]>([])
  const [patients, setPatients] = useState<any[]>([])
  const [doctors, setDoctors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      ipdApi.getAdmissions(),
      ipdApi.getBeds(),
      patientsApi.getAll(),
      doctorsApi.getAll()
    ]).then(([adm, bds, pts, dcs]) => {
      setAdmissions(Array.isArray(adm) ? adm : [])
      setBeds(Array.isArray(bds) ? bds : [])
      setPatients(Array.isArray(pts) ? pts : [])
      setDoctors(Array.isArray(dcs) ? dcs : [])
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading IPD...</p></div>

  return <IPDContent admissions={admissions} beds={beds} patients={patients} doctors={doctors} />
}
