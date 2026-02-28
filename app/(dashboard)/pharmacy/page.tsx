"use client"

import { useState, useEffect } from "react"
import { pharmacyApi } from "@/lib/api"
import { PharmacyContent } from "@/components/pharmacy/pharmacy-content"

export default function PharmacyPage() {
  const [medicines, setMedicines] = useState<any[]>([])
  const [prescriptions, setPrescriptions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = () => {
    setLoading(true)
    Promise.all([
      pharmacyApi.getMedicines(),
      pharmacyApi.getPrescriptions(),
    ]).then(([meds, presc]) => {
      setMedicines(meds)
      setPrescriptions(presc)
    }).catch(console.error).finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading pharmacy...</p></div>

  return <PharmacyContent prescriptions={prescriptions} medicines={medicines} onRefresh={loadData} />
}
