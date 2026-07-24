"use client"

import { useState } from "react"
import {
    User,
    Mail,
    Phone,
    Stethoscope,
    Award,
    Calendar,
    Clock,
    DollarSign,
    Save,
    X
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { doctorsApi, type Doctor } from "@/lib/api"
import { Badge } from "@/components/ui/badge"

interface DoctorFormProps {
    doctor?: Doctor
    onComplete: () => void
    onCancel: () => void
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

export function DoctorForm({ doctor, onComplete, onCancel }: DoctorFormProps) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: doctor?.name || "",
        email: doctor?.email || "",
        phone: doctor?.phone || "",
        specialization: doctor?.specialization || "",
        department: doctor?.department || "",
        qualification: doctor?.qualification || "",
        experience: doctor?.experience || 0,
        consultationFee: doctor?.consultationFee || 0,
        availableDays: doctor?.availableDays || ["Mon", "Tue", "Wed", "Thu", "Fri"],
        availableTimeStart: doctor?.availableTimeStart || "09:00",
        availableTimeEnd: doctor?.availableTimeEnd || "17:00",
        status: doctor?.status || "available"
    })

    const toggleDay = (day: string) => {
        setFormData(prev => ({
            ...prev,
            availableDays: prev.availableDays.includes(day)
                ? prev.availableDays.filter(d => d !== day)
                : [...prev.availableDays, day]
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            if (doctor) {
                await doctorsApi.update(doctor.id, formData)
            } else {
                await doctorsApi.create(formData)
            }
            onComplete()
        } catch (error) {
            console.error("Failed to save doctor:", error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">{doctor ? "Edit Doctor Profile" : "Register New Doctor"}</h2>
                    <p className="text-muted-foreground">Fill in the professional details and schedule.</p>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={onCancel}>
                    <X className="size-5" />
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <User className="size-4 text-primary" />
                            Professional Info
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label>Full Name (include Title)</Label>
                            <Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Dr. John Doe" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Email Address</Label>
                                <Input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="john.doe@hospital.com" />
                            </div>
                            <div className="grid gap-2">
                                <Label>Phone Number</Label>
                                <Input required value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="+1 (555) 000-0000" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Specialization</Label>
                                <Input required value={formData.specialization} onChange={e => setFormData({ ...formData, specialization: e.target.value })} placeholder="Cardiologist" />
                            </div>
                            <div className="grid gap-2">
                                <Label>Department</Label>
                                <Input required value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} placeholder="Cardiology" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Qualification</Label>
                                <Input value={formData.qualification} onChange={e => setFormData({ ...formData, qualification: e.target.value })} placeholder="MD, FACC" />
                            </div>
                            <div className="grid gap-2">
                                <Label>Experience (Years)</Label>
                                <Input type="number" value={formData.experience} onChange={e => setFormData({ ...formData, experience: parseInt(e.target.value) })} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Calendar className="size-4 text-emerald-500" />
                            Availability & Fees
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid gap-2">
                            <Label>Consultation Fee ($)</Label>
                            <div className="relative">
                                <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                <Input type="number" className="pl-9" value={formData.consultationFee} onChange={e => setFormData({ ...formData, consultationFee: parseFloat(e.target.value) })} />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label>Working Days</Label>
                            <div className="flex flex-wrap gap-2">
                                {DAYS.map(day => (
                                    <Badge
                                        key={day}
                                        variant={formData.availableDays.includes(day) ? "default" : "outline"}
                                        className="cursor-pointer py-1.5 px-3"
                                        onClick={() => toggleDay(day)}
                                    >
                                        {day}
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Shift Start</Label>
                                <div className="relative">
                                    <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                    <Input type="time" className="pl-9" value={formData.availableTimeStart} onChange={e => setFormData({ ...formData, availableTimeStart: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label>Shift End</Label>
                                <div className="relative">
                                    <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                    <Input type="time" className="pl-9" value={formData.availableTimeEnd} onChange={e => setFormData({ ...formData, availableTimeEnd: e.target.value })} />
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label>Current Status</Label>
                            <Select value={formData.status} onValueChange={v => setFormData({ ...formData, status: v })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="available">Available</SelectItem>
                                    <SelectItem value="on-leave">On Leave</SelectItem>
                                    <SelectItem value="busy">Busy</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t">
                <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
                <Button type="submit" disabled={loading} className="gap-2 px-8">
                    <Save className="size-4" />
                    {loading ? "Saving..." : "Save Doctor Profile"}
                </Button>
            </div>
        </form>
    )
}
