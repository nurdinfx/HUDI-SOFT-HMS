"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import {
  Search,
  Stethoscope,
  Clock,
  DollarSign,
  Calendar,
  Plus,
  Users,
  Activity,
  Briefcase,
  ChevronRight,
  MoreVertical,
  Edit,
  Trash2,
  PieChart
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { doctorsApi, type Doctor, type DoctorStats } from "@/lib/api"
import { DoctorForm } from "./doctor-form"
import { DoctorDetails } from "./doctor-details"

interface Props {
  doctors?: Doctor[]
  onRefresh: () => void
}

export function DoctorsContent({ doctors = [], onRefresh }: Props) {
  const [activeTab, setActiveTab] = useState("overview")
  const [search, setSearch] = useState("")
  const [deptFilter, setDeptFilter] = useState("all")
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null)
  const [viewingDoctor, setViewingDoctor] = useState<Doctor | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [stats, setStats] = useState<DoctorStats | null>(null)

  const list = Array.isArray(doctors) ? doctors : []

  useEffect(() => {
    doctorsApi.getStats().then(setStats).catch(console.error)
  }, [list])

  const departments = useMemo(() => [...new Set(list.map((d) => d.department))], [list])

  const filtered = useMemo(() => {
    return list.filter((d) => {
      const matchSearch = !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.specialization.toLowerCase().includes(search.toLowerCase())
      const matchDept = deptFilter === "all" || d.department === deptFilter
      return matchSearch && matchDept
    })
  }, [list, search, deptFilter])

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this doctor? This action cannot be undone.")) {
      try {
        await doctorsApi.delete(id)
        onRefresh()
      } catch (error) {
        console.error("Failed to delete doctor:", error)
      }
    }
  }

  if (viewingDoctor) {
    return (
      <DoctorDetails
        doctor={viewingDoctor}
        onBack={() => setViewingDoctor(null)}
        onEdit={() => {
          setEditingDoctor(viewingDoctor)
          setViewingDoctor(null)
        }}
      />
    )
  }

  if (editingDoctor || isAdding) {
    return (
      <div className="animate-in fade-in duration-300">
        <DoctorForm
          doctor={editingDoctor || undefined}
          onComplete={() => {
            setEditingDoctor(null)
            setIsAdding(false)
            onRefresh()
          }}
          onCancel={() => {
            setEditingDoctor(null)
            setIsAdding(false)
          }}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <PageHeader
        title="Doctors Management"
        description="Oversee hospital staff, schedules, and clinical performance."
      >
        <Button onClick={() => setIsAdding(true)} className="gap-2 shadow-lg hover:shadow-xl transition-all">
          <Plus className="size-4" />
          Register Doctor
        </Button>
      </PageHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-transparent border-b rounded-none h-12 w-full justify-start gap-8 p-0 mb-6">
          <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0">Overview</TabsTrigger>
          <TabsTrigger value="staff" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0">Staff List</TabsTrigger>
          <TabsTrigger value="departments" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0">Departments</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-0 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-primary/5 border-primary/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <Users className="size-5 text-primary" />
                  <span className="text-2xl font-bold">{stats?.totalDoctors || 0}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2 font-medium">Total Staff</p>
              </CardContent>
            </Card>
            <Card className="bg-emerald-500/5 border-emerald-500/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <Activity className="size-5 text-emerald-600" />
                  <span className="text-2xl font-bold">{stats?.availableNow || 0}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2 font-medium">Available Now</p>
              </CardContent>
            </Card>
            <Card className="bg-rose-500/5 border-rose-500/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <Briefcase className="size-5 text-rose-600" />
                  <span className="text-2xl font-bold">{stats?.onLeave || 0}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2 font-medium">On Leave</p>
              </CardContent>
            </Card>
            <Card className="bg-amber-500/5 border-amber-500/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <PieChart className="size-5 text-amber-600" />
                  <span className="text-2xl font-bold">{departments.length}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2 font-medium">Departments</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Recent Staff Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {list.slice(0, 4).map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setViewingDoctor(doc)}>
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-xs">
                          {doc.name.replace("Dr. ", "").split(" ").map(n => n[0]).join("")}
                        </div>
                        <div>
                          <p className="text-sm font-bold">{doc.name}</p>
                          <p className="text-[10px] text-muted-foreground">{doc.specialization} • {doc.department}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xs font-bold text-emerald-600">High</p>
                          <p className="text-[10px] text-muted-foreground">Rating</p>
                        </div>
                        <ChevronRight className="size-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start gap-2" onClick={() => setIsAdding(true)}>
                  <Plus className="size-4" />
                  Add New Staff
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Calendar className="size-4" />
                  Manage Duty Roster
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <PieChart className="size-4" />
                  Export HR Report
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="staff" className="mt-0 space-y-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input placeholder="Search staff members..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <Select value={deptFilter} onValueChange={setDeptFilter}>
                  <SelectTrigger className="w-[180px]"><SelectValue placeholder="Department" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((doc) => (
              <Card key={doc.id} className="group hover:shadow-xl transition-all duration-300 border-transparent hover:border-primary/20">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary font-bold text-lg">
                      {doc.name.replace("Dr. ", "").split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-bold text-card-foreground truncate cursor-pointer hover:text-primary transition-colors" onClick={() => setViewingDoctor(doc)}>
                          {doc.name}
                        </h3>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => setViewingDoctor(doc)}>
                              <Users className="mr-2 size-4" /> Profile View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEditingDoctor(doc)}>
                              <Edit className="mr-2 size-4" /> Edit Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/appointments?doctorId=${doc.id}`}>
                                <Calendar className="mr-2 size-4" /> Schedule Appointment
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-rose-500" onClick={() => handleDelete(doc.id)}>
                              <Trash2 className="mr-2 size-4" /> Delete Access
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <p className="text-sm text-primary font-medium">{doc.specialization}</p>
                      <StatusBadge status={doc.status} className="mt-1" />
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t grid grid-cols-2 gap-y-3 gap-x-1">
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                      <Stethoscope className="size-3 text-primary" />
                      <span className="truncate">{doc.department}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                      <Clock className="size-3 text-primary" />
                      <span>{doc.experience} Yr Exp</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                      <DollarSign className="size-3 text-primary" />
                      <span>${doc.consultationFee} Fee</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                      <Calendar className="size-3 text-primary" />
                      <span className="truncate">{doc.availableDays.slice(0, 3).join(",")}...</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-20 bg-muted/20 rounded-xl border border-dashed">
              <Users className="size-12 mx-auto text-muted-foreground opacity-20 mb-4" />
              <p className="text-muted-foreground font-medium">No doctors found matching your criteria.</p>
              <Button variant="link" onClick={() => { setSearch(""); setDeptFilter("all") }}>Clear filters</Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="departments">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {departments.map(dept => {
              const docCount = list.filter(d => d.department === dept).length;
              return (
                <Card key={dept}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-bold">{dept}</CardTitle>
                    <CardDescription>{docCount} Specializing Physicians</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex -space-x-2 overflow-hidden mb-4">
                      {list.filter(d => d.department === dept).slice(0, 5).map(d => (
                        <div key={d.id} className="inline-block size-8 rounded-full ring-2 ring-background bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                          {d.name.split(" ").slice(-1)[0][0]}
                        </div>
                      ))}
                    </div>
                    <Button variant="ghost" className="w-full justify-between text-primary font-bold" onClick={() => {
                      setDeptFilter(dept);
                      setActiveTab("staff");
                    }}>
                      View Team
                      <ChevronRight className="size-4" />
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
