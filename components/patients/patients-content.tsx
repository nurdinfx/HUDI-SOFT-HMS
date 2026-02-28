"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Plus, Search, Eye, Calendar, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import type { Patient } from "@/lib/data/types"
import { toast } from "sonner"

import { patientsApi } from "@/lib/api"

interface PatientsContentProps {
  patients: Patient[]
  onRefresh?: () => void
}

export function PatientsContent({ patients: initialPatients, onRefresh }: PatientsContentProps) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [genderFilter, setGenderFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const perPage = 10

  const filtered = useMemo(() => {
    return initialPatients.filter((p) => {
      const matchSearch =
        !search ||
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
        p.patientId.toLowerCase().includes(search.toLowerCase()) ||
        p.phone.includes(search)
      const matchStatus = statusFilter === "all" || p.status === statusFilter
      const matchGender = genderFilter === "all" || p.gender === genderFilter
      return matchSearch && matchStatus && matchGender
    })
  }, [initialPatients, search, statusFilter, genderFilter])

  const totalPages = Math.ceil(filtered.length / perPage)
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this patient?")) return;
    setIsDeleting(id)
    try {
      await patientsApi.delete(id)
      toast.success("Patient deleted")
      if (onRefresh) onRefresh()
    } catch (e: any) {
      toast.error(e.message || "Failed to delete")
    } finally {
      setIsDeleting(null)
    }
  }

  async function handleEditPatient(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editingPatient) return;
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    const data = {
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
      dateOfBirth: formData.get("dob") as string,
      gender: formData.get("gender") as string,
      bloodGroup: formData.get("bloodGroup") as string,
      phone: formData.get("phone") as string,
      email: formData.get("email") as string,
      address: formData.get("address") as string,
      city: formData.get("city") as string,
      emergencyContact: formData.get("emergencyContact") as string,
      emergencyPhone: formData.get("emergencyPhone") as string,
      status: formData.get("status") as string,
    }

    try {
      await patientsApi.update(editingPatient.id, data)
      toast.success("Patient updated successfully")
      setEditDialogOpen(false)
      if (onRefresh) onRefresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to update patient")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleAddPatient(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    const data = {
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
      dateOfBirth: formData.get("dob") as string,
      gender: formData.get("gender") as string,
      bloodGroup: formData.get("bloodGroup") as string,
      phone: formData.get("phone") as string,
      email: formData.get("email") as string,
      address: formData.get("address") as string,
      city: formData.get("city") as string,
      emergencyContact: formData.get("emergencyContact") as string,
      emergencyPhone: formData.get("emergencyPhone") as string,
    }

    try {
      await patientsApi.create(data)
      toast.success("Patient registered successfully")
      setDialogOpen(false)
      if (onRefresh) onRefresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to register patient")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Patients" description={`${initialPatients.length} total patients registered`}>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 size-4" />
              Add Patient
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Register New Patient</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddPatient} className="grid grid-cols-2 gap-4 mt-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" name="firstName" placeholder="John" required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" name="lastName" placeholder="Doe" required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="dob">Date of Birth</Label>
                <Input id="dob" name="dob" type="date" required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="gender">Gender</Label>
                <Select name="gender" defaultValue="male">
                  <SelectTrigger id="gender"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="bloodGroup">Blood Group</Label>
                <Select name="bloodGroup" defaultValue="O+">
                  <SelectTrigger id="bloodGroup"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                      <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" placeholder="212-555-1234" required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" placeholder="john@email.com" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" name="city" placeholder="New York" />
              </div>
              <div className="col-span-2 flex flex-col gap-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" name="address" placeholder="123 Main St, Apt 4B" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="emergencyContact">Emergency Contact</Label>
                <Input id="emergencyContact" name="emergencyContact" placeholder="Jane Doe" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="emergencyPhone">Emergency Phone</Label>
                <Input id="emergencyPhone" name="emergencyPhone" placeholder="212-555-5678" />
              </div>
              <div className="col-span-2 flex justify-end gap-2 mt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Registering..." : "Register Patient"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, ID, or phone..."
                className="pl-9"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1) }}
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1) }}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={genderFilter} onValueChange={(v) => { setGenderFilter(v); setCurrentPage(1) }}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Gender" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Gender</SelectItem>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Gender</TableHead>
                <TableHead className="hidden md:table-cell">Blood Group</TableHead>
                <TableHead className="hidden lg:table-cell">Phone</TableHead>
                <TableHead className="hidden lg:table-cell">Last Visit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[60px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((patient) => (
                <TableRow key={patient.id}>
                  <TableCell className="font-mono text-xs">{patient.patientId}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                        {patient.firstName[0]}{patient.lastName[0]}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{patient.firstName} {patient.lastName}</p>
                        <p className="text-xs text-muted-foreground">{patient.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell capitalize">{patient.gender}</TableCell>
                  <TableCell className="hidden md:table-cell">{patient.bloodGroup}</TableCell>
                  <TableCell className="hidden lg:table-cell text-sm">{patient.phone}</TableCell>
                  <TableCell className="hidden lg:table-cell text-sm">{patient.lastVisit ?? "N/A"}</TableCell>
                  <TableCell><StatusBadge status={patient.status} /></TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" asChild title="Schedule Appointment">
                      <Link href={`/appointments?patientId=${patient.id}`}>
                        <Calendar className="size-4 text-primary" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon" asChild title="View Profile">
                      <Link href={`/patients/${patient.id}`}>
                        <Eye className="size-4" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon" title="Edit Patient" onClick={() => { setEditingPatient(patient); setEditDialogOpen(true); }}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Delete Patient" onClick={() => handleDelete(patient.id)} disabled={isDeleting === patient.id}>
                      <Trash2 className="size-4 text-rose-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {paginated.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No patients found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * perPage + 1}-{Math.min(currentPage * perPage, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(currentPage + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Patient</DialogTitle>
          </DialogHeader>
          {editingPatient && (
            <form onSubmit={handleEditPatient} className="grid grid-cols-2 gap-4 mt-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-firstName">First Name</Label>
                <Input id="edit-firstName" name="firstName" defaultValue={editingPatient.firstName} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-lastName">Last Name</Label>
                <Input id="edit-lastName" name="lastName" defaultValue={editingPatient.lastName} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-dob">Date of Birth</Label>
                <Input id="edit-dob" name="dob" type="date" defaultValue={editingPatient.dateOfBirth} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-gender">Gender</Label>
                <Select name="gender" defaultValue={editingPatient.gender}>
                  <SelectTrigger id="edit-gender"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-bloodGroup">Blood Group</Label>
                <Select name="bloodGroup" defaultValue={editingPatient.bloodGroup || "O+"}>
                  <SelectTrigger id="edit-bloodGroup"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                      <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input id="edit-phone" name="phone" defaultValue={editingPatient.phone} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input id="edit-email" name="email" type="email" defaultValue={editingPatient.email} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-city">City</Label>
                <Input id="edit-city" name="city" defaultValue={editingPatient.city} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select name="status" defaultValue={editingPatient.status}>
                  <SelectTrigger id="edit-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 flex flex-col gap-2">
                <Label htmlFor="edit-address">Address</Label>
                <Input id="edit-address" name="address" defaultValue={editingPatient.address} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-emergencyContact">Emergency Contact</Label>
                <Input id="edit-emergencyContact" name="emergencyContact" defaultValue={editingPatient.emergencyContact} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-emergencyPhone">Emergency Phone</Label>
                <Input id="edit-emergencyPhone" name="emergencyPhone" defaultValue={editingPatient.emergencyPhone} />
              </div>
              <div className="col-span-2 flex justify-end gap-2 mt-2">
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Updating..." : "Update Patient"}</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
