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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import type { Medicine } from "@/lib/api"

interface InventoryContentProps {
  medicines?: Medicine[]
}

export function InventoryContent({ medicines = [] }: InventoryContentProps) {
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")

  const list = Array.isArray(medicines) ? medicines : []
  const filtered = useMemo(() => {
    return list.filter((m) => {
      const matchSearch =
        !search ||
        m.name?.toLowerCase().includes(search.toLowerCase()) ||
        m.genericName?.toLowerCase().includes(search.toLowerCase()) ||
        m.batchNumber?.toLowerCase().includes(search.toLowerCase())
      const matchCategory = categoryFilter === "all" || m.category === categoryFilter
      return matchSearch && matchCategory
    })
  }, [list, search, categoryFilter])

  const categories = useMemo(() => [...new Set(list.map((m) => m.category).filter(Boolean))], [list])
  const lowStock = list.filter((m) => m.quantity <= (m.reorderLevel || 0)).length

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Inventory"
        description={`${list.length} items · ${lowStock} below reorder level`}
      />
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, generic name, batch..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Generic</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="hidden md:table-cell">Batch</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead className="hidden md:table-cell">Reorder</TableHead>
                <TableHead className="hidden md:table-cell">Expiry</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((m) => {
                const isLow = m.quantity <= (m.reorderLevel || 0)
                const status = isLow ? "low-stock" : "in-stock"
                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.name}</TableCell>
                    <TableCell className="hidden md:table-cell">{m.genericName ?? "—"}</TableCell>
                    <TableCell>{m.category ?? "—"}</TableCell>
                    <TableCell className="hidden md:table-cell font-mono text-xs">{m.batchNumber ?? "—"}</TableCell>
                    <TableCell>{m.quantity}</TableCell>
                    <TableCell className="hidden md:table-cell">{m.reorderLevel ?? "—"}</TableCell>
                    <TableCell className="hidden md:table-cell">{m.expiryDate ?? "—"}</TableCell>
                    <TableCell><StatusBadge status={status} /></TableCell>
                  </TableRow>
                )
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No inventory items found.
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
