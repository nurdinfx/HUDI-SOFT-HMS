"use client"
import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ipdApi } from "@/lib/api"
import { toast } from "sonner"

interface Props {
    ward: string
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

export function AddBedDialog({ ward, open, onOpenChange, onSuccess }: Props) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        bedNumber: "",
        type: "General",
        dailyRate: "0"
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.bedNumber) {
            toast.error("Bed number is required")
            return
        }
        setLoading(true)
        try {
            await ipdApi.createBed({
                ward,
                bedNumber: formData.bedNumber,
                type: formData.type,
                dailyRate: parseFloat(formData.dailyRate) || 0
            })
            toast.success("Bed added successfully")
            onSuccess()
            onOpenChange(false)
            setFormData({ bedNumber: "", type: "General", dailyRate: "0" })
        } catch (error: any) {
            toast.error(error.message || "Failed to add bed. Bed number might be duplicate.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add New Bed to {ward}</DialogTitle>
                    <DialogDescription>Add a new bed to this ward manually.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Bed Number (e.g. ICU-05, GEN-12)</Label>
                        <Input
                            value={formData.bedNumber}
                            onChange={(e) => setFormData({ ...formData, bedNumber: e.target.value })}
                        />
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
                        <Button type="submit" disabled={loading}>{loading ? "Adding..." : "Add Bed"}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
