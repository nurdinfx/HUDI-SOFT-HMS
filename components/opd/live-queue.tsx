"use client"

import { Clock, Play, CheckCircle2, MoreHorizontal, User } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import type { OPDVisit } from "@/lib/api"
import { opdApi } from "@/lib/api"
import { toast } from "sonner"

interface Props {
    visits: OPDVisit[]
    onRefresh: () => void
    onStartConsult: (visit: OPDVisit) => void
}

export function LiveQueue({ visits, onRefresh, onStartConsult }: Props) {

    const handleUpdateStatus = async (id: string, newStatus: string) => {
        try {
            await opdApi.update(id, { status: newStatus })
            toast.success(`Status updated to ${newStatus}`)
            onRefresh()
        } catch (error) {
            toast.error("Failed to update status")
        }
    }

    const columns = [
        { label: "Waiting", value: "waiting", color: "text-amber-600 bg-amber-50 border-amber-200" },
        { label: "In Consultation", value: "in-consultation", color: "text-blue-600 bg-blue-50 border-blue-200" },
        { label: "Completed Today", value: "completed", color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
    ]

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-700 h-full min-h-[600px]">
            {columns.map((col) => {
                const columnVisits = visits.filter(v => v.status === col.value)

                return (
                    <div key={col.value} className="flex flex-col gap-4">
                        <div className={`p-4 border rounded-xl flex items-center justify-between shadow-sm ${col.color}`}>
                            <div className="flex items-center gap-2">
                                <div className="size-2 rounded-full bg-current animate-pulse" />
                                <h3 className="font-bold uppercase tracking-wider text-xs">{col.label}</h3>
                            </div>
                            <Badge variant="outline" className="font-bold border-current/20 bg-background/50">
                                {columnVisits.length}
                            </Badge>
                        </div>

                        <div className="flex-1 bg-muted/20 border-2 border-dashed rounded-xl p-3 space-y-4 min-h-[300px]">
                            {columnVisits.map((visit) => (
                                <Card key={visit.id} className="group hover:ring-2 hover:ring-primary/20 transition-all border-none shadow-sm shadow-black/5 overflow-hidden">
                                    <div className="bg-primary/5 px-4 py-2 flex justify-between items-center border-b">
                                        <span className="font-mono text-[10px] font-bold text-primary/70">#{visit.visitId}</span>
                                        <span className="text-[10px] lowercase font-medium text-muted-foreground italic">{visit.time}</span>
                                    </div>
                                    <CardContent className="p-4 space-y-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs uppercase">
                                                    {visit.patientName.split(' ')[0][0]}{visit.patientName.split(' ')[1]?.[0] || ''}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm leading-none mb-1">{visit.patientName}</p>
                                                    <p className="text-[10px] text-muted-foreground font-medium uppercase">{visit.visitType}</p>
                                                </div>
                                            </div>
                                            <Badge className="font-mono text-xs shadow-none">TK {visit.tokenNumber}</Badge>
                                        </div>

                                        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                                            <User className="size-3" />
                                            <span className="font-medium">Dr. {visit.doctorName}</span>
                                        </div>

                                        <div className="pt-2 flex gap-2">
                                            {visit.status === 'waiting' && (
                                                <Button className="flex-1 h-9 gap-2 shadow-sm" onClick={() => onStartConsult(visit)}>
                                                    <Play className="size-3 fill-current" />
                                                    Start Consultation
                                                </Button>
                                            )}
                                            {visit.status === 'in-consultation' && (
                                                <Button className="flex-1 h-9 gap-2 shadow-sm bg-blue-600 hover:bg-blue-700" onClick={() => onStartConsult(visit)}>
                                                    <Clock className="size-3" />
                                                    Open Clinical
                                                </Button>
                                            )}
                                            {visit.status === 'completed' && (
                                                <Button variant="outline" className="flex-1 h-9 gap-2 border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100" onClick={() => onStartConsult(visit)}>
                                                    <CheckCircle2 className="size-3" />
                                                    View Record
                                                </Button>
                                            )}

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-9 w-9 border">
                                                        <MoreHorizontal className="size-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleUpdateStatus(visit.id, 'waiting')}>Move to Waiting</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleUpdateStatus(visit.id, 'in-consultation')}>Move to Consultation</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleUpdateStatus(visit.id, 'completed')}>Move to Completed</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}

                            {columnVisits.length === 0 && (
                                <div className="h-40 flex flex-col items-center justify-center text-muted-foreground opacity-30">
                                    <Clock className="size-8 mb-2" />
                                    <p className="text-xs italic">No patients in this stage</p>
                                </div>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
