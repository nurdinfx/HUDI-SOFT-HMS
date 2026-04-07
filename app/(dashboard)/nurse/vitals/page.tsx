"use client"

import { useState, useEffect } from "react"
import { Search, Activity, Thermometer, Heart, Droplets, FlaskConical, Save, User, CheckCircle2 } from "lucide-react"
import { patientsApi, vitalsApi, type Patient } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/page-header"
import { cn } from "@/lib/utils"

export default function NurseVitalsPage() {
    const [patients, setPatients] = useState<Patient[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
    const [submitting, setSubmitting] = useState(false)
    
    const [formData, setFormData] = useState({
        bp: "",
        temperature: "",
        pulse: "",
        spo2: "",
        bloodSugar: ""
    })

    useEffect(() => {
        patientsApi.getAll()
            .then(data => setPatients(Array.isArray(data) ? data : []))
            .catch(err => console.error("Failed to fetch patients", err))
            .finally(() => setLoading(false))
    }, [])

    const filteredPatients = search.length > 1 ? patients.filter(p => 
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
        p.patientId.toLowerCase().includes(search.toLowerCase())
    ).slice(0, 5) : []

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedPatient) return toast.error("Please select a patient")
        
        setSubmitting(true)
        try {
            await vitalsApi.create({
                patientId: selectedPatient.id,
                bp: formData.bp,
                temperature: formData.temperature ? parseFloat(formData.temperature) : undefined,
                pulse: formData.pulse ? parseInt(formData.pulse) : undefined,
                spo2: formData.spo2 ? parseInt(formData.spo2) : undefined,
                bloodSugar: formData.bloodSugar ? parseInt(formData.bloodSugar) : undefined
            })
            toast.success("Vitals Recorded Successfully", {
                description: `Patient: ${selectedPatient.firstName} ${selectedPatient.lastName}`,
                icon: <CheckCircle2 className="text-emerald-500" />
            })
            setFormData({ bp: "", temperature: "", pulse: "", spo2: "", bloodSugar: "" })
            setSelectedPatient(null)
            setSearch("")
        } catch (err: any) {
            toast.error(err.message || "Failed to record vitals")
            console.error(err)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="flex flex-col gap-8 pb-10">
            <PageHeader 
                title="Vitals Entry" 
                description="Record patient clinical vitals (BP, Temperature, Pulse, SPO2, Blood Sugar)"
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Side: Patient Selection */}
                <div className="lg:col-span-4 space-y-6">
                    <Card className="border-primary/10 shadow-sm overflow-hidden">
                        <CardHeader className="bg-muted/30 pb-4">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <User className="size-5 text-primary" />
                                Patient Selection
                            </CardTitle>
                            <CardDescription>Search and select a patient to record vitals</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                <Input 
                                    placeholder="Search by name or ID..." 
                                    className="pl-10 h-11 bg-muted/20 border-muted-foreground/10 focus:ring-primary/20"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    disabled={loading}
                                />
                            </div>

                            {search.length > 1 && !selectedPatient && (
                                <div className="border rounded-xl divide-y overflow-hidden bg-background shadow-xl border-primary/5 animate-in fade-in slide-in-from-top-2 duration-300">
                                    {filteredPatients.length > 0 ? filteredPatients.map(p => (
                                        <button
                                            key={p.id}
                                            className="w-full text-left px-4 py-3 hover:bg-primary/5 transition-colors flex flex-col"
                                            onClick={() => {
                                                setSelectedPatient(p)
                                                setSearch(`${p.firstName} ${p.lastName}`)
                                            }}
                                        >
                                            <span className="font-bold text-sm">{p.firstName} {p.lastName}</span>
                                            <span className="text-xs text-muted-foreground font-mono">{p.patientId}</span>
                                        </button>
                                    )) : (
                                        <div className="p-4 text-center text-sm text-muted-foreground italic">No patients found</div>
                                    )}
                                </div>
                            )}

                            {selectedPatient && (
                                <div className="bg-primary/5 border border-primary/10 p-4 rounded-xl flex items-center justify-between animate-in zoom-in-95 duration-200">
                                    <div className="flex flex-col">
                                        <span className="font-black text-primary">{selectedPatient.firstName} {selectedPatient.lastName}</span>
                                        <span className="text-xs text-primary/70 font-bold uppercase tracking-wider">{selectedPatient.patientId}</span>
                                    </div>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="text-muted-foreground hover:text-destructive h-8 px-2"
                                        onClick={() => {
                                            setSelectedPatient(null)
                                            setSearch("")
                                        }}
                                    >
                                        Change
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {selectedPatient && (
                        <Card className="border-primary/5 shadow-sm bg-muted/10 animate-in slide-in-from-left duration-300">
                            <CardContent className="pt-6 space-y-4">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground font-medium">Gender</span>
                                    <span className="font-bold capitalize">{selectedPatient.gender}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground font-medium">Age</span>
                                    <span className="font-bold">
                                        {selectedPatient.dateOfBirth ? 
                                            new Date().getFullYear() - new Date(selectedPatient.dateOfBirth).getFullYear() 
                                            : 'N/A'
                                        } years
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground font-medium">Blood Group</span>
                                    <span className="font-bold text-destructive">{selectedPatient.bloodGroup || 'Not set'}</span>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Right Side: Vitals Form */}
                <div className="lg:col-span-8">
                    <form onSubmit={handleSubmit}>
                        <Card className="border-primary/10 shadow-sm">
                            <CardHeader className="border-b bg-muted/10">
                                <CardTitle className="flex items-center gap-2">
                                    <Activity className="size-5 text-primary" />
                                    Clinical Measurements
                                </CardTitle>
                                <CardDescription>Enter the latest clinical measurements for the selected patient</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-8 pb-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">
                                    {/* BP */}
                                    <div className="space-y-3">
                                        <Label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                            <Activity className="size-4 text-blue-500" />
                                            Blood Pressure (BP)
                                        </Label>
                                        <div className="relative">
                                            <Input 
                                                placeholder="e.g. 120/80" 
                                                className="h-12 border-slate-200 focus:ring-blue-500/20 pr-12 text-lg font-medium"
                                                value={formData.bp}
                                                onChange={(e) => setFormData({...formData, bp: e.target.value})}
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground uppercase opacity-50">mmHg</span>
                                        </div>
                                    </div>

                                    {/* Temperature */}
                                    <div className="space-y-3">
                                        <Label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                            <Thermometer className="size-4 text-orange-500" />
                                            Temperature
                                        </Label>
                                        <div className="relative">
                                            <Input 
                                                type="number"
                                                step="0.1"
                                                placeholder="e.g. 36.5" 
                                                className="h-12 border-slate-200 focus:ring-orange-500/20 pr-10 text-lg font-medium"
                                                value={formData.temperature}
                                                onChange={(e) => setFormData({...formData, temperature: e.target.value})}
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-muted-foreground uppercase opacity-50">°C</span>
                                        </div>
                                    </div>

                                    {/* Pulse */}
                                    <div className="space-y-3">
                                        <Label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                            <Heart className="size-4 text-rose-500" />
                                            Pulse Rate
                                        </Label>
                                        <div className="relative">
                                            <Input 
                                                type="number"
                                                placeholder="e.g. 72" 
                                                className="h-12 border-slate-200 focus:ring-rose-500/20 pr-12 text-lg font-medium"
                                                value={formData.pulse}
                                                onChange={(e) => setFormData({...formData, pulse: e.target.value})}
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground uppercase opacity-50">BPM</span>
                                        </div>
                                    </div>

                                    {/* SPO2 */}
                                    <div className="space-y-3">
                                        <Label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                            <Droplets className="size-4 text-sky-500" />
                                            Oxygen Saturation (SPO2)
                                        </Label>
                                        <div className="relative">
                                            <Input 
                                                type="number"
                                                placeholder="e.g. 98" 
                                                className="h-12 border-slate-200 focus:ring-sky-500/20 pr-10 text-lg font-medium"
                                                value={formData.spo2}
                                                onChange={(e) => setFormData({...formData, spo2: e.target.value})}
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-muted-foreground uppercase opacity-50">%</span>
                                        </div>
                                    </div>

                                    {/* Blood Sugar */}
                                    <div className="space-y-3">
                                        <Label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                            <FlaskConical className="size-4 text-emerald-500" />
                                            Blood Sugar
                                        </Label>
                                        <div className="relative">
                                            <Input 
                                                type="number"
                                                placeholder="e.g. 100" 
                                                className="h-12 border-slate-200 focus:ring-emerald-500/20 pr-12 text-lg font-medium"
                                                value={formData.bloodSugar}
                                                onChange={(e) => setFormData({...formData, bloodSugar: e.target.value})}
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground uppercase opacity-50">mg/dL</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-12 flex justify-end">
                                    <Button 
                                        type="submit" 
                                        size="lg" 
                                        className="h-14 px-10 rounded-xl font-black text-lg bg-slate-900 border-2 border-primary/20 shadow-xl shadow-primary/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                        disabled={submitting || !selectedPatient}
                                    >
                                        {submitting ? (
                                            <>
                                                <Activity className="mr-2 size-5 animate-spin" />
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="mr-2 size-5" />
                                                Submit Vitals
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </form>
                </div>
            </div>
        </div>
    )
}
