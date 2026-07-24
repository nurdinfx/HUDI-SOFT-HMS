"use client"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ipdApi, type Bed } from "@/lib/api"
import { toast } from "sonner"

interface Props {
    bed: Bed | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

export function EditBedDialog({ bed, open, onOpenChange, onSuccess }: Props) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        bedNumber: "",
        type: "General",
        dailyRate: "0",
        ward: ""
    })

    useEffect(() => {
        if (bed) {
            setFormData({
                bedNumber: bed.bedNumber,
                type: bed.type,
                dailyRate: bed.dailyRate.toString(),
                ward: bed.ward
            })
        }
    }, [bed])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!bed || !formData.bedNumber) {
            toast.error("Bed number is required")
            return
        }
        setLoading(true)
        try {
            await ipdApi.updateBed(bed.id, {
                bedNumber: formData.bedNumber,
                type: formData.type,
                dailyRate: parseFloat(formData.dailyRate) || 0,
                ward: formData.ward
            })
            toast.success("Bed updated successfully")
            onSuccess()
            onOpenChange(false)
        } catch (error: any) {
            toast.error(error.message || "Failed to update bed")
        } finally {
            setLoading(false)
        }
    }

    if (!bed) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Bed Details</DialogTitle>
                    <DialogDescription>Modify bed metadata and assignment.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Bed Number</Label>
                            <Input
                                value={formData.bedNumber}
                                onChange={(e) => setFormData({ ...formData, bedNumber: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Ward Assignment</Label>
                            <Input
                                value={formData.ward}
                                onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Bed Type</Label>
                            <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="General">General</SelectItem>
                                    <SelectItem value="ICU">ICU</SelectItem>
                                    <SelectItem value="Private">Private</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Daily Rate ($)</Label>
                            <Input
                                type="number"
                                value={formData.dailyRate}
                                onChange={(e) => setFormData({ ...formData, dailyRate: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save Changes"}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
