"use client"

import { useState, useEffect } from "react"
import { insuranceApi } from "@/lib/api"
import { InsuranceContent } from "@/components/insurance/insurance-content"

export default function InsurancePage() {
  const [companies, setCompanies] = useState<any[]>([])
  const [claims, setClaims] = useState<any[]>([])
  const [policies, setPolicies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    try {
      const [comp, cl, pol] = await Promise.all([
        insuranceApi.getCompanies(),
        insuranceApi.getClaims(),
        insuranceApi.getPolicies(),
      ])
      setCompanies(Array.isArray(comp) ? comp : [])
      setClaims(Array.isArray(cl) ? cl : [])
      setPolicies(Array.isArray(pol) ? pol : [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading insurance...</p></div>

  return <InsuranceContent companies={companies} claims={claims} policies={policies} onRefresh={fetchData} />
}
