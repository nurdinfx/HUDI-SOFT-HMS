"use client"

import { useState, useEffect } from "react"
import {
  Pill,
  CheckCircle2,
  Clock,
  Search,
  Package,
  TrendingUp,
  AlertCircle,
  Activity,
  ArrowRight,
  ShieldAlert
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { StatusBadge } from "@/components/shared/status-badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Calendar as CalendarIcon } from "lucide-react"
import { pharmacyApi, type Prescription, type Medicine } from "@/lib/api"
import { toast } from "sonner"
import { InventoryManagement } from "./inventory-management"
import { PharmacyTransactions } from "./pharmacy-transactions"

interface Props {
  prescriptions: Prescription[]
  medicines: Medicine[]
  onRefresh: () => void
}

export function PharmacyContent({ prescriptions, medicines, onRefresh }: Props) {
  const [activeTab, setActiveTab] = useState("queue")
  const [search, setSearch] = useState("")
  const [selectedRx, setSelectedRx] = useState<Prescription | null>(null)
  const [dispenseLoading, setDispenseLoading] = useState(false)
  const [alerts, setAlerts] = useState<{ lowStock: number, expiring: number }>({ lowStock: 0, expiring: 0 })

  useEffect(() => {
    const low = medicines.filter(m => m.quantity <= m.reorderLevel).length
    const exp = medicines.filter(m => {
      if (!m.expiryDate) return false
      return new Date(m.expiryDate) < new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
    }).length
    setAlerts({ lowStock: low, expiring: exp })
  }, [medicines])

  const pending = prescriptions.filter((p) => p.status === "pending")
  const dispensedToday = prescriptions.filter((p) => p.status === "dispensed")

  const filteredRx = prescriptions.filter((p) => {
    if (!search) return true
    return p.patientName.toLowerCase().includes(search.toLowerCase()) || p.prescriptionId.toLowerCase().includes(search.toLowerCase())
  })

  const handleDispense = async (rxId: string) => {
    setDispenseLoading(true)
    try {
      const result = await pharmacyApi.dispense(rxId)
      toast.success(`Success! Invoice ${result.invoiceId} generated.`)
      setSelectedRx(null)
      onRefresh()
    } catch (error: any) {
      toast.error(error.message || "Dispensing failed. Check stock levels.")
    } finally {
      setDispenseLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <PageHeader title="International Pharmacy" description="Standardized medicine dispensing and inventory oversight." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Pending Rx" value={pending.length} icon={Clock} iconClassName="bg-amber-100 text-amber-600" />
        <StatCard title="Dispensed Today" value={dispensedToday.length} icon={CheckCircle2} iconClassName="bg-emerald-100 text-emerald-600" />
        <StatCard title="Low Stock Items" value={alerts.lowStock} icon={AlertCircle} iconClassName="bg-rose-100 text-rose-600" />
        <StatCard title="Total Inventory" value={medicines.length} icon={Package} iconClassName="bg-blue-100 text-blue-600" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-transparent border-b rounded-none h-12 w-full justify-start gap-8 p-0 mb-6">
          <TabsTrigger value="queue" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0">Dispensing Queue</TabsTrigger>
          <TabsTrigger value="inventory" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0">Inventory Hub</TabsTrigger>
          <TabsTrigger value="financials" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0">Financial Hub</TabsTrigger>
          <TabsTrigger value="alerts" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0">Risk Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="mt-0 space-y-4">
          <Card>
            <CardHeader className="pb-3 px-6 pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Prescription Fulfillment</CardTitle>
                  <CardDescription>Real-time queue of patient prescriptions waiting for dispensing.</CardDescription>
                </div>
                <div className="relative w-72">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input placeholder="Search patient/Rx ID..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Rx ID</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Physician</TableHead>
                    <TableHead className="hidden md:table-cell">Diagnosis</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right pr-6">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRx.map((rx) => (
                    <TableRow key={rx.id} className="group hover:bg-muted/50 transition-colors">
                      <TableCell className="font-mono text-xs pl-6">{rx.prescriptionId}</TableCell>
                      <TableCell className="font-bold">{rx.patientName}</TableCell>
                      <TableCell className="text-muted-foreground">{rx.doctorName}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs italic">{rx.diagnosis}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-medium">{rx.medicines.length} meds</Badge>
                      </TableCell>
                      <TableCell><StatusBadge status={rx.status} /></TableCell>
                      <TableCell className="text-right pr-6">
                        <Button variant="outline" size="sm" className="gap-2 group-hover:bg-primary group-hover:text-primary-foreground transition-all" onClick={() => setSelectedRx(rx)}>
                          Process
                          <ArrowRight className="size-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredRx.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-20 text-muted-foreground">
                        <Clock className="size-12 mx-auto opacity-10 mb-4" />
                        No prescriptions found matching your search.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="mt-0">
          <InventoryManagement medicines={medicines} onRefresh={onRefresh} />
        </TabsContent>

        <TabsContent value="financials" className="mt-0">
          <PharmacyTransactions medicines={medicines} onRefresh={onRefresh} />
        </TabsContent>

        <TabsContent value="alerts" className="mt-0 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-rose-200 bg-rose-50/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-rose-600">
                  <ShieldAlert className="size-5" />
                  Critical Low Stock
                </CardTitle>
                <CardDescription>Items that require immediate reordering.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {medicines.filter(m => m.quantity <= m.reorderLevel).map(m => (
                    <div key={m.id} className="flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm">
                      <div>
                        <p className="text-sm font-bold">{m.name}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">{m.manufacturer}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-rose-600 font-bold">{m.quantity}</p>
                        <p className="text-[9px] uppercase font-medium">Qty Left</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-amber-200 bg-amber-50/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-600">
                  <CalendarIcon className="size-5" />
                  Expiry Oversight
                </CardTitle>
                <CardDescription>Medicines expiring within the next 60 days.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {medicines.filter(m => {
                    if (!m.expiryDate) return false
                    return new Date(m.expiryDate) < new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
                  }).map(m => (
                    <div key={m.id} className="flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm">
                      <div>
                        <p className="text-sm font-bold">{m.name}</p>
                        <p className="text-[10px] text-muted-foreground">Batch: {m.batchNumber}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-amber-600 font-bold text-xs">{m.expiryDate}</p>
                        <p className="text-[9px] uppercase font-medium">Expires</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Prescription Detail & Dispense Dialog */}
      <Dialog open={!!selectedRx} onOpenChange={() => setSelectedRx(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden border-none shadow-2xl rounded-3xl">
          <DialogHeader className="p-8 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Order Fulfillment</p>
                <DialogTitle className="text-2xl font-black flex items-center gap-3">
                  {selectedRx?.prescriptionId}
                  <StatusBadge status={selectedRx?.status || "pending"} />
                </DialogTitle>
              </div>
              <Pill className="size-8 text-primary/50" />
            </div>
          </DialogHeader>

          {selectedRx && (
            <div className="flex flex-col">
              <div className="p-8 space-y-8">
                {/* Patient / Doctor Info */}
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-3 p-4 rounded-2xl bg-slate-50 border border-slate-100 italic">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Patient Details</p>
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-white border flex items-center justify-center font-bold text-slate-600">
                        {selectedRx.patientName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{selectedRx.patientName}</p>
                        <p className="text-xs text-slate-500">Scheduled: {selectedRx.date}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3 p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100">
                    <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600/70">Physician In-Charge</p>
                    <div>
                      <p className="font-bold text-emerald-900">Dr. {selectedRx.doctorName}</p>
                      <p className="text-xs text-emerald-600/70">{selectedRx.diagnosis || "General Consultation"}</p>
                    </div>
                  </div>
                </div>

                {/* Medication Table */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                       Prescribed Medications
                    </h4>
                    <Badge variant="outline" className="text-[10px] rounded-full border-slate-200">
                      {selectedRx.medicines.length} items
                    </Badge>
                  </div>

                  <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm bg-white">
                    <Table>
                      <TableHeader className="bg-slate-50/50">
                        <TableRow className="hover:bg-transparent border-slate-100">
                          <TableHead className="text-[10px] font-bold py-4">Medicine & Indication</TableHead>
                          <TableHead className="text-[10px] font-bold py-4">Regimen</TableHead>
                          <TableHead className="text-[10px] font-bold py-4 text-right">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedRx.medicines.map((m, i) => {
                          const inv = medicines.find(item => item.name === m.medicineName || item.genericName === m.medicineName)
                          const isCustom = m.isCustom || m.medicineId === 'custom'
                          const hasStock = inv && inv.quantity >= (m.quantity || 1)
                          
                          return (
                            <TableRow key={i} className="border-slate-50">
                              <TableCell className="py-4">
                                <div className="space-y-1">
                                  <p className="text-sm font-bold text-slate-900">{m.medicineName}</p>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="text-[9px] h-4 font-bold bg-slate-100 text-slate-500 rounded-sm">
                                      {inv?.category || (isCustom ? "Custom Entry" : "General Medicine")}
                                    </Badge>
                                    <span className="text-[10px] text-slate-400">{m.dosage}</span>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="py-4">
                                <div className="space-y-1">
                                  <p className="text-[10px] font-black text-slate-900 uppercase">{m.frequency}</p>
                                  <p className="text-[10px] text-slate-400">Qty: {m.quantity} · {m.duration || "5 Days"}</p>
                                </div>
                              </TableCell>
                              <TableCell className="text-right py-4">
                                {isCustom ? (
                                  <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 rounded-full text-[10px] font-bold px-3">
                                    External Source
                                  </Badge>
                                ) : hasStock ? (
                                  <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 rounded-full text-[10px] font-bold px-3">
                                    Dispense Ready ({inv.quantity})
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-rose-600 border-rose-200 bg-rose-50 rounded-full text-[10px] font-bold px-3">
                                    Critical: Out of Stock
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Additional Instructions */}
                {selectedRx.notes && (
                  <div className="p-5 bg-blue-50/50 border border-blue-100 rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-2 opacity-5">
                      <ShieldAlert className="size-16" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-blue-600/70 mb-2">Pharmacist Instructions</p>
                    <p className="text-sm text-blue-900 font-medium leading-relaxed italic">
                      "{selectedRx.notes}"
                    </p>
                  </div>
                )}
              </div>

              {selectedRx.status === "pending" && (
                <div className="bg-slate-50 p-6 flex justify-end gap-3 border-t">
                  <Button 
                    variant="ghost" 
                    onClick={() => setSelectedRx(null)}
                    className="rounded-xl font-bold text-slate-500 hover:bg-slate-200"
                  >
                    Cancel
                  </Button>
                  <Button
                    className="gap-2 px-10 h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black shadow-xl shadow-slate-200 transition-all hover:scale-[1.02]"
                    disabled={dispenseLoading}
                    onClick={() => handleDispense(selectedRx.id)}
                  >
                    {dispenseLoading ? (
                      <Activity className="size-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="size-4" />
                    )}
                    FINALIZE DISPENSING
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
