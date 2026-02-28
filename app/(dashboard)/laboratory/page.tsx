"use client"

import { useState, useEffect } from "react"
import { laboratoryApi } from "@/lib/api"
import { LaboratoryContent } from "@/components/laboratory/laboratory-content"

export default function LaboratoryPage() {
  const [labTests, setLabTests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    laboratoryApi.getAll().then(setLabTests).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading laboratory...</p></div>

  return <LaboratoryContent initialLabTests={labTests} />
}
