"use client"

import { useState, useMemo, useEffect } from "react"
import { Search, Plus } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
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
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { ipdApi, type Patient, type Doctor, type Ward, type Bed } from "@/lib/api"

import { PatientRegistration } from "../opd/patient-registration"

interface Props {
    patients: Patient[]
    doctors: Doctor[]
    wards: Ward[]
    beds: Bed[]
    onSuccess: () => void
    isOpen?: boolean
    onOpenChange?: (open: boolean) => void
    initialPatientId?: string
}

export function AddAdmissionDialog({
    patients,
    doctors,
    wards,
    beds,
    onSuccess,
    isOpen: controlledOpen,
    onOpenChange: setControlledOpen,
    initialPatientId
}: Props) {
    const [internalOpen, setInternalOpen] = useState(false)
    const open = controlledOpen !== undefined ? controlledOpen : internalOpen
    const setOpen = setControlledOpen !== undefined ? setControlledOpen : setInternalOpen

    const [isRegistering, setIsRegistering] = useState(false)
    const [search, setSearch] = useState("")
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
    const [selectedDoctorId, setSelectedDoctorId] = useState("")
    const [selectedWard, setSelectedWard] = useState("")
    const [selectedBed, setSelectedBed] = useState("")
    const [diagnosis, setDiagnosis] = useState("")
    const [loading, setLoading] = useState(false)

    // Handle initial patient selection
    useEffect(() => {
        if (open && initialPatientId) {
            const patient = patients.find(p => p.id === initialPatientId || p.patientId === initialPatientId)
            if (patient) {
                setSelectedPatient(patient)
                setSearch(`${patient.firstName} ${patient.lastName}`)
            }
        }
    }, [open, initialPatientId, patients])

    const filteredPatients = useMemo(() => {
        if (!search) return []
        return patients.filter(p =>
            p.firstName.toLowerCase().includes(search.toLowerCase()) ||
            p.lastName.toLowerCase().includes(search.toLowerCase()) ||
            p.patientId.toLowerCase().includes(search.toLowerCase()) ||
            p.phone.includes(search)
        ).slice(0, 5)
    }, [patients, search])

    const availableBeds = useMemo(() => {
        if (!selectedWard) return []
        return beds.filter(b => b.ward === selectedWard && b.status === "available")
    }, [beds, selectedWard])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedPatient || !selectedWard || !selectedBed || !diagnosis) {
            toast.error("Please fill all compulsory fields (Patient, Ward, Bed, Diagnosis)")
            return
        }

        setLoading(true)
        try {
            await ipdApi.createAdmission({
                patientId: selectedPatient.id,
                doctorId: selectedDoctorId,
                ward: selectedWard,
                bedNumber: selectedBed,
                diagnosis
            })
            toast.success("Patient successfully admitted")
            setOpen(false)
            resetForm()
            onSuccess()
        } catch (error) {
            toast.error("Failed to admit patient")
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const resetForm = () => {
        setSearch("")
        setSelectedPatient(null)
        setSelectedDoctorId("")
        setSelectedWard("")
        setSelectedBed("")
        setDiagnosis("")
        setIsRegistering(false)
    }

    const handleRegistrationComplete = () => {
        setIsRegistering(false)
        onSuccess() // Refresh parent data to get new patient
        toast.success("Patient registered! You can now search and select them.")
    }

    return (
        <Dialog open={open} onOpenChange={(val) => {
            setOpen(val)
            if (!val) resetForm()
        }}>
            <DialogTrigger asChild>
                <Button className="gap-2 shadow-sm font-bold">
                    <Plus className="size-4" />
                    New Admission
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="text-xl">Register New Admission</DialogTitle>
                    <DialogDescription>
                        Assign a patient to an available bed in the Inpatient Department.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>Patient Search</Label>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs gap-1 text-primary hover:text-primary hover:bg-primary/10"
                                onClick={() => setIsRegistering(!isRegistering)}
                            >
                                <Plus className="size-3" />
                                {isRegistering ? "Back to Search" : "Register New Patient"}
                            </Button>
                        </div>

                        {isRegistering ? (
                            <div className="border rounded-lg p-4 bg-muted/30">
                                <PatientRegistration onComplete={handleRegistrationComplete} />
                            </div>
                        ) : (
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
                                                className="w-full px-4 py-3 text-left hover:bg-muted flex flex-col transition-colors border-b last:border-0"
                                                onClick={() => {
                                                    setSelectedPatient(p)
                                                    setSearch(`${p.firstName} ${p.lastName}`)
                                                }}
                                            >
                                                <span className="font-bold">{p.firstName} {p.lastName}</span>
                                                <span className="text-xs text-muted-foreground">{p.patientId} • {p.phone}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {selectedPatient && (
                        <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg flex items-center justify-between">
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

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Attending Physician</Label>
                            <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Doctor" />
                                </SelectTrigger>
                                <SelectContent>
                                    {doctors.map(d => (
                                        <SelectItem key={d.id} value={d.id}>
                                            {d.name} ({d.specialization})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Ward Category</Label>
                            <Select value={selectedWard} onValueChange={(val) => {
                                setSelectedWard(val)
                                setSelectedBed("")
                            }}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Ward" />
                                </SelectTrigger>
                                <SelectContent>
                                    {wards.map(w => (
                                        <SelectItem key={w.name} value={w.name}>
                                            {w.name} ({w.type})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2 col-span-2">
                            <Label>Assign Bed (Available only)</Label>
                            <Select value={selectedBed} onValueChange={setSelectedBed} disabled={!selectedWard}>
                                <SelectTrigger>
                                    <SelectValue placeholder={selectedWard ? "Select Bed" : "Select Ward First"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableBeds.length === 0 ? (
                                        <div className="p-2 text-sm text-muted-foreground italic text-center">No available beds in this ward.</div>
                                    ) : (
                                        availableBeds.map(b => (
                                            <SelectItem key={b.bedNumber} value={b.bedNumber}>
                                                Bed {b.bedNumber} - {b.type} (${b.dailyRate}/day)
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Primary Diagnosis / Reason for Admission</Label>
                        <Textarea
                            placeholder="Enter detailed diagnosis findings..."
                            className="resize-none h-20"
                            value={diagnosis}
                            onChange={(e) => setDiagnosis(e.target.value)}
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={loading || !selectedPatient} className="min-w-[120px] shadow-md shadow-primary/20">
                            {loading ? "Processing..." : "Admit Patient"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
