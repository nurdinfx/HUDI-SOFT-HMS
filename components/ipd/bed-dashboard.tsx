"use client"

import { useState } from "react"
import { BedDouble, CheckCircle2, AlertCircle, Trash2, Settings2, MoreVertical } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ipdApi, type Bed } from "@/lib/api"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { AddBedDialog } from "./add-bed-dialog"
import { EditBedDialog } from "./edit-bed-dialog"
import { Plus } from "lucide-react"

interface BedDashboardProps {
    beds: Bed[]
    onRefresh: () => void
}

const statusColors = {
    available: "bg-emerald-500",
    occupied: "bg-rose-500",
    cleaning: "bg-amber-500",
    maintenance: "bg-slate-900",
}

const statusText = {
    available: "Available",
    occupied: "Occupied",
    cleaning: "Cleaning",
    maintenance: "Maintenance",
}

export function BedDashboard({ beds, onRefresh }: BedDashboardProps) {
    const [updating, setUpdating] = useState<string | null>(null)

    const [addingToWard, setAddingToWard] = useState("")
    const [isAddOpen, setIsAddOpen] = useState(false)

    const [editingBed, setEditingBed] = useState<Bed | null>(null)
    const [isEditOpen, setIsEditOpen] = useState(false)

    const handleDeleteBed = async (id: string) => {
        if (!confirm("Are you sure you want to delete this bed?")) return
        try {
            await ipdApi.deleteBed(id)
            toast.success("Bed deleted successfully")
            onRefresh()
        } catch (error: any) {
            toast.error(error.message || "Failed to delete bed")
        }
    }

    const handleStatusChange = async (bedId: string, newStatus: string) => {
        setUpdating(bedId)
        try {
            await ipdApi.updateBed(bedId, { status: newStatus })
            onRefresh()
        } catch (error) {
            console.error("Failed to update bed status:", error)
        } finally {
            setUpdating(null)
        }
    }

    const wards = [...new Set(beds.map((b) => b.ward))]

    return (
        <div className="flex flex-col gap-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold">Real-Time Bed Dashboard</h2>
                    <p className="text-sm text-muted-foreground">Monitor and manage hospital bed availability across all wards.</p>
                </div>
                <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                        <div className="size-3 rounded-full bg-emerald-500" />
                        <span className="text-xs">Available</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="size-3 rounded-full bg-rose-500" />
                        <span className="text-xs">Occupied</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="size-3 rounded-full bg-amber-500" />
                        <span className="text-xs">Cleaning</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="size-3 rounded-full bg-slate-900" />
                        <span className="text-xs">Maintenance</span>
                    </div>
                </div>
            </div>

            {wards.map((ward) => (
                <div key={ward} className="flex flex-col gap-4">
                    <div className="flex items-center gap-2 border-b pb-2">
                        <Building2 className="size-5 text-muted-foreground" />
                        <h3 className="font-medium text-lg">{ward} Ward</h3>
                        <Button
                            variant="outline"
                            size="sm"
                            className="ml-auto gap-2"
                            onClick={() => {
                                setAddingToWard(ward);
                                setIsAddOpen(true);
                            }}
                        >
                            <Plus className="size-4" /> Add Bed
                        </Button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                        {beds.filter(b => b.ward === ward).map((bed) => (
                            <Card
                                key={bed.id}
                                className={cn(
                                    "relative overflow-hidden transition-all hover:ring-2 hover:ring-primary/20",
                                    updating === bed.id && "opacity-50 grayscale"
                                )}
                            >
                                <div className={cn("h-1 w-full", statusColors[bed.status as keyof typeof statusColors])} />
                                <CardContent className="p-4 flex flex-col items-center gap-2">
                                    <div className="absolute top-2 right-2">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="size-6">
                                                    <MoreVertical className="size-3" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => handleStatusChange(bed.id, "available")}>
                                                    Mark as Available
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleStatusChange(bed.id, "cleaning")}>
                                                    Mark as Cleaning
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleStatusChange(bed.id, "maintenance")}>
                                                    Mark as Maintenance
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => {
                                                    setEditingBed(bed)
                                                    setIsEditOpen(true)
                                                }}>
                                                    Edit Bed Details
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleDeleteBed(bed.id)} className="text-red-600 focus:text-red-600">
                                                    Delete Bed
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                    <BedDouble className={cn("size-8 mt-2", bed.status === "available" ? "text-emerald-500" : "text-muted-foreground")} />
                                    <p className="font-mono font-bold text-lg">{bed.bedNumber}</p>
                                    <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                                        {bed.type}
                                    </p>
                                    <Badge variant="outline" className="text-[10px] py-0">
                                        {statusText[bed.status as keyof typeof statusText]}
                                    </Badge>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            ))}

            <AddBedDialog
                ward={addingToWard}
                open={isAddOpen}
                onOpenChange={setIsAddOpen}
                onSuccess={onRefresh}
            />

            <EditBedDialog
                bed={editingBed}
                open={isEditOpen}
                onOpenChange={setIsEditOpen}
                onSuccess={onRefresh}
            />
        </div>
    )
}

function Building2(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
            <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
            <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
            <path d="M10 6h4" />
            <path d="M10 10h4" />
            <path d="M10 14h4" />
            <path d="M10 18h4" />
        </svg>
    )
}
