"use client"

import { useState, useMemo } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PageHeader } from "@/components/shared/page-header"
import type { AuditLog } from "@/lib/api"

interface AuditLogsContentProps {
  logs?: AuditLog[]
}

export function AuditLogsContent({ logs = [] }: AuditLogsContentProps) {
  const [search, setSearch] = useState("")

  const list = Array.isArray(logs) ? logs : []
  const filtered = useMemo(() => {
    if (!search.trim()) return list
    const s = search.toLowerCase()
    return list.filter(
      (l) =>
        l.userName?.toLowerCase().includes(s) ||
        l.action?.toLowerCase().includes(s) ||
        l.module?.toLowerCase().includes(s) ||
        l.details?.toLowerCase().includes(s)
    )
  }, [list, search])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Audit Logs"
        description={`${list.length} log entries`}
      />
      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by user, action, module..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Module</TableHead>
                <TableHead className="hidden md:table-cell">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground text-sm">
                    {l.timestamp ? new Date(l.timestamp).toLocaleString() : "—"}
                  </TableCell>
                  <TableCell className="font-medium">{l.userName ?? "—"}</TableCell>
                  <TableCell className="capitalize">{l.userRole ?? "—"}</TableCell>
                  <TableCell>{l.action ?? "—"}</TableCell>
                  <TableCell>{l.module ?? "—"}</TableCell>
                  <TableCell className="hidden md:table-cell max-w-[280px] truncate">{l.details ?? "—"}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No audit logs found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
