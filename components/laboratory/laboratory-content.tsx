"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { Search, FlaskConical, Clock, CheckCircle2, AlertTriangle, Beaker, FileText, Save, ArrowRight, Plus, Printer, Download, Eye, Check, X, ClipboardList, User, UserPlus, Filter, MoreVertical, LayoutDashboard, Database, AlertCircle, Barcode } from "lucide-react"
import { laboratoryApi, patientsApi, doctorsApi, settingsApi, type LabTest, type LabStats, type LabCatalogItem, type Patient, type Doctor, type HospitalSettings } from "@/lib/api"
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
import { useAuth } from "@/lib/auth-context"

interface Props { initialLabTests: LabTest[] }

interface LabReportItem {
  parameter: string
  value: string
  range: string
}

interface ParsedLabReport {
  items: LabReportItem[]
  patientReference: string
}

const defaultHospitalSettings: HospitalSettings = {
  name: "HUDI-SOFT HMS",
  tagline: "Clinical Laboratory Services",
  address: "",
  phone: "",
  email: "",
  website: "",
  currency: "USD",
  taxRate: 0,
}

function buildFallbackReportItem(test: LabTest | null): LabReportItem {
  return {
    parameter: test?.testName || "",
    value: "",
    range: test?.normalRange || "",
  }
}

function parseLabReport(test: LabTest | null): ParsedLabReport {
  if (!test?.results) {
    return {
      items: [buildFallbackReportItem(test)],
      patientReference: test?.patientId || "",
    }
  }

  try {
    const parsed = JSON.parse(test.results)

    if (Array.isArray(parsed)) {
      return {
        items: parsed,
        patientReference: test.patientId || "",
      }
    }

    if (parsed && typeof parsed === "object") {
      const parsedItems = Array.isArray(parsed.items)
        ? parsed.items
        : [{ parameter: test.testName, value: test.results, range: test.normalRange || "" }]

      return {
        items: parsedItems,
        patientReference: typeof parsed.patientReference === "string" ? parsed.patientReference : (test.patientId || ""),
      }
    }
  } catch (error) {
    // Fall back to legacy plain-text results.
  }

  return {
    items: [{ parameter: test.testName, value: test.results, range: test.normalRange || "" }],
    patientReference: test.patientId || "",
  }
}

function summarizeLabResults(items: LabReportItem[]) {
  const meaningfulItems = items.filter((item) => item.parameter.trim() || item.value.trim())

  if (meaningfulItems.length === 0) {
    return "No finalized result"
  }

  return meaningfulItems
    .slice(0, 2)
    .map((item) => item.value || item.parameter || "Result")
    .join(" • ")
}

function formatDisplayDate(value?: string, pattern = "PPP") {
  if (!value) return "Not available"
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? "Not available" : format(parsed, pattern)
}

function calculateAge(dateOfBirth?: string) {
  if (!dateOfBirth) return "N/A"
  const dob = new Date(dateOfBirth)
  if (Number.isNaN(dob.getTime())) return "N/A"

  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const monthDifference = today.getMonth() - dob.getMonth()
  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < dob.getDate())) {
    age -= 1
  }

  return `${age} yrs`
}

function formatGender(value?: string) {
  if (!value) return "Not available"
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
}

export function LaboratoryContent({ initialLabTests }: Props) {
  const [labTests, setLabTests] = useState<LabTest[]>(initialLabTests)
  const [stats, setStats] = useState<LabStats | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all") // all, opd, ipd
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("queue") // queue, catalog
  const { user } = useAuth()
  const isDoctor = user?.role === 'doctor'
  const isReceptionist = user?.role === 'receptionist'

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
  const [resultItems, setResultItems] = useState<LabReportItem[]>([
    { parameter: "", value: "", range: "" }
  ])
  const [formPatientReference, setFormPatientReference] = useState("")
  const [hospitalSettings, setHospitalSettings] = useState<HospitalSettings>(defaultHospitalSettings)
  const [pendingPrint, setPendingPrint] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [selectedDoctorProfile, setSelectedDoctorProfile] = useState<Doctor | null>(null)

  // Collection Form State
  const [collectedBy, setCollectedBy] = useState("")
  const [specimenBarcode, setSpecimenBarcode] = useState("")

  const reportRef = useRef<HTMLDivElement>(null)

  const selectedReport = useMemo(() => parseLabReport(selectedTest), [selectedTest])
  const hospitalName = hospitalSettings.name?.trim() || defaultHospitalSettings.name
  const hospitalTagline = hospitalSettings.tagline?.trim() || defaultHospitalSettings.tagline
  const hospitalContactLine = [hospitalSettings.address, hospitalSettings.phone, hospitalSettings.email].filter(Boolean).join("  |  ")
  const hospitalWeb = hospitalSettings.website?.trim()
  const compactReport = selectedReport.items.length > 6 || (selectedTest?.clinicalNotes?.length || 0) > 220

  useEffect(() => {
    // Pre-load html2pdf script
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
    script.async = true
    document.head.appendChild(script)
  }, [])

  const handlePrint = () => {
    if (!selectedTest) return
    const originalTitle = document.title
    document.title = `Lab-Report-${selectedTest.testId || 'Official'}`
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
  const [labCategories, setLabCategories] = useState<{ id: string; name: string }[]>([])
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")

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

  const fetchHospitalSettings = async () => {
    try {
      const settings = await settingsApi.get()
      setHospitalSettings({ ...defaultHospitalSettings, ...settings })
    } catch (error) {
      console.error("Failed to fetch hospital settings", error)
    }
  }

  const fetchCategories = async () => {
    try {
      const cats = await laboratoryApi.getCategories()
      setLabCategories(cats)
    } catch (e) {
      console.error("Failed to fetch lab categories", e)
    }
  }

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return
    try {
      await laboratoryApi.createCategory(newCategoryName.trim())
      toast.success("Category added successfully")
      setNewCategoryName("")
      setShowAddCategoryModal(false)
      await fetchCategories()
    } catch (e: any) {
      toast.error(e.message || "Failed to add category")
    }
  }

  useEffect(() => {
    fetchStats()
    fetchCatalog()
    fetchCategories()
    fetchHospitalSettings()
  }, [])

  useEffect(() => {
    if (!isReportModalOpen || !pendingPrint || !selectedTest) return

    const timer = window.setTimeout(() => {
      handlePrint()
      setPendingPrint(false)
    }, 300)

    return () => window.clearTimeout(timer)
  }, [isReportModalOpen, pendingPrint, selectedTest])

  useEffect(() => {
    if (!selectedTest?.patientId) {
      setSelectedPatient(null)
      setSelectedDoctorProfile(null)
      return
    }

    let isActive = true

    const loadLinkedProfiles = async () => {
      try {
        const [patient, doctor] = await Promise.all([
          patientsApi.getById(selectedTest.patientId),
          selectedTest.doctorId ? doctorsApi.getById(selectedTest.doctorId) : Promise.resolve(null as Doctor | null),
        ])

        if (!isActive) return
        setSelectedPatient(patient ?? null)
        setSelectedDoctorProfile(doctor ?? null)
      } catch (error) {
        if (!isActive) return
        setSelectedPatient(null)
        setSelectedDoctorProfile(null)
      }
    }

    loadLinkedProfiles()

    return () => {
      isActive = false
    }
  }, [selectedTest])

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
      fetchCategories()
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
        category: labCategories.length > 0 ? labCategories[0].name : "",
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
    const parsedReport = parseLabReport(test)

    setFormResults(test.results || "")
    setFormNormalRange(test.normalRange || "")
    setFormStatus(test.status)
    setFormCritical(test.criticalFlag || false)
    setFormNotes(test.clinicalNotes || "")
    setFormPatientReference(parsedReport.patientReference || test.patientId || "")
    setResultItems(parsedReport.items.length > 0 ? parsedReport.items : [buildFallbackReportItem(test)])

    setIsResultModalOpen(true)
  }

  const openReportPreview = (test: LabTest, shouldPrint = false) => {
    setSelectedTest(test)
    setPendingPrint(shouldPrint)
    setIsReportModalOpen(true)
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
    // Filter out empty result items
    const validItems = resultItems.filter(item => item.parameter.trim() || item.value.trim())
    if (validItems.length === 0) {
      toast.error("Please enter at least one result parameter.")
      return
    }
    setLoading(true)
    try {
      // Always mark as completed when confirming results
      const structuredResults = JSON.stringify({
        version: 2,
        patientReference: formPatientReference.trim(),
        items: validItems,
      })
      const primaryRange = validItems[0]?.range || ""

      await laboratoryApi.update(selectedTest.id, {
        status: "completed",
        results: structuredResults,
        normalRange: primaryRange,
        criticalFlag: formCritical,
        clinicalNotes: formNotes,
        completedAt: new Date().toISOString()
      })
      toast.success("✅ Results confirmed & report finalized!")
      setIsResultModalOpen(false)
      refreshData()
    } catch (e) {
      toast.error("Failed to update results. Please try again.")
      console.error('Result submit error:', e)
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
          {!isDoctor && (
            <Button variant={activeTab === 'catalog' ? 'default' : 'outline'} className="rounded-xl h-12 px-6 font-bold" onClick={() => setActiveTab('catalog')}>
              <Database className="size-4 mr-2" />
              Master Catalog
            </Button>
          )}
          {activeTab === 'queue' && !isDoctor && (
            <Button className="rounded-xl h-12 px-8 font-black shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]" onClick={() => { fetchDropdowns(); setIsOrderModalOpen(true); }}>
              <Plus className="size-5 mr-2" />
              NEW LAB ORDER
            </Button>
          )}
          {activeTab === 'catalog' && !isDoctor && (
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
                          {!isDoctor && test.status === 'ordered' && (
                            <Button variant="default" size="sm" className="h-8 rounded-lg bg-blue-600 hover:bg-blue-700" onClick={() => handleOpenCollect(test)}>
                              <Barcode className="size-3.5 mr-1" /> Collect
                            </Button>
                          )}

                          {!isDoctor && (test.status === 'sample-collected' || test.status === 'in-progress') && (
                            <Button variant="default" size="sm" className="h-8 rounded-lg bg-amber-600 hover:bg-amber-700" onClick={() => handleOpenResult(test)}>
                              <FileText className="size-3.5 mr-1" /> Result
                            </Button>
                          )}


                          {test.status === 'completed' && (
                            <>
                              <Button variant="outline" size="sm" className="h-8 rounded-lg" onClick={() => openReportPreview(test)}>
                                <Eye className="size-3.5 mr-1" /> View
                              </Button>
                              <Button variant="outline" size="sm" className="h-8 rounded-lg border-primary/20 text-primary" onClick={() => openReportPreview(test, true)}>
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
        <DialogContent className="max-w-5xl rounded-[30px] p-0 overflow-hidden border-none shadow-2xl animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300">
          <DialogHeader className="relative overflow-hidden border-b border-cyan-400/20 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.35),_transparent_35%),linear-gradient(135deg,#020617_0%,#0f172a_45%,#0f766e_100%)] p-8 text-white">
            <div className="absolute -right-8 -top-10 size-40 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-transparent" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.28em] text-cyan-100 backdrop-blur">
                  <FlaskConical className="size-4" />
                  Result Workspace
                </div>
                <div className="space-y-2">
                  <DialogTitle className="text-3xl font-black tracking-tight">Laboratory Result Entry</DialogTitle>
                  <DialogDescription className="max-w-2xl text-sm text-slate-200">
                    Review patient information, enter all test values, verify reference ranges, and finalize a clean professional report for printing.
                  </DialogDescription>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Lab No.</p>
                  <p className="mt-2 text-lg font-black">{selectedTest?.testId || "Pending"}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Investigation</p>
                  <p className="mt-2 text-sm font-bold leading-5">{selectedTest?.testName || "Not selected"}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Workflow</p>
                  <div className="mt-2">
                    <StatusBadge status={formStatus} />
                  </div>
                </div>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[68vh] bg-slate-50/60">
            <div className="space-y-8 p-8">
              <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm animate-in fade-in slide-in-from-left-3 duration-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Patient Profile</p>
                      <h3 className="mt-2 text-xl font-black text-slate-900">{selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : (selectedTest?.patientName || "Not available")}</h3>
                    </div>
                    <div className="rounded-2xl bg-primary/5 px-4 py-3 text-right">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">Hospital ID</p>
                      <p className="mt-1 font-mono text-sm font-bold text-slate-900">{selectedPatient?.patientId || selectedTest?.patientId || "Not available"}</p>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Age</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{calculateAge(selectedPatient?.dateOfBirth)}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Gender</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{formatGender(selectedPatient?.gender)}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Blood Group</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{selectedPatient?.bloodGroup || "Not available"}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Phone</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{selectedPatient?.phone || "Not available"}</p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Patient Reference / File Number</Label>
                      <Input
                        placeholder="Enter file number, national ID, phone, or other patient reference"
                        value={formPatientReference}
                        onChange={(e) => setFormPatientReference(e.target.value)}
                        className="h-12 rounded-2xl border-slate-200 bg-white font-medium px-4 shadow-sm transition-all focus:ring-primary/20"
                      />
                    </div>
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Address</p>
                      <p className="mt-1 text-sm leading-6 text-slate-700">{selectedPatient ? `${selectedPatient.address}, ${selectedPatient.city}` : "Patient address not available"}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm animate-in fade-in slide-in-from-right-3 duration-300">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Clinical Request</p>
                  <div className="mt-4 space-y-3">
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Requested By</p>
                      <p className="mt-1 text-sm font-bold text-slate-900">{selectedDoctorProfile?.name || (selectedTest?.doctorName ? `Dr. ${selectedTest.doctorName}` : "General Staff")}</p>
                      <p className="text-xs text-slate-500">{selectedDoctorProfile?.specialization || selectedDoctorProfile?.department || selectedTest?.testCategory || "Clinical team"}</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-slate-50 px-4 py-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Ordered On</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{formatDisplayDate(selectedTest?.orderedAt, "PPP p")}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-4 py-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Sample</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{selectedTest?.sampleType || "Not available"}</p>
                        <p className="text-xs text-slate-500">Barcode: {selectedTest?.sampleBarcode || "Not available"}</p>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-[linear-gradient(135deg,rgba(15,23,42,0.03),rgba(8,145,178,0.06))] px-4 py-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Status Update</p>
                      <div className="mt-3">
                        <Select value={formStatus} onValueChange={setFormStatus}>
                          <SelectTrigger className="h-11 rounded-2xl border-slate-200 bg-white font-bold shadow-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl">
                            <SelectItem value="sample-collected">Sample Collected</SelectItem>
                            <SelectItem value="in-progress">In Progress</SelectItem>
                            <SelectItem value="completed">Finalized Report</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm animate-in fade-in slide-in-from-bottom-3 duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-[0.22em] text-slate-400">Result Parameters</h4>
                    <p className="mt-1 text-sm text-slate-500">Enter each numeric value, qualitative result, and its matching reference range.</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 rounded-xl border-primary/20 text-primary font-bold text-[11px] shadow-sm"
                    onClick={() => setResultItems([...resultItems, { parameter: "", value: "", range: "" }])}
                  >
                    <Plus className="size-4 mr-1.5" /> ADD PARAMETER
                  </Button>
                </div>

                <div className="mt-5 space-y-3">
                  {resultItems.map((item, idx) => (
                    <div key={idx} className="grid gap-3 rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-lg md:grid-cols-[1.2fr_0.8fr_0.9fr_auto]">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Parameter</Label>
                        <Input
                          placeholder="e.g. Hemoglobin"
                          value={item.parameter}
                          onChange={(e) => {
                            const newItems = [...resultItems]
                            newItems[idx].parameter = e.target.value
                            setResultItems(newItems)
                          }}
                          className="h-11 rounded-2xl border-slate-200 bg-white font-semibold shadow-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Result Value</Label>
                        <Input
                          placeholder="e.g. 13.4"
                          value={item.value}
                          onChange={(e) => {
                            const newItems = [...resultItems]
                            newItems[idx].value = e.target.value
                            setResultItems(newItems)
                          }}
                          className="h-11 rounded-2xl border-slate-200 bg-white font-bold shadow-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Reference Range</Label>
                        <Input
                          placeholder="e.g. 12 - 16 g/dL"
                          value={item.range}
                          onChange={(e) => {
                            const newItems = [...resultItems]
                            newItems[idx].range = e.target.value
                            setResultItems(newItems)
                          }}
                          className="h-11 rounded-2xl border-slate-200 bg-white font-mono text-xs shadow-sm"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-10 rounded-2xl text-slate-300 transition-all hover:bg-rose-50 hover:text-rose-500"
                          disabled={resultItems.length === 1}
                          onClick={() => setResultItems(resultItems.filter((_, i) => i !== idx))}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <Label className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Clinical Interpretation</Label>
                  <Textarea
                    placeholder="Provide professional comments, interpretation, and any important clinical remarks."
                    className="mt-3 min-h-[150px] rounded-[24px] border-slate-200 bg-slate-50/70 p-4 font-medium shadow-sm focus:ring-primary/20"
                    value={formNotes}
                    onChange={e => setFormNotes(e.target.value)}
                  />
                </div>

                <div className="rounded-[28px] border border-rose-200 bg-[linear-gradient(135deg,rgba(254,242,242,0.85),rgba(255,255,255,1))] p-6 shadow-sm">
                  <div className="flex items-start gap-3">
                    <AlertCircle className={`mt-1 size-6 ${formCritical ? 'text-rose-600 animate-pulse' : 'text-slate-300'}`} />
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500">Critical Value Control</p>
                      <p className="text-sm text-slate-600">Use this only when the result is dangerously abnormal and needs urgent clinical attention.</p>
                    </div>
                  </div>
                  <div className="mt-6 rounded-2xl border border-dashed border-rose-200 bg-white/80 p-4">
                    <p className="text-sm font-semibold text-slate-900">{formCritical ? "Critical alert is active for this report." : "This report is currently marked as non-critical."}</p>
                    <p className="mt-1 text-xs text-slate-500">The printed report will clearly highlight critical findings.</p>
                  </div>
                  <Button
                    variant={formCritical ? 'destructive' : 'outline'}
                    className={`mt-5 h-11 w-full rounded-2xl font-black tracking-wide transition-all ${formCritical ? 'shadow-lg shadow-rose-200' : 'bg-white'}`}
                    onClick={() => setFormCritical(!formCritical)}
                  >
                    {formCritical ? 'REMOVE CRITICAL ALERT' : 'MARK AS CRITICAL'}
                  </Button>
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="sticky bottom-0 border-t bg-white/95 p-6 backdrop-blur flex gap-3 sm:justify-end">
            <Button variant="ghost" className="rounded-xl h-11 px-6 font-black text-slate-400 hover:text-slate-900" onClick={() => setIsResultModalOpen(false)}>DISCARD</Button>
            <Button className="rounded-xl h-11 px-10 font-black shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] bg-slate-900 text-white" onClick={handleResultSubmit} disabled={loading}>
              {loading ? <Clock className="size-4 animate-spin mr-2" /> : <Save className="size-4 mr-2" />}
              CONFIRM & SYNC RESULTS
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: REPORT PREVIEW */}
      <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
        <DialogContent
          className="h-[95vh] max-h-[95vh] rounded-2xl p-0 overflow-hidden border-none shadow-2xl flex flex-col animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300"
          style={{ maxWidth: '1200px', width: '95vw' }}
        >
          <DialogTitle className="sr-only">Report Preview</DialogTitle>
          <style>{`
            @media print {
              @page { size: A4; margin: 8mm; }
              body * { visibility: hidden !important; pointer-events: none; }
              .print-preview-shell, .print-preview-shell * { visibility: visible !important; }
              .print-preview-shell {
                position: fixed;
                inset: 0;
                background: white !important;
                padding: 0 !important;
                margin: 0 !important;
                overflow: hidden !important;
                z-index: 9999;
              }
              .printable-area, .printable-area * { visibility: visible !important; }
              .printable-area {
                width: 194mm;
                min-height: 0;
                max-height: 277mm;
                height: auto;
                margin: 0 auto;
                padding: 0 !important;
                background: white !important;
                box-shadow: none !important;
                border: none !important;
                border-radius: 0 !important;
                color-adjust: exact;
                -webkit-print-color-adjust: exact;
                overflow: hidden !important;
                page-break-inside: avoid !important;
                page-break-after: avoid !important;
                page-break-before: avoid !important;
              }
              .no-print { display: none !important; }
              .report-body { padding: 10px !important; gap: 8px !important; }
              .report-card { padding: 8px !important; border-radius: 10px !important; }
              .report-table th, .report-table td { padding-top: 4px !important; padding-bottom: 4px !important; font-size: 10px !important; }
              .report-title { font-size: 20px !important; }
              .text-white { color: white !important; }
              * { page-break-inside: avoid !important; }
            }
          `}</style>

          <div className="flex-1 overflow-y-auto bg-slate-100/70">
            <div className="print-preview-shell mx-auto w-full max-w-5xl p-4 md:p-6">
              <div id="report-content" ref={reportRef} className="printable-area overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl">
                <div className="border-b border-slate-200 bg-gradient-to-r from-slate-950 via-primary to-cyan-700 px-6 py-5 text-white">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/95 shadow-lg">
                        {hospitalSettings.logo ? (
                          <img src={hospitalSettings.logo} alt={`${hospitalName} logo`} className="h-full w-full object-contain p-2" />
                        ) : (
                          <FlaskConical className="size-8 text-primary" />
                        )}
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-black uppercase tracking-[0.28em] text-white/70">Official Laboratory Result</p>
                        <div>
                          <h2 className="report-title text-2xl font-black tracking-tight">{hospitalName}</h2>
                          <p className="text-xs font-medium text-white/80">{hospitalTagline}</p>
                        </div>
                        {hospitalContactLine ? <p className="text-[11px] text-white/75">{hospitalContactLine}</p> : null}
                        {hospitalWeb ? <p className="text-[11px] text-white/75">{hospitalWeb}</p> : null}
                      </div>
                    </div>
                    <div className="report-card rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-left backdrop-blur md:min-w-[250px] md:text-right">
                      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/70">Report Reference</p>
                      <p className="mt-2 text-xl font-black tracking-tight">{selectedTest?.testId || "Pending"}</p>
                      <p className="mt-1 text-xs text-white/80">Issued: {formatDisplayDate(selectedTest?.completedAt, 'PPP p')}</p>
                      <p className="text-xs text-white/80">Requested: {formatDisplayDate(selectedTest?.orderedAt, 'PPP p')}</p>
                    </div>
                  </div>
                </div>

                <div className="report-body space-y-4 px-6 py-5">
                  <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
                    <div className="report-card rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Patient Information</p>
                          <p className="mt-2 text-lg font-black text-slate-900">{selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : (selectedTest?.patientName || "Not available")}</p>
                        </div>
                        <Badge className={`${selectedTest?.criticalFlag ? 'bg-red-500' : 'bg-emerald-500'} text-white text-[10px] font-bold px-3 py-1`}>
                          {selectedTest?.criticalFlag ? 'CRITICAL' : 'VERIFIED'}
                        </Badge>
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <p className="text-xs text-slate-600"><span className="font-bold text-slate-900">Hospital ID:</span> {selectedPatient?.patientId || selectedTest?.patientId || "Not available"}</p>
                        <p className="text-xs text-slate-600"><span className="font-bold text-slate-900">Reference:</span> {selectedReport.patientReference || selectedTest?.patientId || "Not provided"}</p>
                        <p className="text-xs text-slate-600"><span className="font-bold text-slate-900">Age:</span> {calculateAge(selectedPatient?.dateOfBirth)}</p>
                        <p className="text-xs text-slate-600"><span className="font-bold text-slate-900">Gender:</span> {formatGender(selectedPatient?.gender)}</p>
                        <p className="text-xs text-slate-600"><span className="font-bold text-slate-900">Blood Group:</span> {selectedPatient?.bloodGroup || "Not available"}</p>
                        <p className="text-xs text-slate-600"><span className="font-bold text-slate-900">Phone:</span> {selectedPatient?.phone || "Not available"}</p>
                      </div>
                      <p className="mt-2 text-xs text-slate-600"><span className="font-bold text-slate-900">Address:</span> {selectedPatient ? `${selectedPatient.address}, ${selectedPatient.city}` : "Not available"}</p>
                    </div>

                    <div className="report-card rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Request & Sample Details</p>
                      <div className="mt-3 grid gap-2">
                        <p className="text-xs text-slate-600"><span className="font-bold text-slate-900">Requested By:</span> {selectedDoctorProfile?.name || (selectedTest?.doctorName ? `Dr. ${selectedTest.doctorName}` : "General Staff")}</p>
                      </div>
                    </div>
                  </div>

                  <div className="report-card rounded-2xl border border-primary/10 bg-primary/[0.03] px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary/60">Clinical Summary</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{summarizeLabResults(selectedReport.items)}</p>
                  </div>

                  <div className="overflow-hidden rounded-3xl border border-slate-200">
                    <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
                      <h4 className="font-bold text-slate-900 flex items-center gap-2">
                        <ClipboardList className="size-4 text-primary" />
                        Investigation Findings
                      </h4>
                      <p className="text-xs font-semibold text-slate-500">{selectedReport.items.length} parameter{selectedReport.items.length === 1 ? "" : "s"}</p>
                    </div>
                    <Table className="report-table">
                      <TableHeader>
                        <TableRow className="bg-white">
                          <TableHead className="font-bold text-slate-700">Test Parameter</TableHead>
                          <TableHead className="font-bold text-slate-700 text-center">Result</TableHead>
                          <TableHead className="font-bold text-slate-700 text-right">Biological Reference Range</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedReport.items.map((item, index) => (
                          <TableRow key={`${item.parameter}-${index}`} className="border-b border-slate-100">
                            <TableCell className={compactReport ? "py-2.5" : "py-4"}>
                              <div>
                                <p className="font-semibold text-slate-900">{item.parameter || selectedTest?.testName || "Investigation"}</p>
                                <p className="text-[11px] text-slate-500">{selectedTest?.testCategory || "Laboratory test"}</p>
                              </div>
                            </TableCell>
                            <TableCell className={`${compactReport ? "py-2.5" : "py-4"} text-center font-mono ${compactReport ? "text-base" : "text-lg"} font-black ${selectedTest?.criticalFlag ? 'text-red-600' : 'text-slate-900'}`}>
                              {item.value || "Pending"}
                            </TableCell>
                            <TableCell className={`${compactReport ? "py-2.5" : "py-4"} text-right text-slate-600 font-mono text-sm`}>
                              {item.range || "N/A"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-[1.3fr_0.7fr]">
                    <div className="report-card rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                      <Label className="text-[10px] uppercase font-black text-amber-700 tracking-[0.2em]">Interpretation / Notes</Label>
                      <p className={`mt-2 ${compactReport ? "text-xs leading-6" : "text-sm leading-7"} text-slate-700`}>
                        {selectedTest?.clinicalNotes || "No additional interpretation provided. Clinical correlation is recommended where appropriate."}
                      </p>
                    </div>
                    <div className="report-card rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[10px] uppercase font-black tracking-[0.2em] text-slate-400">Authorization</p>
                      <div className="mt-7 border-t border-dashed border-slate-300 pt-3">
                        <p className="font-bold text-slate-900">{selectedTest?.resultEnteredBy || selectedTest?.sampleCollectedBy || "Laboratory Officer"}</p>
                        <p className="text-xs text-slate-500">Authorized Laboratory Signatory</p>
                        <p className="mt-2 text-xs text-slate-400">Verification Code: {selectedTest?.id.slice(0, 8)}</p>
                        <p className="text-xs text-slate-400">Doctor Phone: {selectedDoctorProfile?.phone || "Not available"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="report-card rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[11px] leading-5 text-slate-500">
                    This report is electronically generated by {hospitalName}. Review alongside the patient&apos;s clinical presentation and physician assessment before making treatment decisions.
                  </div>
                </div>
              </div>
            </div>
          </div>

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
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Category</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[10px] gap-1 text-primary hover:text-primary/80"
                    onClick={() => setShowAddCategoryModal(true)}
                  >
                    <Plus className="size-3" /> Add New
                  </Button>
                </div>
                <Select value={catalogForm.category} onValueChange={(v) => setCatalogForm({ ...catalogForm, category: v })}>
                  <SelectTrigger className="h-12 rounded-2xl border-slate-200 font-bold">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-slate-200">
                    {labCategories.map(c => (
                      <SelectItem key={c.id} value={c.name} className="font-bold py-3 rounded-xl">{c.name}</SelectItem>
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

      {/* ADD CATEGORY MODAL */}
      <Dialog open={showAddCategoryModal} onOpenChange={setShowAddCategoryModal}>
        <DialogContent className="max-w-md rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-8 bg-slate-900 text-white">
            <DialogTitle className="text-xl font-black uppercase tracking-tighter italic">Add New category</DialogTitle>
          </DialogHeader>
          <div className="p-8 space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Category Name</Label>
              <Input
                placeholder="e.g. Immunology, Genetics"
                className="h-12 rounded-2xl border-slate-200 font-bold focus:ring-primary/20"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter className="p-8 bg-slate-50 flex gap-3">
            <Button variant="ghost" className="rounded-2xl h-11 px-6 font-black text-slate-400 hover:text-slate-900" onClick={() => setShowAddCategoryModal(false)}>CANCEL</Button>
            <Button className="rounded-2xl h-11 px-8 font-black shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]" onClick={handleAddCategory}>
              ADD CATEGORY
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
