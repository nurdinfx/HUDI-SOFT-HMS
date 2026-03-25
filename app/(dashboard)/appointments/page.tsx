"use client"
import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { appointmentsApi, doctorsApi, patientsApi, settingsApi } from "@/lib/api"
import type { Appointment, Doctor, Patient } from "@/lib/api"
import { AppointmentsContent } from "@/components/appointments/appointments-content"

function AppointmentsContentWrapper() {
  const searchParams = useSearchParams()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
 
  const fetchData = () => {
    setLoading(true)
    Promise.all([
      appointmentsApi.getAll().then((a) => setAppointments(Array.isArray(a) ? a : [])).catch(() => setAppointments([])),
      doctorsApi.getAll().then((d) => setDoctors(Array.isArray(d) ? d : [])).catch(() => setDoctors([])),
      patientsApi.getAll().then((p) => setPatients(Array.isArray(p) ? p : [])).catch(() => setPatients([])),
      settingsApi.get().catch(() => null).then(setSettings),
    ]).finally(() => setLoading(false))
  }


  useEffect(() => {
    fetchData()
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading appointments...</p></div>

  const initialPatientId = searchParams.get('patientId')
  const initialDoctorId = searchParams.get('doctorId')

  return (
    <AppointmentsContent
      appointments={appointments}
      doctors={doctors}
      patients={patients}
      settings={settings}
      onRefresh={fetchData}
      initialPatientId={initialPatientId}
      initialDoctorId={initialDoctorId}
    />
  )
}

export default function AppointmentsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <AppointmentsContentWrapper />
    </Suspense>
  )
}
