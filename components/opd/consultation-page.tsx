"use client"

import { useState, useEffect } from "react"
import {
    ClipboardList,
    Stethoscope,
    Activity,
    Pill,
    Save,
    ChevronRight,
    User,
    History,
    AlertCircle,
    CheckCircle2
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { opdApi, pharmacyApi, type OPDVisit, type Patient, type Medicine, type PatientSummary } from "@/lib/api"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { StatusBadge } from "@/components/shared/status-badge"
import { LabInvestigationsTab } from "./lab-investigations-tab"

interface ConsultationPageProps {
    visit: OPDVisit
    patient: Patient
    onComplete: () => void
    onCancel: () => void
}

export function ConsultationPage({ visit, patient, onComplete, onCancel }: ConsultationPageProps) {
    const [activeTab, setActiveTab] = useState("clinical")
    const [loading, setLoading] = useState(false)
    const [medicines, setMedicines] = useState<Medicine[]>([])
    const [summary, setSummary] = useState<PatientSummary | null>(null)
    const [consultData, setConsultData] = useState({
        historyIllness: visit.historyIllness || "",
        pastHistory: visit.pastHistory || "",
        familyHistory: visit.familyHistory || "",
        physicalExamination: visit.physicalExamination || "",
        clinicalNotes: visit.clinicalNotes || "",
        diagnosis: visit.diagnosis || "",
        secondaryDiagnosis: "", // Added spec
        vitals: visit.vitals || { bp: "", temp: "", pulse: "", spo2: "", weight: "", bsr: "" }, // Added bsr
        medications: visit.medications || []
    })

    useEffect(() => {
        Promise.all([
            pharmacyApi.getMedicines(),
            opdApi.getPatientSummary(visit.id)
        ]).then(([meds, sum]) => {
            setMedicines(meds)
            setSummary(sum)
        }).catch(console.error)
    }, [visit.id])

    const handleAddMedication = () => {
        setConsultData({
            ...consultData,
            medications: [...consultData.medications, { medicineId: "", medicineName: "", dosage: "", frequency: "1-0-1", duration: "5 days", instructions: "After food", quantity: 1 }]
        })
    }

    const handleSave = async (isFinal: boolean) => {
        setLoading(true)
        try {
            await opdApi.saveConsultation(visit.id, {
                ...consultData,
                completeVisit: isFinal
            })
            toast.success(isFinal ? "Consultation completed and moved to history" : "Progress saved")
            if (isFinal) onComplete()
        } catch (error) {
            toast.error("Failed to save consultation")
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in fade-in duration-300 pb-20">
            {/* Patient Profile Sidebar */}
            <div className="lg:col-span-1 space-y-6">
                <Card className="border-primary/20 bg-primary/5">
                    <CardHeader className="text-center pb-2">
                        <div className="size-20 rounded-full bg-white shadow-sm flex items-center justify-center mx-auto mb-2 border">
                            <User className="size-10 text-primary" />
                        </div>
                        <CardTitle className="text-xl font-bold">{patient.firstName} {patient.lastName}</CardTitle>
                        <CardDescription className="font-medium text-xs uppercase tracking-wider">{patient.gender} · {visit.visitType}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-2 pb-4 border-b border-primary/10">
                            <div className="text-center">
                                <p className="text-[9px] font-bold text-muted-foreground uppercase">Patient ID</p>
                                <p className="font-mono text-xs font-bold">{patient.patientId}</p>
                            </div>
                            <div className="text-center border-l border-primary/10">
                                <p className="text-[9px] font-bold text-muted-foreground uppercase">Past Visits</p>
                                <p className="text-xs font-bold">{summary?.previousVisitCount || 0}</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase text-muted-foreground font-bold">Chief Complaint</Label>
                                <div className="p-3 bg-white border rounded text-xs leading-relaxed italic border-primary/10 select-none">
                                    "{visit.chiefComplaint}"
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-rose-500">
                                    <AlertCircle className="size-3.5" />
                                    <span className="text-[10px] font-bold uppercase tracking-wide">Known Allergies</span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {summary?.allergies.map(a => <Badge key={a} variant="outline" className="text-[9px] bg-rose-50 text-rose-600 border-rose-100">{a}</Badge>)}
                                    {(!summary?.allergies || summary.allergies.length === 0) && <span className="text-xs text-muted-foreground/60 italic">No allergies documented</span>}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-primary/20">
                    <CardHeader className="py-3 bg-primary/5 border-b border-primary/10">
                        <CardTitle className="text-xs font-bold uppercase flex items-center gap-2">
                            <Activity className="size-3 text-primary" />
                            Clinical Vitals
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-x-4 gap-y-3 p-4">
                        <div className="space-y-1">
                            <Label className="text-[9px] font-bold uppercase text-muted-foreground">BP (mmHg)</Label>
                            <Input size={1} value={(consultData.vitals as any).bp} onChange={e => setConsultData({ ...consultData, vitals: { ...consultData.vitals, bp: e.target.value } })} className="h-9 text-sm font-bold bg-muted/20" placeholder="120/80" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[9px] font-bold uppercase text-muted-foreground">Temp (°C)</Label>
                            <Input value={(consultData.vitals as any).temp} onChange={e => setConsultData({ ...consultData, vitals: { ...consultData.vitals, temp: e.target.value } })} className="h-9 text-sm font-bold bg-muted/20" placeholder="36.5" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[9px] font-bold uppercase text-muted-foreground">Pulse (bpm)</Label>
                            <Input value={(consultData.vitals as any).pulse} onChange={e => setConsultData({ ...consultData, vitals: { ...consultData.vitals, pulse: e.target.value } })} className="h-9 text-sm font-bold bg-muted/20" placeholder="72" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[9px] font-bold uppercase text-muted-foreground">SpO2 (%)</Label>
                            <Input value={(consultData.vitals as any).spo2} onChange={e => setConsultData({ ...consultData, vitals: { ...consultData.vitals, spo2: e.target.value } })} className="h-9 text-sm font-bold bg-muted/20" placeholder="98" />
                        </div>
                        <div className="space-y-1 col-span-2">
                            <Label className="text-[9px] font-bold uppercase text-muted-foreground">Blood Sugar (mg/dL)</Label>
                            <Input value={(consultData.vitals as any).bsr} onChange={e => setConsultData({ ...consultData, vitals: { ...consultData.vitals, bsr: e.target.value } })} className="h-9 text-sm font-bold bg-muted/20" placeholder="90 (Random/Fasting)" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main clinical Area */}
            <div className="lg:col-span-3">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <div className="flex items-center justify-between border-b mb-6 h-12">
                        <TabsList className="bg-transparent gap-8 h-full p-0">
                            <TabsTrigger value="clinical" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0 font-bold uppercase text-xs tracking-wide">Clinical Findings</TabsTrigger>
                            <TabsTrigger value="rx" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0 font-bold uppercase text-xs tracking-wide">Prescription Hub</TabsTrigger>
                            <TabsTrigger value="labs" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0 font-bold uppercase text-xs tracking-wide text-muted-foreground/50">Lab Investigations</TabsTrigger>
                        </TabsList>
                        <div className="flex gap-2">
                            <Button variant="ghost" size="sm" className="font-bold text-xs" onClick={onCancel}>DISCARD</Button>
                            <Button variant="outline" size="sm" onClick={() => handleSave(false)} disabled={loading} className="gap-2 font-bold text-xs border-primary/20 text-primary">
                                SAVE PROGRESS
                            </Button>
                            <Button size="sm" onClick={() => handleSave(true)} disabled={loading} className="gap-2 font-bold text-xs px-6 shadow-md shadow-primary/20">
                                <CheckCircle2 className="size-4" />
                                COMPLETE VISIT
                            </Button>
                        </div>
                    </div>

                    <ScrollArea className="h-[70vh] pr-4">
                        <TabsContent value="clinical" className="mt-0 space-y-6">
                            <div className="space-y-4">
                                <div className="grid gap-2">
                                    <Label className="font-bold flex items-center gap-2">
                                        <History className="size-4 text-primary" />
                                        History of Present Illness (HPI)
                                    </Label>
                                    <Textarea
                                        placeholder="Enter patient's historical illness details..."
                                        className="min-h-[100px]"
                                        value={consultData.historyIllness}
                                        onChange={e => setConsultData({ ...consultData, historyIllness: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label className="font-bold">Past Medical History</Label>
                                        <Textarea
                                            placeholder="Surgeries, chronic conditions..."
                                            className="min-h-[80px]"
                                            value={consultData.pastHistory}
                                            onChange={e => setConsultData({ ...consultData, pastHistory: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="font-bold">Family History</Label>
                                        <Textarea
                                            placeholder="Hereditary conditions..."
                                            className="min-h-[80px]"
                                            value={consultData.familyHistory}
                                            onChange={e => setConsultData({ ...consultData, familyHistory: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-2">
                                    <Label className="font-bold flex items-center gap-2">
                                        <Activity className="size-4 text-emerald-500" />
                                        Physical Examination
                                    </Label>
                                    <Textarea
                                        placeholder="Describe examination findings (HEENT, CVS, PA, etc.)..."
                                        className="min-h-[100px]"
                                        value={consultData.physicalExamination}
                                        onChange={e => setConsultData({ ...consultData, physicalExamination: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label className="font-bold text-primary">Primary Diagnosis</Label>
                                        <Input
                                            placeholder="Primary medical diagnosis..."
                                            className="h-12"
                                            value={consultData.diagnosis}
                                            onChange={e => setConsultData({ ...consultData, diagnosis: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="font-bold text-muted-foreground">Secondary Diagnosis</Label>
                                        <Input
                                            placeholder="Comorbidities / Other..."
                                            className="h-12"
                                            value={consultData.secondaryDiagnosis}
                                            onChange={e => setConsultData({ ...consultData, secondaryDiagnosis: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-2">
                                    <Label className="font-bold flex items-center gap-2">
                                        <ClipboardList className="size-4 text-primary" />
                                        Clinical Notes & Observations
                                    </Label>
                                    <Textarea
                                        placeholder="Detailed clinical findings, progress notes, or patient instructions..."
                                        className="min-h-[150px]"
                                        value={consultData.clinicalNotes}
                                        onChange={e => setConsultData({ ...consultData, clinicalNotes: e.target.value })}
                                    />
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="rx" className="mt-0 space-y-4">
                            <div className="flex justify-between items-center bg-muted/30 p-4 rounded-lg">
                                <div>
                                    <h3 className="font-bold flex items-center gap-2">
                                        <Pill className="size-4 text-rose-500" />
                                        Pharmacy Integration
                                    </h3>
                                    <p className="text-xs text-muted-foreground">Medicines added here will sync to the pharmacy instantly.</p>
                                </div>
                                <Button variant="outline" size="sm" onClick={handleAddMedication}>Add Medication</Button>
                            </div>

                            <div className="space-y-4">
                                {consultData.medications.map((med, idx) => (
                                    <div key={idx} className="grid grid-cols-6 gap-2 items-end border p-3 rounded-md animate-in slide-in-from-top-2 duration-300">
                                        <div className="col-span-2 space-y-1">
                                            <Label className="text-[10px]">Select Drug</Label>
                                            <Select
                                                value={med.medicineId}
                                                onValueChange={(v) => {
                                                    const m = medicines.find(m => m.id === v)
                                                    const newMeds = [...consultData.medications]
                                                    newMeds[idx] = { ...newMeds[idx], medicineId: v, medicineName: m?.name || "" }
                                                    setConsultData({ ...consultData, medications: newMeds })
                                                }}
                                            >
                                                <SelectTrigger className="h-8 text-xs">
                                                    <SelectValue placeholder="Drug Name" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {medicines.map(m => (
                                                        <SelectItem key={m.id} value={m.id}>{m.name} ({m.genericName})</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px]">Dosage</Label>
                                            <Input className="h-8 text-xs" value={med.dosage} onChange={e => {
                                                const newMeds = [...consultData.medications]
                                                newMeds[idx].dosage = e.target.value
                                                setConsultData({ ...consultData, medications: newMeds })
                                            }} placeholder="500mg" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px]">Freq</Label>
                                            <Input className="h-8 text-xs" value={med.frequency} onChange={e => {
                                                const newMeds = [...consultData.medications]
                                                newMeds[idx].frequency = e.target.value
                                                setConsultData({ ...consultData, medications: newMeds })
                                            }} placeholder="1-0-1" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px]">Dur</Label>
                                            <Input className="h-8 text-xs" value={med.duration} onChange={e => {
                                                const newMeds = [...consultData.medications]
                                                newMeds[idx].duration = e.target.value
                                                setConsultData({ ...consultData, medications: newMeds })
                                            }} placeholder="5 days" />
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-8 size-8 text-rose-500" onClick={() => {
                                            const newMeds = consultData.medications.filter((_, i) => i !== idx)
                                            setConsultData({ ...consultData, medications: newMeds })
                                        }}>
                                            <ChevronRight className="size-4 rotate-45" />
                                        </Button>
                                    </div>
                                ))}
                                {consultData.medications.length === 0 && (
                                    <div className="text-center py-12 border border-dashed rounded-lg">
                                        <p className="text-sm text-muted-foreground">No medications prescribed yet.</p>
                                    </div>
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="labs" className="mt-0">
                            <LabInvestigationsTab visit={visit} />
                        </TabsContent>
                    </ScrollArea>
                </Tabs>
            </div>
        </div>
    )
}
