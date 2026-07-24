"use client"

import { useState, useEffect } from "react"
import { doctorsApi } from "@/lib/api"
import type { Doctor } from "@/lib/api"
import { DoctorsContent } from "@/components/doctors/doctors-content"

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)

  const loadDoctors = () => {
    setLoading(true)
    doctorsApi.getAll()
      .then(setDoctors)
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadDoctors()
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading doctors...</p></div>

  return <DoctorsContent doctors={doctors as any} onRefresh={loadDoctors} />
}
