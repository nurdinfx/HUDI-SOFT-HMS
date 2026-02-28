"use client"

import { useState, useMemo, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Plus, Search, BedDouble, LayoutDashboard, Building2, BarChart3, ListChecks } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { ipdApi, type IPDAdmission, type Bed, type Ward, type IPDAnalytics } from "@/lib/api"
import { BedDashboard } from "./bed-dashboard"
import { WardManagement } from "./ward-management"
import { IPDAnalyticsView } from "./ipd-analytics-view"
import { AdmissionDetailsModal } from "./admission-details"
import { AddAdmissionDialog } from "./add-admission-dialog"

interface IPDContentProps {
  admissions?: IPDAdmission[]
  beds?: Bed[]
  patients?: any[]
  doctors?: any[]
}

export function IPDContent({ admissions: initialAdmissions = [], beds: initialBeds = [], patients = [], doctors = [] }: IPDContentProps) {
  const searchParams = useSearchParams()
  const preSelectedPatientId = searchParams.get("patientId")

  const [admissions, setAdmissions] = useState<IPDAdmission[]>(initialAdmissions)
  const [beds, setBeds] = useState<Bed[]>(initialBeds)
  const [wardsData, setWardsData] = useState<Ward[]>([])
  const [analytics, setAnalytics] = useState<IPDAnalytics | null>(null)

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [wardFilter, setWardFilter] = useState("all")
  const [selectedAdmission, setSelectedAdmission] = useState<IPDAdmission | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  const refreshData = async () => {
    try {
      const [adm, bds, wrds, stats] = await Promise.all([
        ipdApi.getAdmissions(),
        ipdApi.getBeds(),
        ipdApi.getWards(),
        ipdApi.getAnalytics()
      ]);
      setAdmissions(adm);
      setBeds(bds);
      setWardsData(wrds);
      setAnalytics(stats);
    } catch (error) {
      console.error("Failed to refresh IPD data:", error);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const filteredAdmissions = useMemo(() => {
    return admissions.filter((a) => {
      const matchSearch =
        !search ||
        a.patientName.toLowerCase().includes(search.toLowerCase()) ||
        a.admissionId.toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === "all" || a.status === statusFilter
      const matchWard = wardFilter === "all" || a.ward === wardFilter
      return matchSearch && matchStatus && matchWard
    })
  }, [admissions, search, statusFilter, wardFilter])

  const wardNames = useMemo(() => [...new Set(beds.map((b) => b.ward))], [beds])
  const occupied = beds.filter((b) => b.status === "occupied").length
  const available = beds.filter((b) => b.status === "available").length

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Inpatient Department (IPD)"
        description={`${admissions.length} admissions · ${available} beds available`}
      />

      <Tabs defaultValue="admissions" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="admissions" className="gap-2">
            <ListChecks className="size-4" />
            Admissions
          </TabsTrigger>
          <TabsTrigger value="beds" className="gap-2">
            <BedDouble className="size-4" />
            Bed Dashboard
          </TabsTrigger>
          <TabsTrigger value="wards" className="gap-2">
            <Building2 className="size-4" />
            Wards
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="size-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="admissions" className="mt-6 flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                    <BedDouble className="size-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold">{beds.length}</p>
                    <p className="text-sm text-muted-foreground">Total Beds</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                    <BedDouble className="size-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold">{available}</p>
                    <p className="text-sm text-muted-foreground">Available</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                    <BedDouble className="size-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold">{occupied}</p>
                    <p className="text-sm text-muted-foreground">Occupied</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by patient or admission ID..."
                    className="pl-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="admitted">Admitted</SelectItem>
                    <SelectItem value="discharged">Discharged</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={wardFilter} onValueChange={setWardFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Ward" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Wards</SelectItem>
                    {wardNames.map((w) => (
                      <SelectItem key={w} value={w}>{w}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <AddAdmissionDialog
                  patients={patients}
                  doctors={doctors}
                  wards={wardsData}
                  beds={beds}
                  onSuccess={refreshData}
                  isOpen={isAddDialogOpen}
                  onOpenChange={setIsAddDialogOpen}
                  initialPatientId={preSelectedPatientId || undefined}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Admission ID</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Ward / Bed</TableHead>
                    <TableHead className="hidden md:table-cell">Admission Date</TableHead>
                    <TableHead className="hidden md:table-cell">Discharge Date</TableHead>
                    <TableHead>Diagnosis</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAdmissions.map((a) => (
                    <TableRow key={a.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedAdmission(a)}>
                      <TableCell className="font-mono text-xs">{a.admissionId}</TableCell>
                      <TableCell className="font-medium">{a.patientName}</TableCell>
                      <TableCell>{a.doctorName || "—"}</TableCell>
                      <TableCell>{a.ward} / {a.bedNumber}</TableCell>
                      <TableCell className="hidden md:table-cell">{a.admissionDate}</TableCell>
                      <TableCell className="hidden md:table-cell">{a.dischargeDate || "—"}</TableCell>
                      <TableCell className="max-w-[180px] truncate">{a.diagnosis || "—"}</TableCell>
                      <TableCell><StatusBadge status={a.status} /></TableCell>
                    </TableRow>
                  ))}
                  {filteredAdmissions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No admissions found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="beds" className="mt-6">
          <BedDashboard beds={beds} onRefresh={refreshData} />
        </TabsContent>

        <TabsContent value="wards" className="mt-6">
          <WardManagement wards={wardsData} onRefresh={refreshData} />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <IPDAnalyticsView analytics={analytics} />
        </TabsContent>
      </Tabs>

      <AdmissionDetailsModal
        admission={selectedAdmission}
        onClose={() => setSelectedAdmission(null)}
        onRefresh={refreshData}
      />
    </div>
  )
}
