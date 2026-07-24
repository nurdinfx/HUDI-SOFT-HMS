"use client"

import { useState, useMemo, useEffect } from "react"
import { Search, UserPlus, Save, ArrowRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { opdApi, type Patient, type Doctor } from "@/lib/api"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"

interface Props {
    patients: Patient[]
    doctors: Doctor[]
    initialPatientId?: string | null
    initialDoctorId?: string | null
    onSuccess: () => void
}

export function CreateVisitForm({ patients, doctors, initialPatientId, initialDoctorId, onSuccess }: Props) {
    const [search, setSearch] = useState("")
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
    const [selectedDoctorId, setSelectedDoctorId] = useState("")
    const [visitType, setVisitType] = useState<"New" | "Follow-Up" | "Emergency">("New")
    const [chiefComplaint, setChiefComplaint] = useState("")
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (initialPatientId && patients.length > 0) {
            const pat = patients.find(p => p.id === initialPatientId)
            if (pat) {
                setSelectedPatient(pat)
                setSearch(`${pat.firstName} ${pat.lastName}`)
            }
        }
        if (initialDoctorId) {
            setSelectedDoctorId(initialDoctorId)
        }
    }, [initialPatientId, initialDoctorId, patients])

    const filteredPatients = useMemo(() => {
        if (!search) return []
        return patients.filter(p =>
            p.firstName.toLowerCase().includes(search.toLowerCase()) ||
            p.lastName.toLowerCase().includes(search.toLowerCase()) ||
            p.patientId.toLowerCase().includes(search.toLowerCase()) ||
            p.phone.includes(search)
        ).slice(0, 5)
    }, [patients, search])

    const selectedDoctor = useMemo(() =>
        doctors.find(d => d.id === selectedDoctorId),
        [doctors, selectedDoctorId])

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedPatient || !selectedDoctorId || !chiefComplaint) {
            toast.error("Please fill all required fields")
            return
        }

        setLoading(true)
        try {
            await opdApi.create({
                patientId: selectedPatient.id,
                doctorId: selectedDoctorId,
                chiefComplaint,
                visitType,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
            })
            toast.success("Visit registered and added to queue")
            onSuccess()
        } catch (error) {
            toast.error("Failed to register visit")
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
            <div className="lg:col-span-2 space-y-6">
                <Card className="border-primary/20 shadow-md">
                    <CardHeader>
                        <CardTitle>Register OPD Visit</CardTitle>
                        <CardDescription>Select patient and assign a clinical encounter.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSave} className="space-y-6">
                            <div className="space-y-2">
                                <Label>Patient Search</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search by ID, Name or Phone..."
                                        className="pl-10"
                                        value={search}
                                        onChange={(e) => {
                                            setSearch(e.target.value)
                                            if (selectedPatient) setSelectedPatient(null)
                                        }}
                                    />
                                    {filteredPatients.length > 0 && !selectedPatient && (
                                        <div className="absolute top-full left-0 w-full mt-1 bg-white border rounded-md shadow-lg z-50 overflow-hidden">
                                            {filteredPatients.map(p => (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    className="w-full px-4 py-2 text-left hover:bg-muted flex flex-col transition-colors border-b last:border-0"
                                                    onClick={() => {
                                                        setSelectedPatient(p)
                                                        setSearch(`${p.firstName} ${p.lastName}`)
                                                    }}
                                                >
                                                    <span className="font-bold">{p.firstName} {p.lastName}</span>
                                                    <span className="text-[10px] text-muted-foreground uppercase">{p.patientId} • {p.phone}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {selectedPatient && (
                                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg flex items-center justify-between animate-in zoom-in-95 duration-200">
                                    <div className="flex items-center gap-3">
                                        <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                            {selectedPatient.firstName[0]}{selectedPatient.lastName[0]}
                                        </div>
                                        <div>
                                            <p className="font-bold">{selectedPatient.firstName} {selectedPatient.lastName}</p>
                                            <p className="text-xs text-muted-foreground">{selectedPatient.gender} • {selectedPatient.bloodGroup}</p>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="bg-white">{selectedPatient.patientId}</Badge>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Assign Doctor</Label>
                                    <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
                                        <SelectTrigger className="h-11">
                                            <SelectValue placeholder="Select Physician" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {doctors.map(d => (
                                                <SelectItem key={d.id} value={d.id}>
                                                    <div className="flex flex-col text-left">
                                                        <span className="font-medium">{d.name}</span>
                                                        <span className="text-[10px] text-muted-foreground uppercase">{d.specialization}</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Visit Type</Label>
                                    <Select value={visitType} onValueChange={(v: any) => setVisitType(v)}>
                                        <SelectTrigger className="h-11 font-medium">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="New">New Visit</SelectItem>
                                            <SelectItem value="Follow-Up">Follow-Up</SelectItem>
                                            <SelectItem value="Emergency">Emergency</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Chief Complaint</Label>
                                <Textarea
                                    placeholder="Primary reason for this clinical visit..."
                                    className="min-h-[100px] resize-none"
                                    value={chiefComplaint}
                                    onChange={(e) => setChiefComplaint(e.target.value)}
                                />
                            </div>

                            <div className="flex justify-end pt-4">
                                <Button
                                    type="submit"
                                    size="lg"
                                    className="w-full md:w-auto h-12 px-12 gap-2 shadow-lg hover:shadow-primary/20 transition-all font-bold"
                                    disabled={loading || !selectedPatient}
                                >
                                    {loading ? "Processing..." : (
                                        <>
                                            <Save className="size-4" />
                                            Save Visit & Entry Queue
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-6">
                <Card className="bg-muted/30 border-dashed border-2">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Quick Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-1">
                            <p className="text-[10px] text-muted-foreground font-bold uppercase">Consultation Fee</p>
                            <p className="text-2xl font-bold text-primary">${selectedDoctor?.consultationFee || 0}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] text-muted-foreground font-bold uppercase">Assigned Department</p>
                            <p className="text-sm font-medium">{selectedDoctor?.department || "---"}</p>
                        </div>
                        <hr className="my-2" />
                        <div className="p-3 bg-amber-50 border border-amber-100 rounded text-amber-800 text-[11px] flex gap-2">
                            <ArrowRight className="size-3 mt-0.5 shrink-0" />
                            <span>Saving this visit will automatically generate a token and place the patient in the 'Waiting' queue.</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Patient Not Found?</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Button variant="outline" className="w-full gap-2 border-primary/20 hover:bg-primary/5" type="button">
                            <UserPlus className="size-4" />
                            Register New Patient
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
