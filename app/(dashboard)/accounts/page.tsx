"use client"

import { useState, useEffect } from "react"
import { accountsApi, type AccountEntry, type AccountsSummary, type CashFlowEntry, type DepartmentBudget } from "@/lib/api"
import { AccountsContent } from "@/components/accounts/accounts-content"
import { Skeleton } from "@/components/ui/skeleton"

export default function AccountsPage() {
  const [entries, setEntries] = useState<AccountEntry[]>([])
  const [summary, setSummary] = useState<AccountsSummary | null>(null)
  const [cashFlow, setCashFlow] = useState<CashFlowEntry[]>([])
  const [budgets, setBudgets] = useState<DepartmentBudget[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    try {
      const [entriesData, summaryData, analyticsData, budgetsData] = await Promise.all([
        accountsApi.getAll(),
        accountsApi.getSummary(),
        accountsApi.getCashFlow(),
        accountsApi.getBudgets()
      ])
      setEntries(entriesData)
      setSummary(summaryData)
      setCashFlow(analyticsData)
      setBudgets(budgetsData)
    } catch (error) {
      console.error("Failed to fetch accounts data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
        <Skeleton className="h-[400px] w-full rounded-3xl" />
      </div>
    )
  }

  return (
    <AccountsContent
      entries={entries}
      summary={summary}
      cashFlow={cashFlow}
      budgets={budgets}
      onRefresh={fetchData}
    />
  )
}
