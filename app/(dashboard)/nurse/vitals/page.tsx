"use client"

import { useState, useEffect } from "react"
import { Search, Save, History, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PageHeader } from "@/components/shared/page-header"
import { patientsApi, vitalsApi, type Patient, type Vitals } from "@/lib/api"
import { toast } from "sonner"
import { format } from "date-fns"

export default function NurseVitalsPage() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [selectedPatientId, setSelectedPatientId] = useState<string>("")
  const [vitalsHistory, setVitalsHistory] = useState<Vitals[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchingHistory, setFetchingHistory] = useState(false)
  const [formData, setFormData] = useState({
    bp: "",
    temperature: "",
    pulse: "",
    spo2: "",
    bloodSugar: ""
  })

  useEffect(() => {
    patientsApi.getAll()
      .then(setPatients)
      .catch((err) => {
        console.error("Failed to fetch patients", err)
        toast.error("Failed to load patients list")
      })
  }, [])

  useEffect(() => {
    if (selectedPatientId) {
      fetchHistory(selectedPatientId)
    } else {
      setVitalsHistory([])
    }
  }, [selectedPatientId])

  const fetchHistory = async (patientId: string) => {
    setFetchingHistory(true)
    try {
      const history = await vitalsApi.getByPatientId(patientId)
      setVitalsHistory(history)
    } catch (err) {
      console.error("Failed to fetch vitals history", err)
    } finally {
      setFetchingHistory(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPatientId) return toast.error("Please select a patient")

    setLoading(true)
    try {
      await vitalsApi.create({
        patientId: selectedPatientId,
        bp: formData.bp,
        temperature: formData.temperature ? parseFloat(formData.temperature) : undefined,
        pulse: formData.pulse ? parseInt(formData.pulse) : undefined,
        spo2: formData.spo2 ? parseInt(formData.spo2) : undefined,
        bloodSugar: formData.bloodSugar ? parseInt(formData.bloodSugar) : undefined
      })
      toast.success("Vitals Recorded Successfully")
      setFormData({ bp: "", temperature: "", pulse: "", spo2: "", bloodSugar: "" })
      fetchHistory(selectedPatientId)
    } catch (err) {
      console.error("Failed to save vitals", err)
      toast.error("Failed to save vitals")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <PageHeader 
        title="Patient Vitals" 
        description="Record and view clinical patient measurements"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-lg border-primary/10">
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <User className="size-5 text-primary" />
              New Measurement
            </CardTitle>
            <CardDescription>Enter clinical data for the selected patient</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="patient">Select Patient</Label>
                <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                  <SelectTrigger id="patient">
                    <SelectValue placeholder="Search or select patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.firstName} {p.lastName} ({p.patientId})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="bp">Blood Pressure (BP)</Label>
                  <Input 
                    id="bp" 
                    placeholder="e.g. 120/80" 
                    value={formData.bp}
                    onChange={(e) => setFormData({...formData, bp: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="temp">Temperature (°C)</Label>
                  <Input 
                    id="temp" 
                    type="number" 
                    step="0.1" 
                    placeholder="e.g. 36.5" 
                    value={formData.temperature}
                    onChange={(e) => setFormData({...formData, temperature: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pulse">Pulse (BPM)</Label>
                  <Input 
                    id="pulse" 
                    type="number" 
                    placeholder="e.g. 72" 
                    value={formData.pulse}
                    onChange={(e) => setFormData({...formData, pulse: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="spo2">SPO2 (%)</Label>
                  <Input 
                    id="spo2" 
                    type="number" 
                    placeholder="e.g. 98" 
                    value={formData.spo2}
                    onChange={(e) => setFormData({...formData, spo2: e.target.value})}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="sugar">Blood Sugar (mg/dL)</Label>
                  <Input 
                    id="sugar" 
                    type="number" 
                    placeholder="e.g. 100" 
                    value={formData.bloodSugar}
                    onChange={(e) => setFormData({...formData, bloodSugar: e.target.value})}
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full mt-4 font-bold" 
                disabled={loading || !selectedPatientId}
              >
                {loading ? "Saving..." : <><Save className="mr-2 size-4" /> Save Vitals</>}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-primary/10">
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <History className="size-5 text-primary" />
              Measurement History
            </CardTitle>
            <CardDescription>Previous recording for this patient</CardDescription>
          </CardHeader>
          <CardContent className="h-[450px] overflow-y-auto">
            {!selectedPatientId ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground italic">
                Select a patient to see history
              </div>
            ) : fetchingHistory ? (
              <div className="flex items-center justify-center h-full animate-pulse text-muted-foreground">
                Loading history...
              </div>
            ) : vitalsHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                No vitals recorded for this patient yet
              </div>
            ) : (
              <div className="space-y-4">
                {vitalsHistory.map((v) => (
                  <div key={v.id} className="p-4 rounded-xl border bg-slate-50/50 space-y-2">
                    <div className="flex justify-between items-center border-bottom pb-2 mb-2">
                      <span className="text-sm font-bold text-slate-900">
                        {format(new Date(v.createdAt), "MMM d, yyyy · HH:mm")}
                      </span>
                      <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full font-medium">
                        By {v.createdByName || "Unknown"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {v.bp && (
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground uppercase font-black">BP</span>
                          <span className="font-mono font-bold leading-none">{v.bp} <span className="text-[10px] text-slate-400">mmHg</span></span>
                        </div>
                      )}
                      {v.temperature && (
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground uppercase font-black">Temp</span>
                          <span className="font-mono font-bold leading-none">{v.temperature}°C</span>
                        </div>
                      )}
                      {v.pulse && (
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground uppercase font-black">Pulse</span>
                          <span className="font-mono font-bold leading-none">{v.pulse} <span className="text-[10px] text-slate-400">BPM</span></span>
                        </div>
                      )}
                      {v.spo2 && (
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground uppercase font-black">SPO2</span>
                          <span className="font-mono font-bold leading-none">{v.spo2}%</span>
                        </div>
                      )}
                      {v.bloodSugar && (
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground uppercase font-black">Sugar</span>
                          <span className="font-mono font-bold leading-none">{v.bloodSugar} <span className="text-[10px] text-slate-400">mg/dL</span></span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
