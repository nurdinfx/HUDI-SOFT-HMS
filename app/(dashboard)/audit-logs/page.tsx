"use client"

import { useState, useEffect } from "react"
import { auditApi } from "@/lib/api"
import { AuditLogsContent } from "@/components/audit-logs/audit-logs-content"

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    auditApi.getAll().then((l) => setLogs(Array.isArray(l) ? l : [])).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading audit logs...</p></div>

  return <AuditLogsContent logs={logs} />
}
