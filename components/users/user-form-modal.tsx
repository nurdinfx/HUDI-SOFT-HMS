"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { UsersCoreRoleType } from "@/lib/api" // wait let me check the exact name, it's UserRole
import type { User, UserRole } from "@/lib/api"
import { usersApi } from "@/lib/api"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

interface UserFormModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    user?: User | null
    onSuccess: () => void
}

const ROLES: { value: UserRole; label: string }[] = [
    { value: "admin", label: "Admin" },
    { value: "doctor", label: "Doctor" },
    { value: "nurse", label: "Nurse" },
    { value: "pharmacist", label: "Pharmacist" },
    { value: "lab_tech", label: "Lab Technician" },
    { value: "receptionist", label: "Receptionist" },
    { value: "accountant", label: "Accountant" },
]

export function UserFormModal({ open, onOpenChange, user, onSuccess }: UserFormModalProps) {
    const isEditing = !!user

    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [role, setRole] = useState<UserRole>("receptionist")
    const [phone, setPhone] = useState("")
    const [department, setDepartment] = useState("")
    const [isActive, setIsActive] = useState(true)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (open) {
            if (user) {
                setName(user.name)
                setEmail(user.email)
                setRole(user.role)
                setPhone(user.phone || "")
                setDepartment(user.department || "")
                setIsActive(user.isActive)
                setPassword("") // Reset password field when editing
            } else {
                setName("")
                setEmail("")
                setPassword("")
                setRole("receptionist")
                setPhone("")
                setDepartment("")
                setIsActive(true)
            }
        }
    }, [open, user])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            if (isEditing) {
                // Only pass password if it has been typed, otherwise the backend will keep the old one
                const updateData: Partial<User> & { password?: string } = {
                    name, email, role, phone, department, isActive
                }
                if (password) updateData.password = password

                await usersApi.update(user.id, updateData)
                toast.success("User updated successfully")
            } else {
                if (!password) {
                    toast.error("Password is required for new users")
                    setLoading(false)
                    return
                }
                await usersApi.create({
                    name, email, password, role, phone, department, isActive
                })
                toast.success("User created successfully")
            }
            onSuccess()
            onOpenChange(false)
        } catch (error: any) {
            toast.error(error.message || "An error occurred")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "Edit User" : "Add New User"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">Password {isEditing && <span className="text-muted-foreground font-normal">(Leave blank to keep current)</span>}</Label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required={!isEditing}
                            autoComplete="new-password"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="role">Role</Label>
                            <Select value={role} onValueChange={(val) => setRole(val as UserRole)}>
                                <SelectTrigger id="role">
                                    <SelectValue placeholder="Select a role" />
                                </SelectTrigger>
                                <SelectContent>
                                    {ROLES.map(r => (
                                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone</Label>
                            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="department">Department</Label>
                        <Input id="department" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Cardiology" />
                    </div>

                    {isEditing && (
                        <div className="flex items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                                <Label>Active Account</Label>
                                <p className="text-[13px] text-muted-foreground">
                                    Allow this user to log into the system
                                </p>
                            </div>
                            <Switch checked={isActive} onCheckedChange={setIsActive} />
                        </div>
                    )}

                    <div className="pt-4 flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Saving..." : isEditing ? "Save Changes" : "Create User"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
