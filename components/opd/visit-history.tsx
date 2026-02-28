"use client"

import { useState, useMemo } from "react"
import { Search, Eye, Filter, Calendar, FileText } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { StatusBadge } from "@/components/shared/status-badge"
import type { OPDVisit } from "@/lib/api"
import { Badge } from "@/components/ui/badge"

interface Props {
    visits: OPDVisit[]
    onView: (visit: OPDVisit) => void
}

export function VisitHistory({ visits, onView }: Props) {
    const [search, setSearch] = useState("")
    const [filterType, setFilterType] = useState<string>("all")

    const filtered = useMemo(() => {
        return visits.filter(v => {
            const matchSearch =
                v.patientName.toLowerCase().includes(search.toLowerCase()) ||
                v.visitId.toLowerCase().includes(search.toLowerCase()) ||
                v.doctorName.toLowerCase().includes(search.toLowerCase())

            const matchType = filterType === "all" || v.visitType === filterType

            return matchSearch && matchType
        })
    }, [visits, search, filterType])

    const completed = filtered.filter(v => v.status === 'completed')

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4 md:items-center">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by Patient, ID, or Doctor..."
                                className="pl-10 h-11"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant={filterType === 'all' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setFilterType('all')}
                            >All</Button>
                            <Button
                                variant={filterType === 'New' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setFilterType('New')}
                            >New</Button>
                            <Button
                                variant={filterType === 'Follow-Up' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setFilterType('Follow-Up')}
                            >Follow-Up</Button>
                            <Button
                                variant={filterType === 'Emergency' ? 'default' : 'outline'}
                                size="sm"
                                className={filterType === 'Emergency' ? 'bg-rose-600 hover:bg-rose-700' : 'border-rose-200 text-rose-600 hover:bg-rose-50'}
                                onClick={() => setFilterType('Emergency')}
                            >Emergency</Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead className="w-[120px]">Date</TableHead>
                                <TableHead>Visit ID</TableHead>
                                <TableHead>Patient Name</TableHead>
                                <TableHead>Doctor</TableHead>
                                <TableHead>Visit Type</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right pr-6">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.map((v) => (
                                <TableRow key={v.id} className="group hover:bg-muted/30 transition-colors">
                                    <TableCell>
                                        <div className="flex items-center gap-2 text-xs font-medium">
                                            <Calendar className="size-3 text-muted-foreground" />
                                            {v.date}
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">{v.visitId}</TableCell>
                                    <TableCell>
                                        <div className="font-bold">{v.patientName}</div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{v.doctorName}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="font-medium">{v.visitType}</Badge>
                                    </TableCell>
                                    <TableCell><StatusBadge status={v.status} /></TableCell>
                                    <TableCell className="text-right pr-6">
                                        <Button variant="outline" size="sm" className="gap-2 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all" onClick={() => onView(v)}>
                                            <Eye className="size-3" />
                                            View Records
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filtered.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-24 text-muted-foreground">
                                        <FileText className="size-12 mx-auto opacity-10 mb-4" />
                                        No visit history records found.
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
