"use client"

import { useState, useEffect } from "react"
import { pharmacyApi } from "@/lib/api"
import { InventoryContent } from "@/components/inventory/inventory-content"

export default function InventoryPage() {
  const [medicines, setMedicines] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    pharmacyApi.getMedicines().then((m) => setMedicines(Array.isArray(m) ? m : [])).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading inventory...</p></div>

  return <InventoryContent medicines={medicines} />
}
