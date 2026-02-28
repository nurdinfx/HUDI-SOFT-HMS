"use client"

import { useState } from "react"
import {
    User,
    Phone,
    Mail,
    MapPin,
    ShieldCheck,
    Plus,
    X,
    Clipboard,
    Save
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { patientsApi } from "@/lib/api"
import { Badge } from "@/components/ui/badge"

interface PatientRegistrationProps {
    onComplete: () => void
}

export function PatientRegistration({ onComplete }: PatientRegistrationProps) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        dateOfBirth: "",
        gender: "male",
        bloodGroup: "",
        phone: "",
        email: "",
        address: "",
        city: "",
        emergencyContact: "",
        emergencyPhone: "",
        insuranceProvider: "",
        insurancePolicyNumber: "",
        allergies: [] as string[],
        chronicConditions: [] as string[],
        notes: ""
    })

    const [newAllergy, setNewAllergy] = useState("")
    const [newCondition, setNewCondition] = useState("")

    const handleAddAllergy = () => {
        if (newAllergy && !formData.allergies.includes(newAllergy)) {
            setFormData({ ...formData, allergies: [...formData.allergies, newAllergy] })
            setNewAllergy("")
        }
    }

    const handleAddCondition = () => {
        if (newCondition && !formData.chronicConditions.includes(newCondition)) {
            setFormData({ ...formData, chronicConditions: [...formData.chronicConditions, newCondition] })
            setNewCondition("")
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            await patientsApi.create(formData)
            onComplete()
        } catch (error) {
            console.error("Failed to register patient:", error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-bold uppercase flex items-center gap-2">
                                <User className="size-4 text-primary" />
                                Personal Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label>First Name</Label>
                                <Input required value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                                <Label>Last Name</Label>
                                <Input required value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                                <Label>Date of Birth</Label>
                                <Input type="date" required value={formData.dateOfBirth} onChange={e => setFormData({ ...formData, dateOfBirth: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                                <Label>Gender</Label>
                                <Select value={formData.gender} onValueChange={v => setFormData({ ...formData, gender: v })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="male">Male</SelectItem>
                                        <SelectItem value="female">Female</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label>Contact Phone</Label>
                                <Input required value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                                <Label>Email</Label>
                                <Input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-bold uppercase flex items-center gap-2">
                                <ShieldCheck className="size-4 text-emerald-500" />
                                Insurance & Professional Link
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label>Insurance Provider</Label>
                                <Input value={formData.insuranceProvider} onChange={e => setFormData({ ...formData, insuranceProvider: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                                <Label>Policy Number</Label>
                                <Input value={formData.insurancePolicyNumber} onChange={e => setFormData({ ...formData, insurancePolicyNumber: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                                <Label>Emergency Contact</Label>
                                <Input value={formData.emergencyContact} onChange={e => setFormData({ ...formData, emergencyContact: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                                <Label>Emergency Phone</Label>
                                <Input value={formData.emergencyPhone} onChange={e => setFormData({ ...formData, emergencyPhone: e.target.value })} />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-bold uppercase flex items-center gap-2 text-rose-500">
                                <Clipboard className="size-4" />
                                Clinical Alerts
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label className="text-xs">Allergies</Label>
                                <div className="flex gap-1">
                                    <Input value={newAllergy} onChange={e => setNewAllergy(e.target.value)} size={0.5} className="h-8 text-xs" />
                                    <Button type="button" size="sm" className="h-8" onClick={handleAddAllergy}><Plus className="size-3" /></Button>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {formData.allergies.map(a => (
                                        <Badge key={a} variant="secondary" className="gap-1 pr-1">
                                            {a}
                                            <X className="size-3 cursor-pointer" onClick={() => setFormData({ ...formData, allergies: formData.allergies.filter(x => x !== a) })} />
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs">Chronic Conditions</Label>
                                <div className="flex gap-1">
                                    <Input value={newCondition} onChange={e => setNewCondition(e.target.value)} className="h-8 text-xs" />
                                    <Button type="button" size="sm" className="h-8" onClick={handleAddCondition}><Plus className="size-3" /></Button>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {formData.chronicConditions.map(c => (
                                        <Badge key={c} variant="outline" className="gap-1 pr-1">
                                            {c}
                                            <X className="size-3 cursor-pointer" onClick={() => setFormData({ ...formData, chronicConditions: formData.chronicConditions.filter(x => x !== c) })} />
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Button type="submit" className="w-full h-12 text-lg font-bold gap-2" disabled={loading}>
                        <Save className="size-5" />
                        {loading ? "Registering..." : "Register Patient"}
                    </Button>
                </div>
            </div>
        </form>
    )
}
