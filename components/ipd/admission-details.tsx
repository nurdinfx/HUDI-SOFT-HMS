"use client"

import { useState, useEffect } from "react"
import {
    ClipboardList,
    Stethoscope,
    FlaskConical,
    History,
    Plus,
    User,
    Calendar,
    MapPin,
    Activity,
    Receipt,
    Clock,
    Pill,
    Trash2,
    PlusCircle
} from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ipdApi, pharmacyApi, laboratoryApi, type IPDAdmission, type NurseNote, type DoctorRound, type Medicine, type PrescriptionMedicine, type LabTest, type LabCatalogItem } from "@/lib/api"
import { StatusBadge } from "@/components/shared/status-badge"
import { format } from "date-fns"
import { toast } from "sonner"

interface AdmissionDetailsModalProps {
    admission: IPDAdmission | null
    onClose: () => void
    onRefresh: () => void
}

export function AdmissionDetailsModal({ admission, onClose, onRefresh }: AdmissionDetailsModalProps) {
    const [nurseNotes, setNurseNotes] = useState<NurseNote[]>([])
    const [doctorRounds, setDoctorRounds] = useState<DoctorRound[]>([])
    const [investigations, setInvestigations] = useState<LabTest[]>([])
    const [activeTab, setActiveTab] = useState("overview")

    // Note creation states
    const [isAddingNote, setIsAddingNote] = useState(false)
    const [noteType, setNoteType] = useState<"nurse" | "doctor" | "lab">("nurse")
    const [observations, setObservations] = useState("")
    const [treatment, setTreatment] = useState("")
    const [vitals, setVitals] = useState({ bp: "", temp: "", pulse: "", spo2: "" })
    const [medications, setMedications] = useState<PrescriptionMedicine[]>([])
    const [availableMedicines, setAvailableMedicines] = useState<Medicine[]>([])

    // Lab order states
    const [catalog, setCatalog] = useState<LabCatalogItem[]>([])
    const [selectedTestName, setSelectedTestName] = useState("")
    const [orderPriority, setOrderPriority] = useState("normal")
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (admission) {
            loadClinicalData()
        }
    }, [admission])

    const loadClinicalData = async () => {
        if (!admission) return
        try {
            const [notes, rounds, meds, tests, catalogData] = await Promise.all([
                ipdApi.getNurseNotes(admission.id),
                ipdApi.getDoctorRounds(admission.id),
                pharmacyApi.getMedicines(),
                laboratoryApi.getAll({ admissionId: admission.id }),
                laboratoryApi.getCatalog()
            ])
            setNurseNotes(notes)
            setDoctorRounds(rounds)
            setAvailableMedicines(meds)
            setInvestigations(tests)
            setCatalog(catalogData)
        } catch (error) {
            console.error("Failed to load clinical data:", error)
        }
    }

    const handleAddNote = async () => {
        if (!admission) return
        try {
            if (noteType === "nurse") {
                await ipdApi.createNurseNote({
                    admissionId: admission.id,
                    observations,
                    vitals,
                    shift: "Day",
                    medications: []
                })
            } else if (noteType === "doctor") {
                await ipdApi.createDoctorRound({
                    admissionId: admission.id,
                    observations,
                    treatmentUpdates: treatment,
                    procedureOrders: [],
                    medications: medications
                })
            }
            setIsAddingNote(false)
            setObservations("")
            setTreatment("")
            setVitals({ bp: "", temp: "", pulse: "", spo2: "" })
            setMedications([])
            loadClinicalData()
        } catch (error) {
            console.error("Failed to add note:", error)
        }
    }

    const handleCreateLabOrder = async () => {
        if (!admission || !selectedTestName) return
        setLoading(true)
        try {
            const item = catalog.find(c => c.name === selectedTestName)
            await laboratoryApi.create({
                patientId: admission.patientId,
                admissionId: admission.id,
                testName: selectedTestName,
                testCategory: item?.category || "General",
                sampleType: item?.sampleType || "Blood",
                priority: orderPriority,
                cost: item?.cost || 0
            })
            toast.success("Lab order created successfully")
            setIsAddingNote(false)
            setSelectedTestName("")
            setOrderPriority("normal")
            loadClinicalData()
        } catch (error) {
            toast.error("Failed to create lab order")
        } finally {
            setLoading(false)
        }
    }

    const handleAddMedicationRow = () => {
        setMedications([...medications, { medicineId: "", medicineName: "", dosage: "", frequency: "1-0-1", duration: "5 days", quantity: 1 }])
    }

    const removeMedicationRow = (idx: number) => {
        setMedications(medications.filter((_, i) => i !== idx))
    }

    const updateMedicationRow = (idx: number, field: keyof PrescriptionMedicine, value: any) => {
        const newMeds = [...medications]
        newMeds[idx] = { ...newMeds[idx], [field]: value }
        if (field === "medicineId") {
            const m = availableMedicines.find(m => m.id === value)
            if (m) newMeds[idx].medicineName = m.name
        }
        setMedications(newMeds)
    }

    if (!admission) return null

    return (
        <Dialog open={!!admission} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-6 bg-muted/50 border-b">
                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <DialogTitle className="text-xl">{admission.patientName}</DialogTitle>
                                <Badge variant="outline" className="font-mono">{admission.admissionId}</Badge>
                                <StatusBadge status={admission.status} />
                            </div>
                            <DialogDescription className="flex items-center gap-4">
                                <span className="flex items-center gap-1.5"><Calendar className="size-3.5" /> Admitted: {admission.admissionDate}</span>
                                <span className="flex items-center gap-1.5"><MapPin className="size-3.5" /> {admission.ward} / Bed {admission.bedNumber}</span>
                            </DialogDescription>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-medium">Doctor In-Charge</p>
                            <p className="text-sm text-muted-foreground">{admission.doctorName}</p>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                        <div className="px-6 border-b">
                            <TabsList className="h-12 bg-transparent gap-6">
                                <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0">Overview</TabsTrigger>
                                <TabsTrigger value="nurse-notes" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0">Nurse Notes</TabsTrigger>
                                <TabsTrigger value="doctor-rounds" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0">Doctor Rounds</TabsTrigger>
                                <TabsTrigger value="investigations" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0">Investigations</TabsTrigger>
                                <TabsTrigger value="billing" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0">Billing & Charges</TabsTrigger>
                            </TabsList>
                        </div>

                        <ScrollArea className="flex-1">
                            <div className="p-6">
                                <TabsContent value="overview" className="mt-0 space-y-6">
                                    <div className="grid grid-cols-3 gap-4">
                                        <Card>
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                                    <Activity className="size-4 text-primary" />
                                                    Chief Complaint
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <p className="text-sm">{admission.diagnosis || "No diagnosis provided."}</p>
                                            </CardContent>
                                        </Card>
                                        <Card>
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                                    <History className="size-4 text-emerald-500" />
                                                    Latest Vitals
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                {nurseNotes[0] ? (
                                                    <div className="grid grid-cols-2 gap-y-1 text-xs">
                                                        <span className="text-muted-foreground">BP:</span> <span>{nurseNotes[0].vitals.bp || "—"}</span>
                                                        <span className="text-muted-foreground">Temp:</span> <span>{nurseNotes[0].vitals.temp || "—"}°C</span>
                                                        <span className="text-muted-foreground">Pulse:</span> <span>{nurseNotes[0].vitals.pulse || "—"} bpm</span>
                                                    </div>
                                                ) : <p className="text-xs text-muted-foreground">No vitals recorded.</p>}
                                            </CardContent>
                                        </Card>
                                        <Card>
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                                    <Clock className="size-4 text-amber-500" />
                                                    Stay Duration
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <p className="text-xl font-bold">
                                                    {Math.max(1, Math.ceil((new Date().getTime() - new Date(admission.admissionDate).getTime()) / (1000 * 60 * 60 * 24)))} Days
                                                </p>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </TabsContent>

                                <TabsContent value="nurse-notes" className="mt-0 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-semibold">Nurse Observation Log</h3>
                                        <Button size="sm" className="gap-2" onClick={() => { setNoteType("nurse"); setIsAddingNote(true); }}>
                                            <Plus className="size-4" /> Add Note
                                        </Button>
                                    </div>
                                    <div className="space-y-4">
                                        {nurseNotes.map((note) => (
                                            <div key={note.id} className="border-l-2 border-primary pl-4 py-1 space-y-2">
                                                <div className="flex justify-between text-xs text-muted-foreground font-medium">
                                                    <span>{note.nurseName} · {note.shift} Shift</span>
                                                    <span>{note.createdAt}</span>
                                                </div>
                                                <p className="text-sm">{note.observations}</p>
                                                {note.vitals && (
                                                    <div className="flex gap-4 text-[10px] bg-muted p-1.5 rounded w-fit">
                                                        <span>BP: {note.vitals.bp}</span>
                                                        <span>Temp: {note.vitals.temp}°C</span>
                                                        <span>Pulse: {note.vitals.pulse}</span>
                                                        <span>SpO2: {note.vitals.spo2}%</span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        {nurseNotes.length === 0 && <p className="text-center py-8 text-muted-foreground italic text-sm">No nurse notes recorded yet.</p>}
                                    </div>
                                </TabsContent>

                                <TabsContent value="doctor-rounds" className="mt-0 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-semibold">Doctor Rounds & Treatment Plan</h3>
                                        <Button size="sm" className="gap-2" onClick={() => { setNoteType("doctor"); setIsAddingNote(true); }}>
                                            <Plus className="size-4" /> Record Round
                                        </Button>
                                    </div>
                                    <div className="space-y-6">
                                        {doctorRounds.map((round) => (
                                            <Card key={round.id} className="border-l-4 border-l-emerald-500">
                                                <CardHeader className="py-2 px-4 bg-muted/30">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-xs font-bold font-mono">DR. {round.doctorName.toUpperCase()}</span>
                                                        <span className="text-[10px] text-muted-foreground">{round.timestamp}</span>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="p-4 space-y-3">
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Observations</p>
                                                        <p className="text-sm">{round.observations}</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] font-bold text-emerald-600 uppercase">Treatment Update</p>
                                                        <p className="text-sm font-medium">{round.treatmentUpdates}</p>
                                                    </div>
                                                    {round.medications && round.medications.length > 0 && (
                                                        <div className="pt-2 border-t mt-2">
                                                            <p className="text-[10px] font-bold text-rose-500 uppercase mb-2">Prescribed Medications</p>
                                                            <div className="grid grid-cols-1 gap-2">
                                                                {round.medications.map((m, i) => (
                                                                    <div key={i} className="flex items-center gap-2 text-xs bg-muted/50 p-2 rounded border border-rose-100">
                                                                        <Pill className="size-3 text-rose-500" />
                                                                        <span className="font-bold">{m.medicineName}</span>
                                                                        <span className="text-muted-foreground">· {m.dosage} · {m.frequency} · {m.duration}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        ))}
                                        {doctorRounds.length === 0 && <p className="text-center py-8 text-muted-foreground italic text-sm">No doctor rounds recorded yet.</p>}
                                    </div>
                                </TabsContent>

                                <TabsContent value="investigations" className="mt-0 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-semibold text-lg flex items-center gap-2">
                                            <Stethoscope className="size-5 text-blue-600" />
                                            Clinical Investigations History
                                        </h3>
                                        <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={() => { setNoteType("lab"); setIsAddingNote(true); }}>
                                            <Plus className="size-4" /> Order Lab Test
                                        </Button>
                                    </div>
                                    <div className="space-y-3">
                                        {investigations.map((test) => (
                                            <div key={test.id} className="group flex items-center justify-between p-4 bg-muted/20 border rounded-2xl transition-all hover:bg-muted/40 hover:border-blue-200">
                                                <div className="flex items-start gap-4">
                                                    <div className={`p-3 rounded-xl ${test.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                                                        <ClipboardList className="size-5" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-bold text-sm">{test.testName}</p>
                                                            <StatusBadge status={test.status} />
                                                            {test.criticalFlag && (
                                                                <Badge className="bg-red-500 text-white text-[9px] animate-pulse">CRITICAL</Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-muted-foreground">Ordered: {format(new Date(test.orderedAt), 'MMM dd, HH:mm')} · Source: {test.ward}/{test.bedNumber}</p>
                                                        {test.results && (
                                                            <div className="mt-2 text-xs p-2 bg-white rounded border border-dashed font-medium text-blue-700">
                                                                Result: {test.results} {test.normalRange && <span className="text-muted-foreground font-normal ml-2">Range: {test.normalRange}</span>}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-right space-y-2">
                                                    <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">{test.testCategory}</p>
                                                    <Badge variant="outline" className={`text-[10px] font-bold h-5 ${test.priority === 'emergency' ? 'border-red-500 text-red-500' : test.priority === 'urgent' ? 'border-amber-500 text-amber-500' : ''}`}>
                                                        {test.priority.toUpperCase()}
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))}
                                        {investigations.length === 0 && <p className="text-center py-12 text-muted-foreground italic text-sm">No clinical investigations found for this admission.</p>}
                                    </div>
                                </TabsContent>

                                <TabsContent value="billing" className="mt-0 space-y-4">
                                    <div className="flex items-center justify-between pb-2 border-b">
                                        <div>
                                            <h3 className="font-semibold">IPD Billing Summary</h3>
                                            <p className="text-xs text-muted-foreground">Automated tracking of bed charges and services.</p>
                                        </div>
                                        <Receipt className="size-5 text-muted-foreground" />
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between py-2">
                                            <div className="space-y-0.5">
                                                <p className="text-sm font-medium">Daily Bed Charge ({admission.ward})</p>
                                                <p className="text-xs text-muted-foreground">Standard rate per 24 hours</p>
                                            </div>
                                            <p className="text-sm font-bold">$100.00 / day</p>
                                        </div>
                                        <div className="flex items-center justify-between py-2 border-t font-semibold">
                                            <p className="text-sm">Total Accrued (Estimated)</p>
                                            <p className="text-lg text-primary">
                                                ${(Math.max(1, Math.ceil((new Date().getTime() - new Date(admission.admissionDate).getTime()) / (1000 * 60 * 60 * 24))) * 100).toFixed(2)}
                                            </p>
                                        </div>
                                        <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-lg border border-amber-200 dark:border-amber-900/30">
                                            <p className="text-xs text-amber-800 dark:text-amber-400 font-medium">
                                                Billing is automatically added to the final invoice upon discharge. Charges are calculated based on a 24-hour cycle.
                                            </p>
                                        </div>
                                    </div>
                                </TabsContent>
                            </div>
                        </ScrollArea>
                    </Tabs>
                </div>

                {isAddingNote && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-6 z-50">
                        <Card className="w-full max-w-3xl shadow-2xl overflow-hidden rounded-3xl border-none">
                            <CardHeader className="pb-4">
                                <CardTitle className="text-xl flex items-center gap-2">
                                    {noteType === "lab" ? <FlaskConical className="size-5 text-blue-600" /> : <ClipboardList className="size-5 text-emerald-600" />}
                                    {noteType === "nurse" ? "Nursing Observations" : noteType === "doctor" ? "Doctor Round Record" : "New Laboratory Order"}
                                </CardTitle>
                                <CardDescription>
                                    {noteType === "lab" ? "Select tests from the hospital master catalog." : "Enter clinical observations and treatment updates."}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <ScrollArea className="max-h-[75vh] px-8 py-4">
                                    <div className="space-y-4 pb-4">
                                        {noteType === "nurse" && (
                                            <div className="grid grid-cols-4 gap-2">
                                                <div className="space-y-1">
                                                    <Label className="text-[10px]">BP</Label>
                                                    <Input value={vitals.bp} onChange={(e) => setVitals({ ...vitals, bp: e.target.value })} placeholder="120/80" className="h-8" />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-[10px]">Temp (°C)</Label>
                                                    <Input value={vitals.temp} onChange={(e) => setVitals({ ...vitals, temp: e.target.value })} placeholder="36.5" className="h-8" />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-[10px]">Pulse</Label>
                                                    <Input value={vitals.pulse} onChange={(e) => setVitals({ ...vitals, pulse: e.target.value })} placeholder="72" className="h-8" />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-[10px]">SpO2 (%)</Label>
                                                    <Input value={vitals.spo2} onChange={(e) => setVitals({ ...vitals, spo2: e.target.value })} placeholder="98" className="h-8" />
                                                </div>
                                            </div>
                                        )}
                                        {noteType !== "lab" && (
                                            <div className="space-y-1">
                                                <Label>Observations</Label>
                                                <Textarea value={observations} onChange={(e) => setObservations(e.target.value)} placeholder="Enter details..." className="min-h-[100px]" />
                                            </div>
                                        )}
                                        {noteType === "doctor" && (
                                            <>
                                                <div className="space-y-1">
                                                    <Label>Treatment Plan Update</Label>
                                                    <Input value={treatment} onChange={(e) => setTreatment(e.target.value)} placeholder="e.g. Increase dosage, continue recovery..." />
                                                </div>

                                                <div className="space-y-3 pt-4 border-t">
                                                    <div className="flex items-center justify-between">
                                                        <Label className="flex items-center gap-2">
                                                            <Pill className="size-4 text-rose-500" />
                                                            Prescriptions
                                                        </Label>
                                                        <Button type="button" variant="outline" size="sm" onClick={handleAddMedicationRow} className="h-7 text-[10px] gap-1 px-2">
                                                            <PlusCircle className="size-3" /> Add Medicine
                                                        </Button>
                                                    </div>

                                                    <div className="space-y-2 max-h-[150px] overflow-auto pr-1">
                                                        {medications.map((med, idx) => (
                                                            <div key={idx} className="grid grid-cols-12 gap-2 items-end border p-2 rounded-md bg-muted/20">
                                                                <div className="col-span-5 space-y-1">
                                                                    <Select value={med.medicineId} onValueChange={(v) => updateMedicationRow(idx, "medicineId", v)}>
                                                                        <SelectTrigger className="h-8 text-[10px]">
                                                                            <SelectValue placeholder="Drug" />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            {availableMedicines.map(m => (
                                                                                <SelectItem key={m.id} value={m.id} className="text-xs">{m.name}</SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>
                                                                <div className="col-span-2 space-y-1">
                                                                    <Input value={med.dosage} onChange={(e) => updateMedicationRow(idx, "dosage", e.target.value)} placeholder="Dose" className="h-8 text-[10px] px-1" />
                                                                </div>
                                                                <div className="col-span-2 space-y-1">
                                                                    <Input value={med.frequency} onChange={(e) => updateMedicationRow(idx, "frequency", e.target.value)} placeholder="Freq" className="h-8 text-[10px] px-1" />
                                                                </div>
                                                                <div className="col-span-2 space-y-1">
                                                                    <Input value={med.duration} onChange={(e) => updateMedicationRow(idx, "duration", e.target.value)} placeholder="Dur" className="h-8 text-[10px] px-1" />
                                                                </div>
                                                                <div className="col-span-1 flex justify-end">
                                                                    <Button variant="ghost" size="icon" onClick={() => removeMedicationRow(idx)} className="h-8 w-8 text-rose-500">
                                                                        <Trash2 className="size-3.5" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {medications.length === 0 && <p className="text-[10px] text-muted-foreground text-center py-2 italic">No medicines added.</p>}
                                                    </div>
                                                </div>
                                            </>
                                        )}

                                        {noteType === "lab" && (
                                            <div className="space-y-4">
                                                <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 flex items-center gap-3">
                                                    <div className="size-8 bg-blue-600 rounded-lg flex items-center justify-center">
                                                        <Stethoscope className="size-5 text-white" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm">Order Investigation</p>
                                                        <p className="text-[10px] text-muted-foreground">Select from hospital master catalog</p>
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Select Investigation</Label>
                                                    <Select value={selectedTestName} onValueChange={setSelectedTestName}>
                                                        <SelectTrigger className="h-12 rounded-xl border-blue-100 shadow-sm">
                                                            <SelectValue placeholder="Search Master Catalog..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {catalog.map(c => (
                                                                <SelectItem key={c.id} value={c.name} className="py-2">
                                                                    <div className="flex flex-col">
                                                                        <span className="font-bold">{c.name}</span>
                                                                        <span className="text-[10px] opacity-70">{c.category} · Ref: {c.normalRange || 'N/A'}</span>
                                                                    </div>
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Priority Level</Label>
                                                    <div className="flex gap-2">
                                                        {['normal', 'urgent', 'emergency'].map(p => (
                                                            <Button
                                                                key={p}
                                                                type="button"
                                                                variant={orderPriority === p ? 'default' : 'outline'}
                                                                className={`flex-1 h-10 rounded-xl capitalize font-bold text-[10px] ${orderPriority === p ? (p === 'normal' ? 'bg-blue-600' : p === 'urgent' ? 'bg-amber-600' : 'bg-red-600 text-white') : ''}`}
                                                                onClick={() => setOrderPriority(p)}
                                                            >
                                                                {p === 'emergency' ? '🚨 STAT' : p}
                                                            </Button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                            <CardFooter className="flex justify-end gap-2 p-6 bg-muted/20 border-t rounded-b-3xl">
                                <Button variant="outline" onClick={() => setIsAddingNote(false)} className="rounded-xl h-11 px-6">Cancel</Button>
                                {noteType === "lab" ? (
                                    <Button onClick={handleCreateLabOrder} disabled={loading || !selectedTestName} className="rounded-xl h-11 px-8 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200">
                                        {loading ? <Clock className="size-4 animate-spin mr-2" /> : <Plus className="size-4 mr-2" />}
                                        Generate Lab Order
                                    </Button>
                                ) : (
                                    <Button onClick={handleAddNote} className="rounded-xl h-11 px-8">Save Note</Button>
                                )}
                            </CardFooter>
                        </Card>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
