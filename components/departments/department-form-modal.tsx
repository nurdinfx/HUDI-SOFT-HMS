"use client"

import { useState } from "react"
import { toast } from "sonner"
import { revenueAnalyticsApi } from "@/lib/api"
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
import { Loader2 } from "lucide-react"

interface DepartmentFormModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

export function DepartmentFormModal({ open, onOpenChange, onSuccess }: DepartmentFormModalProps) {
    const [name, setName] = useState("")
    const [code, setCode] = useState("")
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name) return toast.error("Department name is required")
        
        setLoading(true)
        try {
            await revenueAnalyticsApi.createDepartment({ name, code })
            toast.success("Department created successfully")
            setName("")
            setCode("")
            onSuccess()
            onOpenChange(false)
        } catch (error: any) {
            toast.error(error.message || "Failed to create department")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle>Add New Department</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label htmlFor="dept-name">Department Name</Label>
                        <Input 
                            id="dept-name" 
                            placeholder="e.g. Cardiology" 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="dept-code">Code (Optional)</Label>
                        <Input 
                            id="dept-code" 
                            placeholder="e.g. CARD" 
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                        />
                    </div>
                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Department
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
