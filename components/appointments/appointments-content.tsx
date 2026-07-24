"use client"

import { useState, useMemo, useEffect } from "react"
import { Plus, Search, Eye, Stethoscope, BedDouble, Check, CheckCheck, Printer, HeartPulse, Activity } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { appointmentsApi, vitalsApi, type Appointment, type Doctor, type Patient, type HospitalSettings, type Vitals } from "@/lib/api"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { format } from "date-fns"

function playNotificationSound() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = "sine";
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  } catch (err) {
    console.error("Audio playback failed:", err);
  }
}

interface Props {
  appointments: Appointment[]
  doctors?: Doctor[]
  patients?: Patient[]
  onRefresh?: () => void
  initialPatientId?: string | null
  initialDoctorId?: string | null
  settings?: HospitalSettings | null
}

export function AppointmentsContent({
  appointments: initial,
  doctors = [],
  patients = [],
  onRefresh,
  initialPatientId,
  initialDoctorId,
  settings
}: Props) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { user } = useAuth()
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [vitals, setVitals] = useState<Vitals[]>([])
  const [loadingVitals, setLoadingVitals] = useState(false)
  const [doctorFilter, setDoctorFilter] = useState("all")
  const perPage = 10

  const [formData, setFormData] = useState({
    patientId: "",
    doctorId: "",
    date: "",
    time: "",
    type: "consultation",
    notes: ""
  })

  useEffect(() => {
    if (initialPatientId || initialDoctorId) {
      setFormData(prev => ({
        ...prev,
        patientId: initialPatientId || prev.patientId,
        doctorId: initialDoctorId || prev.doctorId
      }))
      setDialogOpen(true)
    }
  }, [initialPatientId, initialDoctorId])

  const [prevApptsHash, setPrevApptsHash] = useState<string>("")

  useEffect(() => {
    if (!initial) return;
    const currentHash = initial.map(a => `${a.id}-${a.status}-${a.isViewedByDoctor}`).join(',')
    if (prevApptsHash && currentHash !== prevApptsHash) {
        playNotificationSound()
    }
    setPrevApptsHash(currentHash)
  }, [initial])

  useEffect(() => {
    if (initialDoctorId) {
      setDoctorFilter(initialDoctorId)
      return
    }
    if (user?.role === 'doctor' && doctors.length > 0) {
      const dr = doctors.find(d => 
        d.email?.toLowerCase() === user.email?.toLowerCase() || 
        d.name.toLowerCase().trim() === user.name.toLowerCase().trim()
      )
      if (dr) setDoctorFilter(dr.id)
    }
  }, [user, doctors, initialDoctorId])

  useEffect(() => {
    if (selectedAppointment) {
      setLoadingVitals(true)
      vitalsApi.getByPatientId(selectedAppointment.patientId)
        .then(setVitals)
        .catch(err => {
          console.error("Failed to fetch vitals", err)
          toast.error("Failed to load patient vitals")
        })
        .finally(() => setLoadingVitals(false))
    }
  }, [selectedAppointment])

  const handlePrintCard = (appt: Appointment) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>Appointment Card - ${appt.appointmentId}</title>
          <style>
            @page { size: 58mm auto; margin: 0; }
            body { 
              width: 58mm; 
              margin: 0; 
              padding: 5mm; 
              font-family: 'Inter', sans-serif; 
              font-size: 10pt;
              line-height: 1.2;
              color: #000;
            }
            .header { text-align: center; margin-bottom: 5mm; border-bottom: 1px dashed #ccc; padding-bottom: 3mm; }
            .logo-container { margin-bottom: 2mm; }
            .hospital-logo { max-width: 30mm; max-height: 15mm; object-fit: contain; }
            .hospital-name { font-weight: bold; font-size: 12pt; text-transform: uppercase; display: block; }
            .tagline { font-size: 8pt; color: #666; display: block; margin-top: 1mm; }
            .contact { font-size: 8pt; color: #444; display: block; margin-top: 1mm; }
            .title { text-align: center; font-weight: bold; margin: 3mm 0; font-size: 11pt; text-decoration: underline; }
            .row { display: flex; justify-content: space-between; margin-bottom: 2mm; }
            .label { font-weight: bold; width: 40%; }
            .value { width: 60%; text-align: right; }
            .footer { text-align: center; margin-top: 6mm; font-size: 8pt; border-top: 1px dashed #ccc; padding-top: 3mm; }
            .id-box { background: #eee; padding: 2mm; text-align: center; margin-top: 4mm; font-family: monospace; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            ${settings?.logo ? `
              <div class="logo-container">
                <img src="${settings.logo}" class="hospital-logo" alt="Logo" />
              </div>
            ` : ''}
            <span class="hospital-name">${settings?.name || 'HUDI SOFT HSM'}</span>
            ${settings?.tagline ? `<span class="tagline">${settings.tagline}</span>` : ''}
            <span class="contact">${settings?.address || ''}</span>
            <span class="contact">${settings?.phone || ''}</span>
          </div>
          
          <div class="title">APPOINTMENT CARD</div>
          
          <div class="row">
            <span class="label">Patient:</span>
            <span class="value">${appt.patientName}</span>
          </div>
          <div class="row">
            <span class="label">Doctor:</span>
            <span class="value">Dr. ${appt.doctorName}</span>
          </div>
          <div class="row">
            <span class="label">Dept:</span>
            <span class="value">${appt.department}</span>
          </div>
          <div class="row">
            <span class="label">Date:</span>
            <span class="value">${appt.date}</span>
          </div>
          <div class="row">
            <span class="label">Time:</span>
            <span class="value">${appt.time}</span>
          </div>
          <div class="row">
            <span class="label">Type:</span>
            <span class="value" style="text-transform: capitalize;">${appt.type.replace('-', ' ')}</span>
          </div>
          
          <div class="id-box">
            ID: ${appt.appointmentId}
          </div>
          
          <div class="footer">
            POWERED BY HUDI-SOFT
          </div>

          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleDoctorView = async (appointment: Appointment) => {
    if (user?.role === 'doctor' && !appointment.isViewedByDoctor) {
      try {
        await appointmentsApi.markAsViewed(appointment.id)
        if (onRefresh) onRefresh()
      } catch (err) {
        console.error("Failed to mark appointment as viewed", err)
      }
    }
  }

  const handleViewVitals = (appointment: Appointment) => {
    setSelectedAppointment(appointment)
    handleDoctorView(appointment)
  }

  const appointmentsList = Array.isArray(initial) ? initial : []
  const filtered = useMemo(() => {
    return appointmentsList.filter((a) => {
      const matchSearch = !search || a.patientName.toLowerCase().includes(search.toLowerCase()) || a.doctorName.toLowerCase().includes(search.toLowerCase()) || a.appointmentId.toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === "all" || a.status === statusFilter
      const matchType = typeFilter === "all" || a.type === typeFilter
      const matchDoctor = doctorFilter === "all" || a.doctorId === doctorFilter
      return matchSearch && matchStatus && matchType && matchDoctor
    })
  }, [appointmentsList, search, statusFilter, typeFilter, doctorFilter])

  const totalPages = Math.ceil(filtered.length / perPage)
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage)

  async function handleBook(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!formData.patientId || !formData.doctorId || !formData.date || !formData.time) {
      return toast.error("Please fill in all required fields")
    }

    setSubmitting(true)
    try {
      await appointmentsApi.create(formData)
      toast.success("Appointment Confirmed", {
        description: "The appointment has been successfully scheduled.",
        icon: "📅"
      })
      setDialogOpen(false)
      setFormData({
        patientId: "",
        doctorId: "",
        date: "",
        time: "",
        type: "consultation",
        notes: ""
      })
      if (onRefresh) onRefresh()
    } catch (error) {
      toast.error("Failed to book appointment")
      console.error(error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Appointments" description={`${appointmentsList.length} total appointments`}>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 size-4" />Book Appointment</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle className="font-bold text-xl">Book New Appointment</DialogTitle></DialogHeader>
            <form onSubmit={handleBook} className="flex flex-col gap-5 mt-4">
              <div className="flex flex-col gap-2">
                <Label className="font-semibold">Patient</Label>
                <Select required value={formData.patientId} onValueChange={(v) => setFormData({ ...formData, patientId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                  <SelectContent>
                    {patients.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName} ({p.patientId})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label className="font-semibold">Doctor</Label>
                <Select required value={formData.doctorId} onValueChange={(v) => setFormData({ ...formData, doctorId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger>
                  <SelectContent>
                    {doctors.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name} - {d.specialization}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label className="font-semibold">Date</Label>
                  <Input type="date" required value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label className="font-semibold">Time</Label>
                  <Input type="time" required value={formData.time} onChange={(e) => setFormData({ ...formData, time: e.target.value })} />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label className="font-semibold">Type</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consultation">Consultation</SelectItem>
                    <SelectItem value="follow-up">Follow-up</SelectItem>
                    <SelectItem value="routine-checkup">Routine Checkup</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label className="font-semibold">Notes</Label>
                <Textarea placeholder="Any additional notes..." value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Booking..." : "Book Appointment"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <Card className="border-primary/10 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input placeholder="Search appointments..." className="pl-9 h-10" value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1) }} />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1) }}>
              <SelectTrigger className="w-[150px] h-10"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setCurrentPage(1) }}>
              <SelectTrigger className="w-[150px] h-10"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="consultation">Consultation</SelectItem>
                <SelectItem value="follow-up">Follow-up</SelectItem>
                <SelectItem value="routine-checkup">Routine Checkup</SelectItem>
                <SelectItem value="emergency">Emergency</SelectItem>
              </SelectContent>
            </Select>
            <Select value={doctorFilter} onValueChange={(v) => { setDoctorFilter(v); setCurrentPage(1) }}>
              <SelectTrigger className="w-[180px] h-10"><SelectValue placeholder="Filter by Doctor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Doctors</SelectItem>
                {doctors.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/10 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-bold py-4 px-6">ID</TableHead>
                <TableHead className="font-bold py-4">Patient</TableHead>
                <TableHead className="font-bold py-4">Doctor</TableHead>
                <TableHead className="hidden md:table-cell font-bold py-4">Department</TableHead>
                <TableHead className="font-bold py-4">Date</TableHead>
                <TableHead className="hidden md:table-cell font-bold py-4">Time</TableHead>
                <TableHead className="hidden lg:table-cell font-bold py-4">Type</TableHead>
                <TableHead className="font-bold py-4 px-6">Status</TableHead>
                <TableHead className="font-bold py-4 px-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((a) => (
                <TableRow key={a.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="px-6">
                    <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-primary">{a.appointmentId}</span>
                        {a.isViewedByDoctor ? (
                            <span title="Viewed by Doctor"><CheckCheck className="size-4 text-blue-500" /></span>
                        ) : (
                            <span title="Not viewed yet"><Check className="size-4 text-slate-300" /></span>
                        )}
                    </div>
                  </TableCell>
                  <TableCell className="font-bold">{a.patientName}</TableCell>
                  <TableCell className="font-medium">{a.doctorName}</TableCell>
                  <TableCell className="hidden md:table-cell">{a.department}</TableCell>
                  <TableCell className="font-medium">{a.date}</TableCell>
                  <TableCell className="hidden md:table-cell">{a.time}</TableCell>
                  <TableCell className="hidden lg:table-cell capitalize font-medium">{a.type.replace("-", " ")}</TableCell>
                  <TableCell className="px-6"><StatusBadge status={a.status} /></TableCell>
                  <TableCell className="px-6 text-right">
                    <Button variant="ghost" size="icon" title="View Patient Vitals" onClick={() => handleViewVitals(a)}>
                      <HeartPulse className="size-4 text-rose-500" />
                    </Button>
                    <Button variant="ghost" size="icon" title="View Patient Profile" onClick={() => handleDoctorView(a)} asChild>
                      <Link href={`/patients/${a.patientId}`}>
                        <Eye className="size-4 text-muted-foreground" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon" title="Send to OPD Consult" onClick={() => handleDoctorView(a)} asChild>
                      <Link href={`/opd?patientId=${a.patientId}&doctorId=${a.doctorId}`}>
                        <Stethoscope className="size-4 text-primary" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon" title="Admit to IPD" onClick={() => handleDoctorView(a)} asChild>
                      <Link href={`/ipd?patientId=${a.patientId}&doctorId=${a.doctorId}`}>
                        <BedDouble className="size-4 text-emerald-600" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon" title="Print Appointment Card" onClick={() => handlePrintCard(a)}>
                      <Printer className="size-4 text-orange-600" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {paginated.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center py-20 text-muted-foreground animate-pulse">No appointments found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-muted-foreground font-medium">Showing {(currentPage - 1) * perPage + 1}-{Math.min(currentPage * perPage, filtered.length)} of {filtered.length}</p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="font-bold" disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)}>Previous</Button>
            <Button variant="outline" size="sm" className="font-bold" disabled={currentPage === totalPages} onClick={() => setCurrentPage(currentPage + 1)}>Next</Button>
          </div>
        </div>
      )}

      {selectedAppointment && (
        <Card className="border-primary/20 shadow-md animate-in fade-in slide-in-from-bottom-4 duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2 bg-muted/20">
            <div className="space-y-1">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Activity className="size-5 text-rose-500" />
                Patient Vitals: {selectedAppointment.patientName}
              </CardTitle>
              <CardDescription>Latest clinical measurements for this patient</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedAppointment(null)}>Close</Button>
          </CardHeader>
          <CardContent className="p-6">
            {loadingVitals ? (
              <div className="flex items-center justify-center h-32 animate-pulse text-muted-foreground italic">Fetching latest vitals...</div>
            ) : vitals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground italic">No vitals history found for this patient.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Latest Vitals Card */}
                <div className="space-y-4">
                  <h4 className="text-sm font-black text-muted-foreground uppercase tracking-widest px-1">Latest Reading</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-1">
                      <span className="text-[10px] font-black text-muted-foreground uppercase">Blood Pressure</span>
                      <span className="text-xl font-black text-slate-900">{vitals[0].bp || "--"} <span className="text-xs text-slate-400">mmHg</span></span>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-1">
                      <span className="text-[10px] font-black text-muted-foreground uppercase">Temperature</span>
                      <span className="text-xl font-black text-slate-900">{vitals[0].temperature || "--"} <span className="text-xs text-slate-400">°C</span></span>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-1">
                      <span className="text-[10px] font-black text-muted-foreground uppercase">Pulse Rate</span>
                      <span className="text-xl font-black text-slate-900">{vitals[0].pulse || "--"} <span className="text-xs text-slate-400">BPM</span></span>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-1">
                      <span className="text-[10px] font-black text-muted-foreground uppercase">SPO2</span>
                      <span className="text-xl font-black text-slate-900">{vitals[0].spo2 || "--"} <span className="text-xs text-slate-400">%</span></span>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-1 col-span-2">
                      <span className="text-[10px] font-black text-muted-foreground uppercase">Blood Sugar</span>
                      <span className="text-xl font-black text-slate-900">{vitals[0].bloodSugar || "--"} <span className="text-xs text-slate-400">mg/dL</span></span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-2 pt-2 text-xs text-muted-foreground border-t border-slate-100">
                    <span>Recorded: {format(new Date(vitals[0].createdAt), "MMM d, yyyy · HH:mm")}</span>
                    <span className="font-bold text-slate-900">By {vitals[0].createdByName}</span>
                  </div>
                </div>

                {/* History List */}
                <div className="space-y-4">
                  <h4 className="text-sm font-black text-muted-foreground uppercase tracking-widest px-1">History (Previous)</h4>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {vitals.slice(1).map((v) => (
                      <div key={v.id} className="p-3 rounded-xl border border-slate-100 bg-white shadow-sm flex items-center justify-between text-sm hover:bg-muted/30 transition-colors">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-slate-900">{format(new Date(v.createdAt), "MMM d, HH:mm")}</span>
                          <span className="text-[10px] text-muted-foreground">Nurse: {v.createdByName}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs font-mono">
                          {v.bp && <span title="BP"><span className="text-muted-foreground mr-1">BP</span>{v.bp}</span>}
                          {v.temperature && <span title="Temp"><span className="text-muted-foreground mr-1">T</span>{v.temperature}°</span>}
                          {v.pulse && <span title="Pulse"><span className="text-muted-foreground mr-1">P</span>{v.pulse}</span>}
                        </div>
                      </div>
                    ))}
                    {vitals.length <= 1 && (
                      <div className="text-center py-10 text-muted-foreground italic text-xs">No previous measurements.</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
