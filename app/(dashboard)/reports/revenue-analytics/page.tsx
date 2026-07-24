"use client"

import { useState, useEffect } from "react"
import { format, startOfMonth } from "date-fns"
import { revenueAnalyticsApi } from "@/lib/api"
import { RevenueAnalyticsContent } from "@/components/reports/revenue-analytics-content"

export default function RevenueAnalyticsPage() {
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetchReport = async (startDate?: string, endDate?: string, source?: string) => {
    setLoading(true)
    try {
      const data = await revenueAnalyticsApi.getLiveReport({ startDate, endDate, source })
      setReport(data)
    } catch (error) {
      console.error("Failed to fetch revenue report:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const now = new Date()
    fetchReport(format(startOfMonth(now), "yyyy-MM-dd"), format(now, "yyyy-MM-dd"), "ALL")
  }, [])

  return (
    <RevenueAnalyticsContent 
      report={report} 
      loading={loading} 
      onRefresh={fetchReport} 
    />
  )
}
