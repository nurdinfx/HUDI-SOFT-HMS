"use client"

import { useState, useMemo, useEffect } from "react"
import { Plus, Search, Eye, Stethoscope, BedDouble } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
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
import { appointmentsApi, type Appointment, type Doctor, type Patient } from "@/lib/api"
import { toast } from "sonner"

interface Props {
  appointments: Appointment[]
  doctors?: Doctor[]
  patients?: Patient[]
  onRefresh?: () => void
  initialPatientId?: string | null
  initialDoctorId?: string | null
}

export function AppointmentsContent({
  appointments: initial,
  doctors = [],
  patients = [],
  onRefresh,
  initialPatientId,
  initialDoctorId
}: Props) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
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

  const appointmentsList = Array.isArray(initial) ? initial : []
  const filtered = useMemo(() => {
    return appointmentsList.filter((a) => {
      const matchSearch = !search || a.patientName.toLowerCase().includes(search.toLowerCase()) || a.doctorName.toLowerCase().includes(search.toLowerCase()) || a.appointmentId.toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === "all" || a.status === statusFilter
      const matchType = typeFilter === "all" || a.type === typeFilter
      return matchSearch && matchStatus && matchType
    })
  }, [appointmentsList, search, statusFilter, typeFilter])

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
      toast.success("Appointment booked successfully")
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
                  <TableCell className="font-mono text-xs font-bold text-primary px-6">{a.appointmentId}</TableCell>
                  <TableCell className="font-bold">{a.patientName}</TableCell>
                  <TableCell className="font-medium">{a.doctorName}</TableCell>
                  <TableCell className="hidden md:table-cell">{a.department}</TableCell>
                  <TableCell className="font-medium">{a.date}</TableCell>
                  <TableCell className="hidden md:table-cell">{a.time}</TableCell>
                  <TableCell className="hidden lg:table-cell capitalize font-medium">{a.type.replace("-", " ")}</TableCell>
                  <TableCell className="px-6"><StatusBadge status={a.status} /></TableCell>
                  <TableCell className="px-6 text-right">
                    <Button variant="ghost" size="icon" title="View Patient Profile" asChild>
                      <Link href={`/patients/${a.patientId}`}>
                        <Eye className="size-4 text-muted-foreground" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon" title="Send to OPD Consult" asChild>
                      <Link href={`/opd?patientId=${a.patientId}&doctorId=${a.doctorId}`}>
                        <Stethoscope className="size-4 text-primary" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon" title="Admit to IPD" asChild>
                      <Link href={`/ipd?patientId=${a.patientId}&doctorId=${a.doctorId}`}>
                        <BedDouble className="size-4 text-emerald-600" />
                      </Link>
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
    </div>
  )
}
