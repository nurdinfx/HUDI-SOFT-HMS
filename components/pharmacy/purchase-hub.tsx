"use client"

import { useState, useEffect } from "react"
import { 
  Plus, 
  Search, 
  ShoppingCart, 
  Truck, 
  PackageCheck, 
  RotateCcw, 
  AlertTriangle,
  FileText,
  Calendar,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Eye,
  Warehouse,
  Activity,
  AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { pharmacyPurchaseApi, pharmacyApi, type Supplier, type PurchaseOrder, type Batch, type SupplierReturn, type Medicine } from "@/lib/api"
import { toast } from "sonner"
import { StatusBadge } from "@/components/shared/status-badge"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Props {
  medicines: Medicine[]
  onRefresh: () => void
}

export function PurchaseHub({ medicines, onRefresh }: Props) {
  const [activeSubTab, setActiveSubTab] = useState("overview")
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)
  
  // Data lists
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [returns, setReturns] = useState<SupplierReturn[]>([])

  // Selection states for dialogs
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [showOrderDialog, setShowOrderDialog] = useState(false)
  const [showSupplierDialog, setShowSupplierDialog] = useState(false)
  const [showReceiveDialog, setShowReceiveDialog] = useState(false)
  const [showReturnDialog, setShowReturnDialog] = useState(false)

  const loadAllData = async () => {
    setLoading(true)
    try {
      const [s, o, b, r, st] = await Promise.all([
        pharmacyPurchaseApi.getSuppliers(),
        pharmacyPurchaseApi.getOrders(),
        pharmacyPurchaseApi.getBatches(),
        pharmacyPurchaseApi.getReturns(),
        pharmacyPurchaseApi.getStats()
      ])
      setSuppliers(s)
      setOrders(o)
      setBatches(b)
      setReturns(r)
      setStats(st)
    } catch (error) {
      console.error(error)
      toast.error("Failed to load purchase data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAllData()
  }, [])

  const handleRefresh = () => {
    loadAllData()
    onRefresh()
  }

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-blue-600 uppercase tracking-wider">Total Procurement</CardTitle>
            <ShoppingCart className="size-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">${Number(stats?.totalPurchases || 0).toLocaleString()}</div>
            <p className="text-[10px] text-slate-500 mt-1">Total received purchase value</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-100 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-amber-600 uppercase tracking-wider">Stock Valuation</CardTitle>
            <Warehouse className="size-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">${Number(stats?.stockValue || 0).toLocaleString()}</div>
            <p className="text-[10px] text-slate-500 mt-1">Estimated asset value in batches</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-rose-50 to-white border-rose-100 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-rose-600 uppercase tracking-wider">Expiring Batches</CardTitle>
            <AlertTriangle className="size-4 text-rose-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">{stats?.expiringCount || 0}</div>
            <p className="text-[10px] text-slate-500 mt-1">{stats?.expiredCount || 0} batches already expired</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-100 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-emerald-600 uppercase tracking-wider">Supplier Returns</CardTitle>
            <RotateCcw className="size-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">${Number(stats?.returnedAmount || 0).toLocaleString()}</div>
            <p className="text-[10px] text-slate-500 mt-1">Value of stock returned to suppliers</p>
          </CardContent>
        </Card>
      </div>

      {/* Internal Tabs */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 h-12 bg-slate-100/50 p-1 rounded-xl">
          <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Procurement Feed</TabsTrigger>
          <TabsTrigger value="orders" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Purchase Orders</TabsTrigger>
          <TabsTrigger value="suppliers" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Supplier Registry</TabsTrigger>
          <TabsTrigger value="batches" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Batch Control</TabsTrigger>
          <TabsTrigger value="returns" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Returns Hub</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Recent Purchase Activity</CardTitle>
                <CardDescription>Track the latest procurement requests and receipts.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PO Number</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.slice(0, 5).map((o) => (
                      <TableRow key={o.id}>
                        <TableCell className="font-mono text-xs">{o.poNumber}</TableCell>
                        <TableCell className="font-medium">{o.supplierName}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{o.orderDate}</TableCell>
                        <TableCell className="font-bold">${Number(o.totalAmount || 0).toLocaleString()}</TableCell>
                        <TableCell><StatusBadge status={o.status} /></TableCell>
                      </TableRow>
                    ))}
                    {orders.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No recent orders</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <AlertTriangle className="size-4 text-rose-500" />
                  Expiry Watch
                </CardTitle>
                <CardDescription>Batches requiring immediate attention.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {batches.filter(b => b.status !== 'valid').slice(0, 4).map(b => (
                  <div key={b.id} className="p-3 border rounded-xl flex items-center justify-between text-sm">
                    <div>
                      <p className="font-bold">{b.medicineName}</p>
                      <p className="text-[10px] text-muted-foreground">Batch: {b.batchNumber}</p>
                    </div>
                    <div className="text-right">
                       <Badge variant={b.status === 'expired' ? 'destructive' : 'outline'} className="text-[9px] px-1 h-4">
                        {b.status === 'expired' ? 'EXPIRED' : 'NEAR EXPIRY'}
                       </Badge>
                       <p className="text-[10px] mt-1 font-medium">{b.expiryDate}</p>
                    </div>
                  </div>
                ))}
                {batches.filter(b => b.status !== 'valid').length === 0 && (
                  <div className="py-10 text-center text-muted-foreground italic text-xs">No imminent expiries detected.</div>
                )}
                <Button variant="outline" className="w-full text-xs" onClick={() => setActiveSubTab("batches")}>View All Batches</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="orders" className="mt-6">
          <PurchaseOrderList orders={orders} suppliers={suppliers} medicines={medicines} onRefresh={handleRefresh} />
        </TabsContent>

        <TabsContent value="suppliers" className="mt-6">
          <SupplierRegistry suppliers={suppliers} onRefresh={handleRefresh} />
        </TabsContent>

        <TabsContent value="batches" className="mt-6">
          <BatchControl batches={batches} onRefresh={handleRefresh} />
        </TabsContent>

        <TabsContent value="returns" className="mt-6">
          <ReturnsManagement 
            returns={returns} 
            batches={batches} 
            suppliers={suppliers} 
            medicines={medicines}
            onRefresh={handleRefresh} 
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ─── Sub-Components ───────────────────────────────────────────────

function PurchaseOrderList({ orders, suppliers, medicines, onRefresh }: { orders: PurchaseOrder[], suppliers: Supplier[], medicines: Medicine[], onRefresh: () => void }) {
  const [showAdd, setShowAdd] = useState(false)
  const [showReceive, setShowReceive] = useState<PurchaseOrder | null>(null)
  const [showAddMed, setShowAddMed] = useState(false)
  const [activeIdx, setActiveIdx] = useState<number | null>(null)
  
  // Create Order State
  const [supplierId, setSupplierId] = useState("")
  const [items, setItems] = useState<any[]>([])
  const [notes, setNotes] = useState("")
  
  // Receive Order State
  const [receivedItems, setReceivedItems] = useState<any[]>([])

  const addItem = () => {
    setItems([...items, { medicine_id: "", medicine_name: "", quantity: 1, unit_price: 0, total_price: 0 }])
  }

  const handleCreateOrder = async () => {
    if (!supplierId || items.length === 0) return toast.error("Missing order data")
    const total = items.reduce((sum, i) => sum + (i.unit_price * i.quantity), 0)
    try {
      await pharmacyPurchaseApi.createOrder({ supplier_id: supplierId, items, total_amount: total, notes })
      toast.success("Purchase order created")
      setShowAdd(false)
      setItems([])
      onRefresh()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleReceiveOrder = async () => {
    if (!showReceive) return
    try {
        await pharmacyPurchaseApi.updateOrderStatus(showReceive.id, 'received', receivedItems)
        toast.success("Order received and stock updated")
        setShowReceive(null)
        onRefresh()
    } catch (error: any) {
        toast.error(error.message)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Purchase Orders</CardTitle>
          <CardDescription>Manage procurement lifecycle from request to receipt.</CardDescription>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2 bg-slate-900">
          <Plus className="size-4" />
          Create Order
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">PO Number</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Order Date</TableHead>
              <TableHead>Total Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right pr-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-mono text-xs pl-6">{o.poNumber}</TableCell>
                <TableCell className="font-bold">{o.supplierName}</TableCell>
                <TableCell>{o.orderDate}</TableCell>
                <TableCell className="font-black">${Number(o.totalAmount || 0).toLocaleString()}</TableCell>
                <TableCell><StatusBadge status={o.status} /></TableCell>
                <TableCell className="text-right pr-6 space-x-2">
                  {o.status === 'pending' && (
                    <Button variant="outline" size="sm" className="h-8 text-[10px] font-black uppercase text-emerald-600 border-emerald-100 hover:bg-emerald-50" 
                      onClick={() => {
                        setShowReceive(o)
                        setReceivedItems((o.items || []).map(item => ({ medicine_id: item.medicineId, medicine_name: item.medicineName, batchNumber: "", expiryDate: "" })))
                      }}>
                      Receive Stock
                    </Button>
                  )}
                  {o.status === 'received' && (
                    <Badge variant="secondary" className="bg-emerald-50 text-emerald-600 border-emerald-100 uppercase text-[9px]">Completed</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      {/* Create Order Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-[1200px] w-[95vw] max-h-[95vh] overflow-hidden flex flex-col rounded-3xl p-0">
          <DialogHeader className="p-8 bg-slate-900 text-white">
            <DialogTitle className="text-2xl font-black italic tracking-tighter uppercase">Create Purchase Order</DialogTitle>
            <DialogDescription className="text-slate-400">Add medicines to your procurement request. High-accuracy inventory intake.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-8 p-8">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Select Supplier</label>
                    <Select onValueChange={setSupplierId}>
                        <SelectTrigger><SelectValue placeholder="Choose Supplier..." /></SelectTrigger>
                        <SelectContent>
                            {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Notes (Optional)</label>
                    <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Delivery instructions..." />
                </div>
            </div>

                <div className="space-y-4 overflow-x-hidden">
                    <div className="flex items-center justify-between border-b pb-2">
                        <h4 className="text-sm font-black uppercase tracking-widest text-slate-500">Medicine Items</h4>
                        <Button variant="outline" size="sm" onClick={addItem} className="h-7 text-[10px] rounded-full border-slate-200 hover:bg-slate-50">
                            <Plus className="size-3 mr-1" /> Add Medicine
                        </Button>
                    </div>
                <div className="space-y-4">
                    {items.map((item, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-4 items-end bg-slate-50/50 p-4 rounded-2xl border border-slate-100 hover:border-blue-100 transition-colors">
                            <div className="col-span-5 space-y-1.5">
                                <label className="text-[10px] uppercase text-muted-foreground">Medicine</label>
                                <div className="flex gap-2">
                                    <Select 
                                        value={item.medicine_id}
                                        onValueChange={(val) => {
                                            if (val === "create_new") {
                                                setActiveIdx(idx)
                                                setShowAddMed(true)
                                                return;
                                            }
                                            const med = medicines.find(m => m.id === val);
                                            const newItems = [...items];
                                            newItems[idx].medicine_id = val;
                                            newItems[idx].medicine_name = med?.name || "";
                                            newItems[idx].unit_price = med?.unitPrice || 0;
                                            newItems[idx].total_price = newItems[idx].unit_price * newItems[idx].quantity;
                                            setItems(newItems);
                                        }}
                                    >
                                        <SelectTrigger className="flex-1"><SelectValue placeholder="Select Medicine..." /></SelectTrigger>
                                        <SelectContent>
                                            <div className="p-1 border-b mb-1">
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="w-full justify-start text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveIdx(idx);
                                                        setShowAddMed(true);
                                                    }}
                                                >
                                                    <Plus className="size-3 mr-2" /> Register New Medicine
                                                </Button>
                                            </div>
                                            {medicines.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                                            {medicines.length === 0 && <p className="p-4 text-center text-xs text-muted-foreground italic">No medicines found</p>}
                                        </SelectContent>
                                    </Select>
                                    <Button 
                                        variant="outline" 
                                        size="icon" 
                                        className="size-9 rounded-xl flex-shrink-0 border-slate-200 hover:bg-white hover:text-blue-600 hover:border-blue-200 shadow-sm"
                                        onClick={() => {
                                            setActiveIdx(idx)
                                            setShowAddMed(true)
                                        }}
                                    >
                                        <Plus className="size-4" />
                                    </Button>
                                </div>
                            </div>
                            <div className="col-span-2 space-y-1.5">
                                <label className="text-[10px] uppercase text-muted-foreground">Quantity</label>
                                <Input type="number" className="h-9 rounded-lg bg-white" value={item.quantity} onChange={(e) => {
                                    const newItems = [...items];
                                    newItems[idx].quantity = parseInt(e.target.value) || 0;
                                    newItems[idx].total_price = newItems[idx].unit_price * newItems[idx].quantity;
                                    setItems(newItems);
                                }} />
                            </div>
                            <div className="col-span-2 space-y-1.5">
                                <label className="text-[10px] uppercase font-bold text-slate-400">Unit Price ($)</label>
                                <Input type="number" className="h-9 rounded-lg bg-white" value={item.unit_price} onChange={(e) => {
                                    const newItems = [...items];
                                    newItems[idx].unit_price = parseFloat(e.target.value) || 0;
                                    newItems[idx].total_price = newItems[idx].unit_price * newItems[idx].quantity;
                                    setItems(newItems);
                                }} />
                            </div>
                            <div className="col-span-2 space-y-1.5">
                                <label className="text-[10px] uppercase font-bold text-slate-400">Total ($)</label>
                                <Input readOnly value={Number(item.total_price || 0).toFixed(2)} className="bg-slate-100 border-none font-bold text-slate-900 h-9 rounded-lg" />
                            </div>
                             <div className="col-span-1 flex justify-end">
                                <Button variant="ghost" size="icon" onClick={() => setItems(items.filter((_, i) => i !== idx))} className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 size-9 rounded-full">
                                    <XCircle className="size-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          </div>
          <DialogFooter className="p-8 bg-slate-50 border-t items-center mt-auto">
            <div className="flex-1 flex flex-col items-start gap-0.5">
                <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Estimated Grand Total</p>
                <span className="text-3xl font-black text-slate-900 tracking-tighter">${Number(items.reduce((sum, i) => sum + (Number(i.total_price) || 0), 0)).toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" className="font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-200/50 h-12 px-6" onClick={() => setShowAdd(false)}>Cancel Request</Button>
              <Button onClick={handleCreateOrder} disabled={items.length === 0} className="bg-slate-900 hover:bg-black text-white px-8 h-12 rounded-xl font-black uppercase text-xs tracking-widest shadow-xl shadow-slate-200">
                Finalize Purchase Order
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Receive Order Dialog */}
      <Dialog open={!!showReceive} onOpenChange={() => setShowReceive(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
                <Truck className="size-5 text-emerald-600" />
                Goods Receiving & Intake
            </DialogTitle>
            <DialogDescription>Recording intake for Purchase Order {showReceive?.poNumber}. Please enter batch details.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Inventory Intake Details</p>
            <ScrollArea className="h-[400px]">
                <div className="space-y-4 pr-4">
                    {showReceive?.items?.map((item, idx) => (
                        <Card key={item.id} className="border-emerald-100 bg-emerald-50/20 shadow-none">
                            <CardContent className="pt-6 space-y-4">
                                <div className="flex justify-between items-center">
                                    <p className="font-bold text-slate-800">{item.medicineName}</p>
                                    <Badge variant="secondary" className="font-bold">Qty: {item.quantity}</Badge>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase text-slate-500">Batch Number</label>
                                        <Input placeholder="e.g. BTC-2026-X" className="bg-white" 
                                            value={receivedItems[idx]?.batchNumber || ""}
                                            onChange={(e) => {
                                                const ri = [...receivedItems];
                                                ri[idx] = { ...ri[idx], medicine_id: item.medicineId, batchNumber: e.target.value };
                                                setReceivedItems(ri);
                                            }}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase text-slate-500">Expiry Date</label>
                                        <Input type="date" className="bg-white" 
                                            value={receivedItems[idx]?.expiryDate || ""}
                                            onChange={(e) => {
                                                const ri = [...receivedItems];
                                                ri[idx] = { ...ri[idx], medicine_id: item.medicineId, expiryDate: e.target.value };
                                                setReceivedItems(ri);
                                            }}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowReceive(null)}>Cancel</Button>
            <Button onClick={handleReceiveOrder} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">Confirm Receipt & Update Stock</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddMedicineDialog 
        open={showAddMed} 
        onOpenChange={setShowAddMed}
        onSuccess={(newMed) => {
            onRefresh()
            if (activeIdx !== null) {
                const newItems = [...items]
                newItems[activeIdx].medicine_id = newMed.id
                newItems[activeIdx].medicine_name = newMed.name
                newItems[activeIdx].unit_price = newMed.unitPrice || 0
                newItems[activeIdx].total_price = newItems[activeIdx].unit_price * newItems[activeIdx].quantity
                setItems(newItems)
            }
            setShowAddMed(false)
            setActiveIdx(null)
        }}
      />
    </Card>
  )
}

function SupplierRegistry({ suppliers, onRefresh }: { suppliers: Supplier[], onRefresh: () => void }) {
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [formData, setFormData] = useState<any>({ name: "", contact_person: "", phone: "", email: "", address: "" })

  const handleSubmit = async () => {
    if (!formData.name) return toast.error("Supplier name required")
    try {
        if (editing) await pharmacyPurchaseApi.updateSupplier(editing.id, formData)
        else await pharmacyPurchaseApi.createSupplier(formData)
        toast.success(editing ? "Supplier updated" : "Supplier registered")
        setShowAdd(false)
        setEditing(null)
        setFormData({ name: "", contact_person: "", phone: "", email: "", address: "" })
        onRefresh()
    } catch (error: any) {
        toast.error(error.message)
    }
  }

  return (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Supplier Registry</CardTitle>
                <CardDescription>Directory of all pharmaceutical medicine providers.</CardDescription>
            </div>
            <Button onClick={() => setShowAdd(true)} className="gap-2 bg-slate-900 h-9">
                <Plus className="size-4" /> Register Supplier
            </Button>
        </CardHeader>
        <CardContent className="p-0">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="pl-6">Organization Name</TableHead>
                        <TableHead>Contact Point</TableHead>
                        <TableHead>Communication</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead className="text-right pr-6">Management</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {suppliers.map(s => (
                        <TableRow key={s.id}>
                            <TableCell className="font-bold pl-6 text-slate-800">{s.name}</TableCell>
                            <TableCell>{s.contactPerson}</TableCell>
                            <TableCell className="text-xs">
                                <p>{s.phone}</p>
                                <p className="text-muted-foreground">{s.email}</p>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{s.address}</TableCell>
                            <TableCell className="text-right pr-6">
                                <Button variant="ghost" size="sm" onClick={() => { setEditing(s); setFormData(s); setShowAdd(true); }}>Edit</Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </CardContent>

        <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{editing ? 'Update Supplier' : 'Register New Supplier'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-500">Organization Name</label>
                        <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-500">Contact Person</label>
                            <Input value={formData.contact_person} onChange={e => setFormData({ ...formData, contact_person: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-500">Phone</label>
                            <Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-500">Email Address</label>
                        <Input value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-500">HQ Address / Location</label>
                        <Input value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} className="bg-slate-900">Save Supplier</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </Card>
  )
}

function BatchControl({ batches, onRefresh }: { batches: Batch[], onRefresh: () => void }) {
  const [search, setSearch] = useState("")
  
  const filtered = batches.filter(b => 
    b.medicineName?.toLowerCase().includes(search.toLowerCase()) || 
    b.batchNumber?.toLowerCase().includes(search.toLowerCase())
  )

  const handleRefresh = async () => {
    try {
        await pharmacyPurchaseApi.refreshBatchStatus()
        onRefresh()
        toast.success("Health analysis complete")
    } catch (error: any) {
        toast.error(error.message)
    }
  }

  return (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Batch & Expiry Control</CardTitle>
                <CardDescription>Monitor individual stock arrivals and health metrics.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
                <div className="relative w-64">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input placeholder="Batch ID or Medicine..." className="pl-9 h-9" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <Button variant="outline" className="h-9 gap-2" onClick={handleRefresh}>
                    <Activity className="size-4 text-emerald-600" /> Run Health Check
                </Button>
            </div>
        </CardHeader>
        <CardContent className="p-0">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="pl-6">Module Name</TableHead>
                        <TableHead>Batch ID</TableHead>
                        <TableHead>Stock Level</TableHead>
                        <TableHead>Expiry Date</TableHead>
                        <TableHead>Health Metric</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filtered.map(b => (
                        <TableRow key={b.id}>
                            <TableCell className="font-bold pl-6 text-slate-800">{b.medicineName}</TableCell>
                            <TableCell className="font-mono text-xs">{b.batchNumber}</TableCell>
                            <TableCell>
                                <div className="space-y-1">
                                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                        <div className="bg-blue-500 h-full" style={{ width: `${(b.quantityRemaining / b.quantityReceived) * 100}%` }} />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground font-medium">{b.quantityRemaining} / {b.quantityReceived} units left</p>
                                </div>
                            </TableCell>
                            <TableCell className="text-sm font-medium">{b.expiryDate}</TableCell>
                            <TableCell>
                                <Badge variant={b.status === 'valid' ? 'secondary' : b.status === 'expired' ? 'destructive' : 'outline'} className="text-[10px] uppercase font-bold px-3">
                                    {b.status}
                                </Badge>
                            </TableCell>
                        </TableRow>
                    ))}
                    {filtered.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center py-20 italic">No batches found</TableCell></TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
    </Card>
  )
}

function AddMedicineDialog({ open, onOpenChange, onSuccess }: { open: boolean, onOpenChange: (v: boolean) => void, onSuccess: (med: Medicine) => void }) {
    const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
    const [loading, setLoading] = useState(false)
    const [isAddingCategory, setIsAddingCategory] = useState(false)
    const [newCategory, setNewCategory] = useState("")
    const [formData, setFormData] = useState({
        name: "",
        genericName: "",
        category: "Tablet",
        unit: "tablet",
        manufacturer: "",
        unitPrice: 0,
        sellingPrice: 0,
        reorderLevel: 10
    })

    useEffect(() => {
        if (open) {
            pharmacyApi.getCategories().then(setCategories).catch(() => {})
            setIsAddingCategory(false)
            setNewCategory("")
        }
    }, [open])

    const handleSave = async () => {
        if (!formData.name) return toast.error("Medicine name required")
        
        let targetCategory = formData.category
        if (isAddingCategory) {
            if (!newCategory) return toast.error("New category name required")
            try {
                const cat = await pharmacyApi.createCategory(newCategory)
                targetCategory = cat.name
            } catch (error: any) {
                return toast.error("Failed to create category: " + error.message)
            }
        }

        setLoading(true)
        try {
            const res = await pharmacyApi.createMedicine({ ...formData, category: targetCategory, quantity: 0 })
            toast.success("New medicine registered")
            onSuccess(res)
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[800px] w-[95vw] rounded-3xl p-0 overflow-hidden shadow-2xl border-none">
                <DialogHeader className="p-10 bg-slate-900 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <PackageCheck className="size-32" />
                    </div>
                    <DialogTitle className="text-2xl font-black italic tracking-tighter uppercase relative z-10">Quick Register Medicine</DialogTitle>
                    <DialogDescription className="text-slate-400 relative z-10">Add a new item to the master inventory list. Ensure all details are accurate.</DialogDescription>
                </DialogHeader>
                <div className="p-10 space-y-6 bg-white">
                    <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase font-bold text-slate-500">Medicine Name</Label>
                        <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Paracetamol 500mg" />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase font-bold text-slate-500">Generic Name</Label>
                        <Input value={formData.genericName} onChange={e => setFormData({ ...formData, genericName: e.target.value })} placeholder="e.g. Acetaminophen" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase font-bold text-slate-500">Category</Label>
                            {isAddingCategory ? (
                                <div className="flex gap-2">
                                    <Input 
                                        value={newCategory} 
                                        onChange={e => setNewCategory(e.target.value)} 
                                        placeholder="Enter category..." 
                                        className="h-10"
                                        autoFocus
                                    />
                                    <Button variant="ghost" size="sm" onClick={() => setIsAddingCategory(false)} className="text-[10px] uppercase font-bold">Cancel</Button>
                                </div>
                            ) : (
                                <Select value={formData.category} onValueChange={v => {
                                    if (v === "NEW_CATEGORY") {
                                        setIsAddingCategory(true)
                                    } else {
                                        setFormData({ ...formData, category: v })
                                    }
                                }}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="NEW_CATEGORY" className="text-blue-600 font-bold border-b mb-1">+ Add New Category</SelectItem>
                                        {categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase font-bold text-slate-500">Unit Type</Label>
                            <Select value={formData.unit} onValueChange={v => setFormData({ ...formData, unit: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="tablet">Tablet / Pcs</SelectItem>
                                    <SelectItem value="syrup">Syrup / Bottle</SelectItem>
                                    <SelectItem value="injection">Vial / Inject</SelectItem>
                                    <SelectItem value="box">Box / Packet</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
                <DialogFooter className="p-8 bg-slate-50 border-t items-center">
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={loading} className="bg-slate-900 shadow-xl shadow-slate-200 min-w-32">
                        {loading ? "Saving..." : "Register Medicine"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function ReturnsManagement({ returns, batches, suppliers, medicines, onRefresh }: { returns: SupplierReturn[], batches: Batch[], suppliers: Supplier[], medicines: Medicine[], onRefresh: () => void }) {
  const [showAdd, setShowAdd] = useState(false)
  const [selectedMedId, setSelectedMedId] = useState("")
  const [formData, setFormData] = useState({ supplier_id: "", batch_id: "", quantity: 0, amount: 0, reason: "" })

  const filteredBatches = selectedMedId ? batches.filter(b => b.medicineId === selectedMedId) : []

  const handleSubmit = async () => {
    if (!formData.supplier_id || !formData.batch_id || !formData.quantity) return toast.error("Missing data")
    try {
        await pharmacyPurchaseApi.createReturn(formData)
        toast.success("Return processed successfully")
        setShowAdd(false)
        setFormData({ supplier_id: "", batch_id: "", quantity: 0, amount: 0, reason: "" })
        setSelectedMedId("")
        onRefresh()
    } catch (error: any) {
        toast.error(error.message)
    }
  }

  return (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Supplier Returns</CardTitle>
                <CardDescription>Manage stock removals and financial reversals.</CardDescription>
            </div>
            <Button onClick={() => setShowAdd(true)} className="gap-2 bg-rose-600 hover:bg-rose-700 h-9 rounded-xl font-bold uppercase text-[10px] tracking-widest">
                <RotateCcw className="size-4" /> Initialize Return
            </Button>
        </CardHeader>
        <CardContent className="p-0">
            <Table>
                <TableHeader>
                    <TableRow className="bg-slate-50/50">
                        <TableHead className="pl-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Return Logic ID</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Supplier</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Item Details</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Quantity</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Financial Impact</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {returns.map(r => (
                        <TableRow key={r.id} className="group hover:bg-slate-50 transition-colors">
                            <TableCell className="font-mono text-xs pl-6 text-slate-400">{r.id.slice(0, 8).toUpperCase()}</TableCell>
                            <TableCell className="font-bold text-slate-900">{r.supplierName}</TableCell>
                            <TableCell>
                                <div className="space-y-0.5">
                                    <p className="font-bold text-slate-800">{r.itemName}</p>
                                    <p className="text-[10px] text-muted-foreground uppercase">{r.reason}</p>
                                </div>
                            </TableCell>
                            <TableCell className="font-medium text-slate-600">{r.quantity} units</TableCell>
                            <TableCell className="text-rose-600 font-black">-${Number(r.amount || 0).toLocaleString()}</TableCell>
                        </TableRow>
                    ))}
                    {returns.length === 0 && (
                         <TableRow><TableCell colSpan={5} className="text-center py-20 italic text-slate-400">No returns documented.</TableCell></TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>

        <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogContent className="max-w-md p-0 overflow-hidden border-none shadow-2xl rounded-3xl">
                <DialogHeader className="p-8 bg-rose-600 text-white relative">
                    <div className="absolute top-0 right-0 p-6 opacity-10">
                        <RotateCcw className="size-24" />
                    </div>
                    <DialogTitle className="flex items-center gap-3 text-xl font-black italic uppercase tracking-tighter">
                        <AlertCircle className="size-6" /> Stock Discard & Return
                    </DialogTitle>
                    <DialogDescription className="text-rose-100 italic">Removing inventory from the hospital registry for supplier distribution.</DialogDescription>
                </DialogHeader>
                <div className="p-8 space-y-6 bg-white">
                     <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Destination Supplier</label>
                        <Select onValueChange={v => setFormData({ ...formData, supplier_id: v })}>
                            <SelectTrigger className="rounded-xl h-12 border-slate-200"><SelectValue placeholder="Select Recipient..." /></SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200">
                                {suppliers.map(s => <SelectItem key={s.id} value={s.id} className="rounded-lg">{s.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Select Medicine</label>
                        <Select value={selectedMedId} onValueChange={v => {
                            setSelectedMedId(v)
                            setFormData({ ...formData, batch_id: "" })
                        }}>
                            <SelectTrigger className="rounded-xl h-12 border-slate-200"><SelectValue placeholder="Choose Medicine..." /></SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200">
                                {medicines.map(m => (
                                    <SelectItem key={m.id} value={m.id} className="rounded-lg">{m.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Source Batch (from PO Arrival)</label>
                        <Select 
                            value={formData.batch_id} 
                            disabled={!selectedMedId}
                            onValueChange={v => setFormData({ ...formData, batch_id: v })}
                        >
                            <SelectTrigger className="rounded-xl h-12 border-slate-200"><SelectValue placeholder={selectedMedId ? "Select Batch to Deduct..." : "First select a medicine"} /></SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200">
                                {filteredBatches.map(b => (
                                    <SelectItem key={b.id} value={b.id} className="rounded-lg">
                                        {b.batchNumber} - {b.quantityRemaining} units left
                                    </SelectItem>
                                ))}
                                {selectedMedId && filteredBatches.length === 0 && (
                                    <p className="p-4 text-center text-xs text-muted-foreground italic">No active batches for this medicine</p>
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Quantity to Return</label>
                            <Input type="number" className="rounded-xl h-12 border-slate-200" value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Credit Amount ($)</label>
                            <Input type="number" className="rounded-xl h-12 border-slate-200" value={formData.amount} onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })} />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Reason for Disposal / Return</label>
                        <Input placeholder="Expiry, Damage, Ordering Error..." className="rounded-xl h-12 border-slate-200 italic" value={formData.reason} onChange={e => setFormData({ ...formData, reason: e.target.value })} />
                    </div>
                </div>
                <DialogFooter className="p-8 bg-slate-50 border-t">
                    <Button variant="ghost" onClick={() => setShowAdd(false)} className="rounded-xl font-bold text-slate-500">Cancel</Button>
                    <Button onClick={handleSubmit} className="bg-rose-600 hover:bg-rose-700 text-white font-black uppercase text-xs tracking-widest px-8 h-12 rounded-xl shadow-xl shadow-rose-100 transition-all hover:scale-[1.02]">
                        Finalize Removal
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </Card>
  )
}
