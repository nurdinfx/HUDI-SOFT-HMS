"use client"

import { useState, useEffect } from "react"
import { revenueAnalyticsApi } from "@/lib/api"
import { RevenueAnalyticsContent } from "@/components/reports/revenue-analytics-content"

export default function RevenueAnalyticsPage() {
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetchReport = async (startDate?: string, endDate?: string) => {
    setLoading(true)
    try {
      const data = await revenueAnalyticsApi.getReport({ startDate, endDate })
      setReport(data)
    } catch (error) {
      console.error("Failed to fetch revenue report:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReport()
  }, [])

  return (
    <RevenueAnalyticsContent 
      report={report} 
      loading={loading} 
      onRefresh={fetchReport} 
    />
  )
}
