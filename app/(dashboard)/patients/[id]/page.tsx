"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { patientsApi, appointmentsApi, pharmacyApi, laboratoryApi, billingApi } from "@/lib/api"
import { PatientProfile } from "@/components/patients/patient-profile"

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return;

    Promise.all([
      patientsApi.getById(id).catch(() => null),
      appointmentsApi.getAll().catch(() => []),
      pharmacyApi.getPrescriptions().catch(() => []),
      laboratoryApi.getAll().catch(() => []),
      billingApi.getAll().catch(() => [])
    ]).then(([patient, allAppts, allPrescs, allLabs, allInvoices]) => {
      if (!patient) {
        router.push("/404")
        return
      }

      const patientAppts = allAppts.filter((a: any) => a.patientId === patient.patientId || a.patientId === id)
      const patientPrescs = allPrescs.filter((p: any) => p.patientId === patient.patientId || p.patientId === id)
      const patientLabs = allLabs.filter((l: any) => l.patientId === patient.patientId || l.patientId === id)
      const patientInvoices = allInvoices.filter((i: any) => i.patientId === patient.patientId || i.patientId === id)

      setData({
        patient,
        appointments: patientAppts,
        prescriptions: patientPrescs,
        labTests: patientLabs,
        invoices: patientInvoices
      })
    }).finally(() => {
      setLoading(false)
    })
  }, [id, router])

  if (loading) return <div className="flex items-center justify-center p-12"><p className="text-muted-foreground animate-pulse">Loading patient profile...</p></div>
  if (!data?.patient) return <div className="flex items-center justify-center p-12"><p className="text-muted-foreground">Patient not found</p></div>

  return (
    <PatientProfile
      patient={data.patient}
      appointments={data.appointments}
      prescriptions={data.prescriptions}
      labTests={data.labTests}
      invoices={data.invoices}
    />
  )
}
