"use client"

import { ArrowLeft, Phone, Mail, MapPin, Droplets, Calendar, Shield, CalendarPlus, Stethoscope, BedDouble } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StatusBadge } from "@/components/shared/status-badge"
import type { Patient, Appointment, Prescription, LabTest, Invoice } from "@/lib/data/types"

interface PatientProfileProps {
  patient: Patient
  appointments: Appointment[]
  prescriptions: Prescription[]
  labTests: LabTest[]
  invoices: Invoice[]
}

export function PatientProfile({ patient, appointments, prescriptions, labTests, invoices }: PatientProfileProps) {
  const age = new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/patients"><ArrowLeft className="size-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{patient.firstName} {patient.lastName}</h1>
          <p className="text-sm text-muted-foreground">{patient.patientId} - Registered {patient.registeredAt}</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <StatusBadge status={patient.status} />
          <div className="h-6 w-px bg-border" />
          <Button variant="outline" size="sm" asChild className="gap-2">
            <Link href={`/appointments?patientId=${patient.id}`}>
              <CalendarPlus className="size-4" /> Book Appt
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild className="gap-2 border-primary/20 hover:bg-primary/5">
            <Link href={`/ipd?patientId=${patient.id}`}>
              <BedDouble className="size-4 text-primary" /> Admit IPD
            </Link>
          </Button>
          <Button size="sm" asChild className="gap-2">
            <Link href={`/opd?patientId=${patient.id}`}>
              <Stethoscope className="size-4" /> Send to Consult
            </Link>
          </Button>
        </div>
      </div>

      {/* Patient Info Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-sm"><Calendar className="size-4 text-muted-foreground" /><span>{patient.dateOfBirth} ({age} years) - <span className="capitalize">{patient.gender}</span></span></div>
              <div className="flex items-center gap-2 text-sm"><Droplets className="size-4 text-muted-foreground" /><span>Blood Group: {patient.bloodGroup}</span></div>
              <div className="flex items-center gap-2 text-sm"><Phone className="size-4 text-muted-foreground" /><span>{patient.phone}</span></div>
              <div className="flex items-center gap-2 text-sm"><Mail className="size-4 text-muted-foreground" /><span>{patient.email}</span></div>
              <div className="flex items-center gap-2 text-sm"><MapPin className="size-4 text-muted-foreground" /><span>{patient.address}, {patient.city}</span></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-2 text-card-foreground">Emergency Contact</h3>
            <p className="text-sm">{patient.emergencyContact}</p>
            <p className="text-sm text-muted-foreground">{patient.emergencyPhone}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-2 text-card-foreground flex items-center gap-2"><Shield className="size-4" /> Insurance</h3>
            {patient.insuranceProvider ? (
              <>
                <p className="text-sm">{patient.insuranceProvider}</p>
                <p className="text-sm text-muted-foreground">Policy: {patient.insurancePolicyNumber}</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No insurance on file</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="appointments" className="w-full">
        <TabsList>
          <TabsTrigger value="appointments">Appointments ({appointments.length})</TabsTrigger>
          <TabsTrigger value="prescriptions">Prescriptions ({prescriptions.length})</TabsTrigger>
          <TabsTrigger value="lab">Lab Tests ({labTests.length})</TabsTrigger>
          <TabsTrigger value="billing">Billing ({invoices.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="appointments">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-mono text-xs">{a.appointmentId}</TableCell>
                      <TableCell>{a.doctorName}</TableCell>
                      <TableCell>{a.department}</TableCell>
                      <TableCell>{a.date}</TableCell>
                      <TableCell>{a.time}</TableCell>
                      <TableCell className="capitalize">{a.type.replace("-", " ")}</TableCell>
                      <TableCell><StatusBadge status={a.status} /></TableCell>
                    </TableRow>
                  ))}
                  {appointments.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">No appointments found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prescriptions">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Diagnosis</TableHead>
                    <TableHead>Medicines</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prescriptions.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{p.prescriptionId}</TableCell>
                      <TableCell>{p.doctorName}</TableCell>
                      <TableCell>{p.date}</TableCell>
                      <TableCell>{p.diagnosis}</TableCell>
                      <TableCell className="text-xs">{p.medicines.map((m) => m.medicineName).join(", ")}</TableCell>
                      <TableCell><StatusBadge status={p.status} /></TableCell>
                    </TableRow>
                  ))}
                  {prescriptions.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No prescriptions found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lab">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Test ID</TableHead>
                    <TableHead>Test Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Ordered</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {labTests.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-mono text-xs">{l.testId}</TableCell>
                      <TableCell>{l.testName}</TableCell>
                      <TableCell>{l.testCategory}</TableCell>
                      <TableCell><StatusBadge status={l.priority} /></TableCell>
                      <TableCell>{l.orderedAt}</TableCell>
                      <TableCell><StatusBadge status={l.status} /></TableCell>
                      <TableCell>${l.cost}</TableCell>
                    </TableRow>
                  ))}
                  {labTests.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">No lab tests found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-xs">{inv.invoiceId}</TableCell>
                      <TableCell>{inv.date}</TableCell>
                      <TableCell>{inv.items.length} items</TableCell>
                      <TableCell>${inv.total.toFixed(2)}</TableCell>
                      <TableCell>${inv.paidAmount.toFixed(2)}</TableCell>
                      <TableCell><StatusBadge status={inv.status} /></TableCell>
                    </TableRow>
                  ))}
                  {invoices.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No invoices found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
