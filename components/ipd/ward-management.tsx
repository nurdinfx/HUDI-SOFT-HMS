"use client"

import { useState } from "react"
import { Plus, Building2, Users, BedDouble, DollarSign } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { ipdApi, type Ward } from "@/lib/api"

interface WardManagementProps {
    wards: Ward[]
    onRefresh: () => void
}

export function WardManagement({ wards, onRefresh }: WardManagementProps) {
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: "",
        type: "General",
        department: "",
        totalBeds: "10",
        dailyRate: "100"
    })

    const handleAdd = async () => {
        setLoading(true)
        try {
            await ipdApi.createWard({
                ...formData,
                totalBeds: parseInt(formData.totalBeds),
                dailyRate: parseFloat(formData.dailyRate)
            })
            setIsAddOpen(false)
            onRefresh()
            setFormData({ name: "", type: "General", department: "", totalBeds: "10", dailyRate: "100" })
        } catch (error) {
            console.error("Failed to add ward:", error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold">Ward Management</h2>
                    <p className="text-sm text-muted-foreground">Manage hospital wards, departments, and capacity.</p>
                </div>
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus className="size-4" />
                            Add Ward
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New Ward</DialogTitle>
                            <DialogDescription>Create a new hospital ward and set its configuration.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="ward-name">Ward Name</Label>
                                <Input
                                    id="ward-name"
                                    placeholder="e.g. Ward A, ICU-1"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="ward-type">Ward Type</Label>
                                    <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="General">General</SelectItem>
                                            <SelectItem value="ICU">ICU</SelectItem>
                                            <SelectItem value="Private">Private</SelectItem>
                                            <SelectItem value="Semi-Private">Semi-Private</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="ward-dept">Department</Label>
                                    <Input
                                        id="ward-dept"
                                        placeholder="e.g. Cardiology"
                                        value={formData.department}
                                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="ward-beds">Total Beds</Label>
                                    <Input
                                        id="ward-beds"
                                        type="number"
                                        value={formData.totalBeds}
                                        onChange={(e) => setFormData({ ...formData, totalBeds: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="ward-rate">Daily Rate ($)</Label>
                                    <Input
                                        id="ward-rate"
                                        type="number"
                                        value={formData.dailyRate}
                                        onChange={(e) => setFormData({ ...formData, dailyRate: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                            <Button onClick={handleAdd} disabled={loading}>{loading ? "Adding..." : "Add Ward"}</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {wards.map((ward) => (
                    <Card key={ward.id}>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <div className="space-y-1">
                                <CardTitle className="text-lg">{ward.name}</CardTitle>
                                <CardDescription>{ward.department}</CardDescription>
                            </div>
                            <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <Building2 className="size-5 text-primary" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center gap-2">
                                    <Users className="size-4 text-muted-foreground" />
                                    <span className="text-sm font-medium">{ward.type}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <BedDouble className="size-4 text-muted-foreground" />
                                    <span className="text-sm font-medium">{ward.totalBeds} Beds</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <DollarSign className="size-4 text-muted-foreground" />
                                    <span className="text-sm font-medium">${ward.dailyRate}/day</span>
                                </div>
                            </div>
                            <div className="mt-4 flex gap-2">
                                <Button variant="outline" size="sm" className="flex-1">View Beds</Button>
                                <Button variant="outline" size="sm" className="px-2">
                                    <Plus className="size-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {wards.length === 0 && (
                    <div className="col-span-full py-12 text-center border rounded-lg border-dashed">
                        <Building2 className="size-12 mx-auto text-muted-foreground mb-4 opacity-20" />
                        <p className="text-muted-foreground font-medium">No wards configured yet.</p>
                        <p className="text-sm text-muted-foreground">Add your first ward to start managing beds.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
