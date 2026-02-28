"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { Search, FlaskConical, Clock, CheckCircle2, AlertTriangle, Beaker, FileText, Save, ArrowRight, Plus, Printer, Download, Eye, Check, X, ClipboardList, User, UserPlus, Filter, MoreVertical, LayoutDashboard, Database, AlertCircle, Barcode } from "lucide-react"
import { laboratoryApi, patientsApi, doctorsApi, type LabTest, type LabStats, type LabCatalogItem, type Patient, type Doctor } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { StatusBadge } from "@/components/shared/status-badge"
import { toast } from "sonner"
import { format } from "date-fns"

interface Props { initialLabTests: LabTest[] }

export function LaboratoryContent({ initialLabTests }: Props) {
  const [labTests, setLabTests] = useState<LabTest[]>(initialLabTests)
  const [stats, setStats] = useState<LabStats | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all") // all, opd, ipd
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("queue") // queue, catalog

  // Modals
  const [selectedTest, setSelectedTest] = useState<LabTest | null>(null)
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false)
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false)
  const [isResultModalOpen, setIsResultModalOpen] = useState(false)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false)

  // Result Form State
  const [formResults, setFormResults] = useState("")
  const [formNormalRange, setFormNormalRange] = useState("")
  const [formStatus, setFormStatus] = useState("")
  const [formCritical, setFormCritical] = useState(false)
  const [formNotes, setFormNotes] = useState("")

  // Collection Form State
  const [collectedBy, setCollectedBy] = useState("")
  const [specimenBarcode, setSpecimenBarcode] = useState("")

  const reportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Pre-load html2pdf script
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
    script.async = true
    document.head.appendChild(script)
  }, [])

  const handlePrint = () => {
    const originalTitle = document.title
    document.title = `Lab-Report-${selectedTest?.testId || 'Official'}`
    window.print()
    document.title = originalTitle
  }

  const handleDownload = () => {
    const element = document.getElementById('report-content')
    if (!element) return

    toast.info("Generating PDF... Please wait.")

    const startDownload = () => {
      const opt = {
        margin: [10, 10],
        filename: `Lab-Report-${selectedTest?.testId || 'Report'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };
      // @ts-ignore
      html2pdf().from(element).set(opt).save().then(() => {
        toast.success("PDF Downloaded successfully")
      }).catch((err: any) => {
        console.error("PDF Error:", err)
        toast.error("Failed to generate PDF. Trying system print...")
        handlePrint()
      });
    }

    // @ts-ignore
    if (typeof html2pdf !== 'undefined') {
      startDownload()
    } else {
      // If not yet loaded, load it now and then start
      const script = document.createElement('script')
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
      script.onload = startDownload
      document.head.appendChild(script)
    }
  }

  // New Order Form State
  const [catalog, setCatalog] = useState<LabCatalogItem[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [orderPatientId, setOrderPatientId] = useState("")
  const [orderDoctorId, setOrderDoctorId] = useState("")
  const [orderTestName, setOrderTestName] = useState("")
  const [orderPriority, setOrderPriority] = useState("normal")

  // Catalog Form State
  const [editingCatalogItem, setEditingCatalogItem] = useState<LabCatalogItem | null>(null)
  const [catalogForm, setCatalogForm] = useState({
    name: "",
    category: "",
    sampleType: "Blood",
    normalRange: "",
    cost: 0
  })

  const fetchStats = async () => {
    try {
      const s = await laboratoryApi.getStats()
      setStats(s)
    } catch (e) {
      console.error("Failed to fetch stats", e)
    }
  }

  const fetchCatalog = async () => {
    try {
      const cat = await laboratoryApi.getCatalog()
      setCatalog(cat)
    } catch (e) { }
  }

  useEffect(() => {
    fetchStats()
    fetchCatalog()
  }, [])

  const fetchDropdowns = async () => {
    try {
      const [pts, drs] = await Promise.all([
        patientsApi.getAll(),
        doctorsApi.getAll()
      ])
      setPatients(pts)
      setDoctors(drs)
    } catch (e) { }
  }

  const refreshData = async () => {
    try {
      const updatedTests = await laboratoryApi.getAll()
      setLabTests(updatedTests)
      fetchStats()
      fetchCatalog()
    } catch (e) { }
  }

  const handleSaveCatalogItem = async () => {
    try {
      if (editingCatalogItem) {
        await laboratoryApi.updateCatalogItem(editingCatalogItem.id, catalogForm)
        toast.success("Catalog item updated")
      } else {
        await laboratoryApi.createCatalogItem(catalogForm)
        toast.success("New test added to catalog")
      }
      setIsCatalogModalOpen(false)
      refreshData()
    } catch (e) {
      toast.error("Failed to save catalog item")
    }
  }

  const handleDeleteCatalogItem = async (id: string) => {
    if (!confirm("Are you sure you want to delete this test from the catalog?")) return
    try {
      await laboratoryApi.deleteCatalogItem(id)
      toast.success("Item deleted")
      refreshData()
    } catch (e) {
      toast.error("Failed to delete item")
    }
  }

  const openCatalogModal = (item?: LabCatalogItem) => {
    if (item) {
      setEditingCatalogItem(item)
      setCatalogForm({
        name: item.name,
        category: item.category,
        sampleType: item.sampleType,
        normalRange: item.normalRange || "",
        cost: item.cost
      })
    } else {
      setEditingCatalogItem(null)
      setCatalogForm({
        name: "",
        category: "",
        sampleType: "Blood",
        normalRange: "",
        cost: 0
      })
    }
    setIsCatalogModalOpen(true)
  }
  const filtered = useMemo(() => {
    return labTests.filter((l) => {
      const matchSearch = !search ||
        l.patientName.toLowerCase().includes(search.toLowerCase()) ||
        l.testId.toLowerCase().includes(search.toLowerCase()) ||
        l.testName.toLowerCase().includes(search.toLowerCase()) ||
        l.patientId.toLowerCase().includes(search.toLowerCase())

      const matchStatus = statusFilter === "all" || l.status === statusFilter
      const matchType = typeFilter === "all" ||
        (typeFilter === "ipd" ? !!l.admissionId : !l.admissionId)

      return matchSearch && matchStatus && matchType
    })
  }, [labTests, search, statusFilter, typeFilter])

  const handleOpenResult = (test: LabTest) => {
    setSelectedTest(test)
    setFormResults(test.results || "")
    setFormNormalRange(test.normalRange || "")
    setFormStatus(test.status)
    setFormCritical(test.criticalFlag || false)
    setFormNotes(test.clinicalNotes || "")
    setIsResultModalOpen(true)
  }

  const handleOpenCollect = (test: LabTest) => {
    setSelectedTest(test)
    setCollectedBy("")
    setSpecimenBarcode(`BC-${test.testId}`)
    setIsCollectModalOpen(true)
  }

  const handleCollectSubmit = async () => {
    if (!selectedTest) return
    setLoading(true)
    try {
      await laboratoryApi.collectSample(selectedTest.id, { collectedBy, barcode: specimenBarcode })
      toast.success("Sample collected successfully")
      setIsCollectModalOpen(false)
      refreshData()
    } catch (e) {
      toast.error("Failed to record collection")
    } finally {
      setLoading(false)
    }
  }

  const handleResultSubmit = async () => {
    if (!selectedTest) return
    setLoading(true)
    try {
      await laboratoryApi.update(selectedTest.id, {
        status: formStatus,
        results: formResults,
        normalRange: formNormalRange,
        criticalFlag: formCritical,
        clinicalNotes: formNotes,
        completedAt: formStatus === "completed" ? new Date().toISOString() : undefined
      })
      toast.success("Results updated successfully")
      setIsResultModalOpen(false)
      refreshData()
    } catch (e) {
      toast.error("Failed to update results")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateOrder = async () => {
    if (!orderPatientId || !orderTestName) {
      toast.error("Patient and Test are required")
      return
    }
    setLoading(true)
    try {
      const item = catalog.find(c => c.name === orderTestName)
      await laboratoryApi.create({
        patientId: orderPatientId,
        doctorId: orderDoctorId,
        testName: orderTestName,
        testCategory: item?.category || "General",
        sampleType: item?.sampleType || "Blood",
        priority: orderPriority,
        cost: item?.cost || 0
      })
      toast.success("Lab order created successfully")
      setIsOrderModalOpen(false)
      refreshData()
    } catch (e) {
      toast.error("Failed to create order")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-primary/10 pb-6">
        <PageHeader title="Laboratory Management" description="Manage diagnostic investigations, samples, and official reports" />
        <div className="flex gap-2">
          <Button variant={activeTab === 'queue' ? 'default' : 'outline'} className="rounded-xl h-12 px-6 font-bold" onClick={() => setActiveTab('queue')}>
            <ClipboardList className="size-4 mr-2" />
            Tests Queue
          </Button>
          <Button variant={activeTab === 'catalog' ? 'default' : 'outline'} className="rounded-xl h-12 px-6 font-bold" onClick={() => setActiveTab('catalog')}>
            <Database className="size-4 mr-2" />
            Master Catalog
          </Button>
          {activeTab === 'queue' ? (
            <Button className="rounded-xl h-12 px-8 font-black shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]" onClick={() => { fetchDropdowns(); setIsOrderModalOpen(true); }}>
              <Plus className="size-5 mr-2" />
              NEW LAB ORDER
            </Button>
          ) : (
            <Button className="rounded-xl h-12 px-8 font-black shadow-xl shadow-primary/20 transition-all bg-emerald-600 hover:bg-emerald-700 hover:scale-[1.02] active:scale-[0.98]" onClick={() => openCatalogModal()}>
              <Plus className="size-5 mr-2" />
              ADD NEW TEST
            </Button>
          )}
        </div>
      </div>

      {/* DASHBOARD STATS */}
      {activeTab === 'queue' ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard title="Total Today" value={stats?.totalToday || 0} icon={ClipboardList} iconClassName="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
            <StatCard title="Pending" value={stats?.pending || 0} icon={Clock} iconClassName="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" />
            <StatCard title="In Progress" value={stats?.inProgress || 0} icon={Beaker} iconClassName="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400" />
            <StatCard title="Completed" value={stats?.completed || 0} icon={CheckCircle2} iconClassName="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
            <StatCard title="Critical Flags" value={stats?.critical || 0} icon={AlertTriangle} iconClassName="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" />
            <StatCard title="Revenue (Today)" value={`$${stats?.revenueToday || 0}`} icon={LayoutDashboard} iconClassName="bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400" />
          </div>

          <Card className="border-none shadow-xl bg-white/50 backdrop-blur-sm">
            <CardHeader className="pb-3 px-6 pt-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <Database className="size-5 text-primary" />
                    Laboratory Investigation Queue
                  </CardTitle>
                  <CardDescription>Monitor and process patient diagnostic requests</CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="relative w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input placeholder="Patient name, ID, or Order ID..." className="pl-10 h-10 rounded-xl" value={search} onChange={(e) => setSearch(e.target.value)} />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px] h-10 rounded-xl"><SelectValue placeholder="All Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Investigations</SelectItem>
                      <SelectItem value="ordered">Pending (Ordered)</SelectItem>
                      <SelectItem value="sample-collected">Sample Collected</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[180px] h-10 rounded-xl"><SelectValue placeholder="All Patients" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Patients</SelectItem>
                      <SelectItem value="opd">Outpatient (OPD)</SelectItem>
                      <SelectItem value="ipd">Inpatient (IPD)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="pl-6">Lab ID</TableHead>
                    <TableHead>Patient Details</TableHead>
                    <TableHead>Investigation</TableHead>
                    <TableHead className="hidden md:table-cell">Source</TableHead>
                    <TableHead className="hidden md:table-cell text-center">Priority</TableHead>
                    <TableHead className="hidden md:table-cell">Ordered By</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="pr-6 text-right">Clinical Workflow</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center text-muted-foreground space-y-2">
                          <div className="p-4 bg-muted rounded-full">
                            <FlaskConical className="size-8 opacity-20" />
                          </div>
                          <p className="text-sm font-medium">No laboratory records found matching criteria.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filtered.map((test) => (
                    <TableRow key={test.id} className="group hover:bg-muted/20 transition-colors">
                      <TableCell className="pl-6">
                        <div className="flex flex-col">
                          <span className="font-bold text-sm text-primary">{test.testId}</span>
                          <span className="text-[10px] text-muted-foreground">{format(new Date(test.orderedAt), 'MMM dd, HH:mm')}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-sm">{test.patientName}</span>
                          <span className="text-[10px] text-muted-foreground font-mono uppercase">{test.patientId}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <p className="font-medium text-sm">{test.testName}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className="text-[9px] font-bold h-4 px-1">{test.testCategory}</Badge>
                            <span className="text-[10px] text-muted-foreground">{test.sampleType}</span>
                            {test.criticalFlag && (
                              <Badge className="bg-red-500 text-white text-[9px] h-4 animate-pulse">CRITICAL</Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex flex-col">
                          <span className={`text-xs font-bold ${test.admissionId ? 'text-blue-600' : 'text-slate-500'}`}>
                            {test.admissionId ? 'Bedside / IPD' : 'Outpatient / OPD'}
                          </span>
                          {test.admissionId && (
                            <span className="text-[10px] text-muted-foreground">
                              {test.ward} · {test.bedNumber}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-center">
                        <StatusBadge status={test.priority} />
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <User className="size-3 text-muted-foreground" />
                          <span className="text-xs">{test.doctorName || 'Self/Walk-in'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={test.status} />
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <div className="flex justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                          {test.status === 'ordered' && (
                            <Button variant="default" size="sm" className="h-8 rounded-lg bg-blue-600 hover:bg-blue-700" onClick={() => handleOpenCollect(test)}>
                              <Barcode className="size-3.5 mr-1" /> Collect
                            </Button>
                          )}

                          {(test.status === 'sample-collected' || test.status === 'in-progress') && (
                            <Button variant="default" size="sm" className="h-8 rounded-lg bg-amber-600 hover:bg-amber-700" onClick={() => handleOpenResult(test)}>
                              <FileText className="size-3.5 mr-1" /> Result
                            </Button>
                          )}

                          {test.status === 'completed' && (
                            <>
                              <Button variant="outline" size="sm" className="h-8 rounded-lg" onClick={() => { setSelectedTest(test); setIsReportModalOpen(true) }}>
                                <Eye className="size-3.5 mr-1" /> View
                              </Button>
                              <Button variant="outline" size="sm" className="h-8 rounded-lg border-primary/20 text-primary">
                                <Printer className="size-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="border-none shadow-2xl shadow-slate-200/50 rounded-3xl overflow-hidden bg-white/50 backdrop-blur-sm">
          <CardHeader className="bg-slate-50/50 p-8 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">Investigation Master Catalog</CardTitle>
              <CardDescription className="font-medium text-slate-500">Configure factory settings for all diagnostic tests available in the hospital</CardDescription>
            </div>
            <div className="relative w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input placeholder="Search catalog..." className="pl-12 h-12 rounded-2xl bg-white border-slate-100 font-bold focus:ring-primary/20" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent border-slate-100">
                  <TableHead className="h-14 font-black text-slate-400 uppercase tracking-widest text-[10px] pl-8">Investigation Name</TableHead>
                  <TableHead className="h-14 font-black text-slate-400 uppercase tracking-widest text-[10px]">Category</TableHead>
                  <TableHead className="h-14 font-black text-slate-400 uppercase tracking-widest text-[10px]">Sample Type</TableHead>
                  <TableHead className="h-14 font-black text-slate-400 uppercase tracking-widest text-[10px]">Normal Range</TableHead>
                  <TableHead className="h-14 font-black text-slate-400 uppercase tracking-widest text-[10px] text-right pr-8">Unit Cost</TableHead>
                  <TableHead className="h-14 text-right pr-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {catalog.filter(c => c.name.toLowerCase().includes(search.toLowerCase())).map((item) => (
                  <TableRow key={item.id} className="group hover:bg-slate-50/80 transition-all border-slate-100">
                    <TableCell className="py-6 pl-8">
                      <p className="font-black text-slate-900 uppercase tracking-tight">{item.name}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="rounded-lg border-primary/20 text-primary uppercase text-[9px] font-black">{item.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-2 text-xs font-bold text-slate-600">
                        <Beaker className="size-3 text-slate-400" />
                        {item.sampleType}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200">{item.normalRange || 'N/A'}</span>
                    </TableCell>
                    <TableCell className="text-right font-black text-slate-900 tracking-tight pr-8">
                      {item.cost?.toLocaleString()} <span className="text-[10px] text-slate-400">USD</span>
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="size-8 rounded-lg hover:bg-white hover:text-primary shadow-sm border border-transparent hover:border-slate-100" onClick={() => openCatalogModal(item)}>
                          <ClipboardList className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="size-8 rounded-lg hover:bg-red-50 hover:text-red-600 shadow-sm border border-transparent hover:border-red-100" onClick={() => handleDeleteCatalogItem(item.id)}>
                          <X className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* MODAL: NEW LAB ORDER */}
      <Dialog open={isOrderModalOpen} onOpenChange={setIsOrderModalOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Plus className="size-5 text-primary" />
              Place New Laboratory Order
            </DialogTitle>
            <DialogDescription>Select patient and required investigations to start order</DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Select Patient</Label>
                <Select value={orderPatientId} onValueChange={setOrderPatientId}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="Search Patient..." />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName} ({p.patientId})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ordering Doctor</Label>
                <Select value={orderDoctorId} onValueChange={setOrderDoctorId}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="Select Physician..." />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Investigation / Test</Label>
              <Select value={orderTestName} onValueChange={setOrderTestName}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Choose Laboratory Test..." />
                </SelectTrigger>
                <SelectContent>
                  {catalog.map(c => (
                    <SelectItem key={c.id} value={c.name}>{c.name} - {c.category} (${c.cost})</SelectItem>
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
                    className={`flex-1 h-10 rounded-xl capitalize font-bold text-xs ${orderPriority === p ? (p === 'normal' ? 'bg-blue-600' : p === 'urgent' ? 'bg-amber-600' : 'bg-red-600') : ''}`}
                    onClick={() => setOrderPriority(p)}
                  >
                    {p}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" className="rounded-xl h-11 px-6 font-bold" onClick={() => setIsOrderModalOpen(false)}>Cancel</Button>
            <Button className="rounded-xl h-11 px-8 font-bold shadow-lg shadow-primary/20" onClick={handleCreateOrder} disabled={loading}>
              {loading ? <Clock className="size-4 animate-spin mr-2" /> : <Save className="size-4 mr-2" />}
              Confirm & Create Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: SAMPLE COLLECTION */}
      <Dialog open={isCollectModalOpen} onOpenChange={setIsCollectModalOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Barcode className="size-5 text-blue-600" />
              Sample Collection Protocol
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                <Beaker className="size-6" />
              </div>
              <div>
                <p className="text-xs uppercase font-bold text-blue-600">Specimen Required</p>
                <p className="font-bold text-lg">{selectedTest?.testName}</p>
                <Badge variant="outline" className="bg-white border-blue-200 text-[10px] mt-1">{selectedTest?.sampleType}</Badge>
              </div>
            </div>

            <Separator className="bg-blue-100" />

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-blue-700">Technician Name</Label>
                <Input placeholder="Collected by..." value={collectedBy} onChange={e => setCollectedBy(e.target.value)} className="rounded-xl h-10 border-blue-200 focus:ring-blue-500" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-blue-700">Manual Barcode (Optional)</Label>
                <Input placeholder="Scan or enter barcode" value={specimenBarcode} onChange={e => setSpecimenBarcode(e.target.value)} className="rounded-xl h-10 border-blue-200" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setIsCollectModalOpen(false)}>Abort</Button>
            <Button className="rounded-xl bg-blue-600 hover:bg-blue-700" onClick={handleCollectSubmit} disabled={loading}>
              Record Collection & Mark In-Progress
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: RESULT ENTRY */}
      <Dialog open={isResultModalOpen} onOpenChange={setIsResultModalOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="size-5 text-amber-600" />
              Clinical Lab Findings
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Investigation</p>
                <p className="font-bold">{selectedTest?.testName}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Technician</p>
                <p className="font-medium text-sm">{selectedTest?.sampleCollectedBy || '-'}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center justify-between">
                  <span>Status Update</span>
                  <StatusBadge status={formStatus} />
                </Label>
                <Select value={formStatus} onValueChange={setFormStatus}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sample-collected">Sample Collected</SelectItem>
                    <SelectItem value="in-progress">Analyzing (In Progress)</SelectItem>
                    <SelectItem value="completed">Completed / Dispatched</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Test Results / Values</Label>
                  <Input
                    placeholder="Enter findings..."
                    value={formResults}
                    onChange={e => setFormResults(e.target.value)}
                    className="h-11 rounded-xl font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Ref / Normal Range</Label>
                  <Input
                    placeholder="e.g. 13.5 - 17.5"
                    value={formNormalRange}
                    onChange={e => setFormNormalRange(e.target.value)}
                    className="h-11 rounded-xl font-mono text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Clinic Notes / Interpretation</Label>
                <Textarea
                  placeholder="Additional observations..."
                  className="rounded-xl min-h-[80px]"
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-between p-3 border-2 border-dashed border-red-100 rounded-xl bg-red-50/30">
                <div className="flex items-center gap-2">
                  <AlertCircle className={`size-5 ${formCritical ? 'text-red-600 animate-pulse' : 'text-muted-foreground opacity-30'}`} />
                  <div>
                    <p className="text-xs font-bold">Critical Result Flag</p>
                    <p className="text-[10px] text-muted-foreground">Notify physician immediately if enabled</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={formCritical ? 'destructive' : 'outline'}
                  className="h-8 rounded-lg text-[10px] font-bold px-3"
                  onClick={() => setFormCritical(!formCritical)}
                >
                  {formCritical ? 'ACTIVE' : 'NOT CRITICAL'}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" className="rounded-xl h-11 px-6 font-bold" onClick={() => setIsResultModalOpen(false)}>Discard</Button>
            <Button className="rounded-xl h-11 px-8 font-bold bg-amber-600 hover:bg-amber-700 shadow-lg shadow-amber-200/50" onClick={handleResultSubmit} disabled={loading}>
              {loading ? <Clock className="size-4 animate-spin mr-2" /> : <Save className="size-4 mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: REPORT PREVIEW */}
      <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
        <DialogContent
          className="max-h-[96vh] rounded-2xl p-0 overflow-hidden border-none shadow-2xl flex flex-col"
          style={{ maxWidth: '1200px', width: '95vw' }}
        >
          <style>{`
            @media print {
              @page { size: A4; margin: 0; }
              body * { visibility: hidden !important; pointer-events: none; }
              .printable-area, .printable-area * { visibility: visible !important; }
              .printable-area {
                position: fixed;
                left: 0;
                top: 0;
                width: 210mm;
                height: 297mm;
                padding: 15mm;
                background: white !important;
                z-index: 9999;
                box-shadow: none !important;
                border: none !important;
                color-adjust: exact;
                -webkit-print-color-adjust: exact;
              }
              .no-print { display: none !important; }
              /* Ensure transparency etc don't break print */
              .bg-primary { background-color: #0f172a !important; color: white !important; -webkit-print-color-adjust: exact; }
              .text-white { color: white !important; }
            }
          `}</style>

          <ScrollArea className="flex-1">
            <div id="report-content" className="printable-area">
              <div className="bg-primary p-8 text-white relative">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="size-10 bg-white rounded-xl flex items-center justify-center">
                        <FlaskConical className="size-6 text-primary" />
                      </div>
                      <h2 className="text-2xl font-bold tracking-tight">Clinical Diagnostic Report</h2>
                    </div>
                    <p className="text-sm opacity-80">Reference ID: <span className="font-mono font-bold tracking-wider">{selectedTest?.testId}</span></p>
                    <p className="text-sm opacity-80">Date Issued: {selectedTest?.completedAt ? format(new Date(selectedTest.completedAt), 'PPP p') : '-'}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-xl font-bold tracking-tighter uppercase">Official Document</p>
                    <p className="text-xs opacity-60">Verified Laboratory Record</p>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-white space-y-8">
                <div className="grid grid-cols-2 gap-8 py-4 px-6 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Patient Details</Label>
                      <p className="font-bold text-lg text-slate-800">{selectedTest?.patientName}</p>
                      <p className="text-sm text-slate-500 font-mono tracking-tight uppercase">PID: {selectedTest?.patientId}</p>
                    </div>
                  </div>
                  <div className="space-y-4 text-right">
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Requested By</Label>
                      <p className="font-bold text-lg text-slate-800">Dr. {selectedTest?.doctorName || 'General Staff'}</p>
                      <p className="text-sm text-slate-500">Department: {selectedTest?.testCategory}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h4 className="font-bold text-slate-900 flex items-center gap-2">
                      <ClipboardList className="size-4 text-primary" />
                      Investigation Findings
                    </h4>
                    <Badge className={`${selectedTest?.criticalFlag ? 'bg-red-500' : 'bg-emerald-500'} text-white text-[10px] font-bold px-3`}>
                      {selectedTest?.criticalFlag ? 'CRITICAL ALERT' : 'NORMAL RANGE'}
                    </Badge>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/50">
                        <TableHead className="font-bold text-slate-700">Test Parameter</TableHead>
                        <TableHead className="font-bold text-slate-700 text-center">Result</TableHead>
                        <TableHead className="font-bold text-slate-700 text-right">Biological Reference Range</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow className="border-none">
                        <TableCell className="font-bold text-slate-800 py-6">{selectedTest?.testName}</TableCell>
                        <TableCell className={`text-center py-6 font-mono text-lg font-black ${selectedTest?.criticalFlag ? 'text-red-600' : 'text-slate-900'}`}>{selectedTest?.results}</TableCell>
                        <TableCell className="text-right py-6 text-slate-600 font-mono text-sm">{selectedTest?.normalRange || 'N/A'}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                <div className="space-y-3 p-4 bg-amber-50/30 rounded-xl border border-amber-100">
                  <Label className="text-[10px] uppercase font-black text-amber-600 flex items-center gap-2 tracking-widest">
                    Interpreting Pathologist Notes
                  </Label>
                  <p className="text-sm text-slate-700 leading-relaxed italic">
                    {selectedTest?.clinicalNotes || "No specific interpretations provided for this investigation."}
                  </p>
                </div>

                <div className="flex justify-between items-end pt-8 border-t">
                  <div className="text-[9px] text-slate-400 max-w-sm italic">
                    Disclaimer: This report is electronically generated and requires medical correlation. Please consult with your physician for clinical interpretation.
                  </div>
                  <div className="text-right space-y-2">
                    <div className="h-0.5 w-32 bg-slate-200 ml-auto mb-1"></div>
                    <p className="font-bold text-sm text-slate-800 uppercase tracking-tighter">Authorized Signature</p>
                    <p className="text-[10px] text-slate-400">Computer Generated Hash: {selectedTest?.id.slice(0, 8)}</p>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="bg-slate-50 p-6 flex justify-between gap-4 border-t no-print">
            <Button variant="ghost" className="rounded-xl h-12 px-8 font-black text-slate-400 hover:text-slate-900 uppercase tracking-widest text-xs" onClick={() => setIsReportModalOpen(false)}>Close Preview</Button>
            <div className="flex gap-3">
              <Button variant="outline" className="rounded-xl h-12 px-8 font-black border-2 border-slate-200 shadow-sm transition-all hover:bg-white hover:border-slate-300 uppercase tracking-widest text-xs" onClick={handleDownload}>
                <Download className="size-4 mr-2" />
                Download PDF
              </Button>
              <Button className="rounded-xl h-12 px-10 font-black shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] uppercase tracking-widest text-xs" onClick={handlePrint}>
                <Printer className="size-4 mr-2" />
                Print Report
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MASTER CATALOG MODAL */}
      <Dialog open={isCatalogModalOpen} onOpenChange={setIsCatalogModalOpen}>
        <DialogContent className="max-w-xl p-0 overflow-hidden border-none rounded-3xl shadow-2xl">
          <DialogHeader className="p-8 bg-slate-900 text-white">
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter italic">
              {editingCatalogItem ? 'Update Investigation' : 'Configure New Test'}
            </DialogTitle>
            <DialogDescription className="text-slate-400 font-medium tracking-tight">
              {editingCatalogItem ? `Modify factory settings for ${editingCatalogItem.name}` : 'Define a new diagnostic investigation to be available for the entire clinical team'}
            </DialogDescription>
          </DialogHeader>
          <div className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="col-span-2 space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Investigation Name</Label>
                <Input placeholder="e.g. Complete Blood Count (CBC)" className="h-12 rounded-2xl border-slate-200 font-bold focus:ring-primary/20" value={catalogForm.name} onChange={(e) => setCatalogForm({ ...catalogForm, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Category</Label>
                <Select value={catalogForm.category} onValueChange={(v) => setCatalogForm({ ...catalogForm, category: v })}>
                  <SelectTrigger className="h-12 rounded-2xl border-slate-200 font-bold">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-slate-200">
                    {['Hematology', 'Biochemistry', 'Microbiology', 'Serology', 'Endocrinology', 'Clinical Pathology', 'Radiology', 'Molecular Biology'].map(c => (
                      <SelectItem key={c} value={c} className="font-bold py-3 rounded-xl">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sample Type</Label>
                <Input placeholder="e.g. EDTA Blood, Urine" className="h-12 rounded-2xl border-slate-200 font-bold focus:ring-primary/20" value={catalogForm.sampleType} onChange={(e) => setCatalogForm({ ...catalogForm, sampleType: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Normal Range (Ref)</Label>
                <Input placeholder="e.g. 13.5 - 17.5 g/dL" className="h-12 rounded-2xl border-slate-200 font-bold focus:ring-primary/20" value={catalogForm.normalRange} onChange={(e) => setCatalogForm({ ...catalogForm, normalRange: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Standard Cost (USD)</Label>
                <Input type="number" className="h-12 rounded-2xl border-slate-200 font-bold focus:ring-primary/20" value={catalogForm.cost} onChange={(e) => setCatalogForm({ ...catalogForm, cost: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
          </div>
          <DialogFooter className="p-8 bg-slate-50 flex gap-3 sm:justify-end">
            <Button variant="ghost" className="rounded-2xl h-12 px-8 font-black text-slate-400 hover:text-slate-900" onClick={() => setIsCatalogModalOpen(false)}>CANCEL</Button>
            <Button className="rounded-2xl h-12 px-10 font-black shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]" onClick={handleSaveCatalogItem}>
              <Save className="size-5 mr-2" />
              {editingCatalogItem ? 'UPDATE INVESTIGATION' : 'SAVE TO MASTER CATALOG'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
