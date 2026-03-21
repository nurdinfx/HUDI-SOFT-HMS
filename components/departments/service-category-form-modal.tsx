"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { revenueAnalyticsApi, ServiceCategory } from "@/lib/api"
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle,
    DialogFooter 
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"

interface ServiceCategoryFormModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
    initialData?: ServiceCategory | null
}

export function ServiceCategoryFormModal({ open, onOpenChange, onSuccess, initialData }: ServiceCategoryFormModalProps) {
    const [name, setName] = useState(initialData?.name || "")
    const [description, setDescription] = useState(initialData?.description || "")
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (open) {
            setName(initialData?.name || "")
            setDescription(initialData?.description || "")
        }
    }, [open, initialData])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name) return toast.error("Category name is required")
        
        setLoading(true)
        try {
            if (initialData) {
                await revenueAnalyticsApi.updateServiceCategory(initialData.id, { name, description })
                toast.success("Service category updated successfully")
            } else {
                await revenueAnalyticsApi.createServiceCategory({ name, description })
                toast.success("Service category created successfully")
            }
            onSuccess()
            onOpenChange(false)
        } catch (error: any) {
            toast.error(error.message || "Failed to save category")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle>{initialData ? "Edit Service Category" : "Add Service Category"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label htmlFor="cat-name">Category Name</Label>
                        <Input 
                            id="cat-name" 
                            placeholder="e.g. Lab Tests" 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="cat-desc">Description</Label>
                        <Textarea 
                            id="cat-desc" 
                            placeholder="Brief description of services in this category" 
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                        />
                    </div>
                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {initialData ? "Update Category" : "Create Category"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
