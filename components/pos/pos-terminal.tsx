"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Search, Plus, Minus, Trash2, User, CreditCard, Receipt, Activity, Pill, FileText, CheckCircle2, ChevronRight, X, Printer, QrCode, Info, History, Loader2, RotateCcw, Calendar, DollarSign, Wallet } from "lucide-react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { pharmacyApi, laboratoryApi, patientsApi, posApi, type POSItem, type Patient } from "@/lib/api"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

interface CatalogItem {
    id: string;
    name: string;
    type: 'medicine' | 'lab';
    category: string;
    unitPrice: number;
    stock?: number;
}

export function POSTerminal() {
    const [catalog, setCatalog] = useState<CatalogItem[]>([])
    const [searchTerm, setSearchTerm] = useState("")
    const [categoryFilter, setCategoryFilter] = useState("all")

    const [cart, setCart] = useState<POSItem[]>([])
    const [discount, setDiscount] = useState<number>(0)

    const [patients, setPatients] = useState<Patient[]>([])
    const [patientSearch, setPatientSearch] = useState("")
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)

    const [paymentMethod, setPaymentMethod] = useState("cash")
    const [amountPaid, setAmountPaid] = useState<string>("")
    const [isProcessing, setIsProcessing] = useState(false)

    const [lastInvoice, setLastInvoice] = useState<any>(null)
    const [showReceipt, setShowReceipt] = useState(false)
    const [receiptMode, setReceiptMode] = useState<'review' | 'print'>('review')

    const [patientHistory, setPatientHistory] = useState<any>(null)
    const [isLoadingPending, setIsLoadingPending] = useState(false)
    const [insuranceDetails, setInsuranceDetails] = useState({ company: "", policyNumber: "", claimAmount: 0 })
    const [showHistory, setShowHistory] = useState(false)

    // Load Initial Data
    useEffect(() => {
        async function loadData() {
            try {
                const [meds, labs, pats] = await Promise.all([
                    pharmacyApi.getMedicines(),
                    laboratoryApi.getCatalog(),
                    patientsApi.getAll()
                ]);

                const formattedMeds: CatalogItem[] = (meds || []).map(m => ({
                    id: m.id,
                    name: m.name,
                    type: 'medicine',
                    category: 'Pharmacy',
                    unitPrice: m.sellingPrice,
                    stock: m.quantity
                }))

                const formattedLabs: CatalogItem[] = (labs || []).map(l => ({
                    id: l.id,
                    name: l.name,
                    type: 'lab',
                    category: 'Laboratory',
                    unitPrice: l.cost
                }))

                setCatalog([...formattedMeds, ...formattedLabs])
                setPatients(pats || [])
            } catch (err) {
                toast.error("Failed to load catalog data")
            }
        }
        loadData()
    }, [])

    // Filter Catalog
    const filteredCatalog = useMemo(() => {
        return catalog.filter(item => {
            const matchSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase())
            const matchCategory = categoryFilter === "all" || item.type === categoryFilter
            return matchSearch && matchCategory
        })
    }, [catalog, searchTerm, categoryFilter])

    // Filter Patients
    const filteredPatients = useMemo(() => {
        if (!patientSearch) return [];
        return patients.filter(p =>
            `${p.firstName} ${p.lastName}`.toLowerCase().includes(patientSearch.toLowerCase()) ||
            p.patientId?.toLowerCase().includes(patientSearch.toLowerCase()) ||
            p.phone?.includes(patientSearch)
        ).slice(0, 5)
    }, [patients, patientSearch])

    const handlePatientSelect = async (patient: Patient) => {
        setSelectedPatient(patient)
        setPatientSearch("")
        setIsLoadingPending(true)
        try {
            const [pending, history] = await Promise.all([
                posApi.getPendingCharges(patient.id),
                posApi.getHistory(patient.id)
            ])

            setPatientHistory(history)

            if (pending.items.length > 0) {
                setCart(pending.items.map(item => ({
                    ...item,
                    quantity: item.quantity || 1
                })))
                toast.success(`Loaded ${pending.items.length} pending charges`)
            } else {
                setCart([])
            }
        } catch (err) {
            toast.error("Failed to load patient charges")
        } finally {
            setIsLoadingPending(false)
        }
    }


    // Cart Calculations
    const subtotal = cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0)
    const tax = subtotal * 0.10 // Assuming 10% tax for display/sync w backend
    const total = subtotal + tax - discount

    const handleAddToCart = (item: CatalogItem) => {
        if (item.type === 'medicine' && (item.stock === undefined || item.stock <= 0)) {
            return toast.error("This medicine is out of stock")
        }

        setCart(prev => {
            const existing = prev.find(p => p.id === item.id)
            if (existing) {
                if (item.type === 'medicine' && existing.quantity >= (item.stock || 0)) {
                    toast.error("Cannot exceed available stock limit")
                    return prev
                }
                return prev.map(p => p.id === item.id ? { ...p, quantity: p.quantity + 1 } : p)
            }
            return [...prev, {
                id: item.id,
                name: item.name,
                type: item.type,
                category: item.category,
                unitPrice: item.unitPrice,
                quantity: 1
            }]
        })
    }

    const updateQuantity = (id: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                const catItem = catalog.find(c => c.id === id)
                const newQ = item.quantity + delta
                if (newQ < 1) return item
                if (catItem?.type === 'medicine' && newQ > (catItem.stock || 0)) {
                    toast.error("Cannot exceed available stock limit")
                    return item
                }
                return { ...item, quantity: newQ }
            }
            return item
        }))
    }

    const removeFromCart = (id: string) => {
        setCart(prev => prev.filter(item => item.id !== id))
    }

    const handleCheckout = async () => {
        if (cart.length === 0) return toast.error("Cart is empty")

        setIsProcessing(true)
        try {
            const parsedDiscount = (typeof discount === 'string' ? parseFloat(discount) : discount) || 0
            const parsedAmountPaid = amountPaid === "" ? total : (parseFloat(amountPaid) || 0)

            const res = await posApi.checkout({
                patientId: selectedPatient ? selectedPatient.id : null,
                patientName: selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : "Walk-In Patient",
                items: cart,
                discount: parsedDiscount,
                paymentMethod: paymentMethod,
                amountPaid: parsedAmountPaid,
                insuranceInfo: insuranceDetails.company ? insuranceDetails : undefined
            })

            setLastInvoice(res)
            toast.success("Transaction completed successfully!")

            // Reduce local stock cache
            setCatalog(prev => prev.map(c => {
                const cartItem = cart.find(ci => ci.id === c.id)
                if (cartItem && c.type === 'medicine' && c.stock !== undefined) {
                    return { ...c, stock: c.stock - cartItem.quantity }
                }
                return c;
            }))

            // Reset
            setCart([])
            if (setSelectedPatient) setSelectedPatient(null)
            setDiscount(0)
            setAmountPaid("")
            setPatientSearch("")
            setReceiptMode('review')
            setShowReceipt(true)
        } catch (err: any) {
            console.error("POS Checkout Error:", err)
            toast.error(err.message || "Checkout failed. Is the backend running?")
        } finally {
            setIsProcessing(false)
        }
    }

    const handlePrintReceipt = () => {
        const printContent = document.getElementById('thermal-receipt-content')
        if (!printContent) return

        const iframe = document.createElement('iframe')
        iframe.style.position = 'absolute'
        iframe.style.top = '-1000px'
        document.body.appendChild(iframe)

        const doc = iframe.contentWindow?.document
        if (doc) {
            doc.open()
            doc.write(`
                <html>
                <head>
                    <title>Receipt</title>
                    <style>
                        @page { size: 58mm auto; margin: 0; }
                        body { padding: 0; margin: 0; background: #fff; width: 58mm; color: #000; }
                        .thermal-receipt { 
                            width: 58mm; 
                            padding: 2mm 1mm; 
                            font-family: 'Inter', 'Segoe UI', Arial, sans-serif; 
                            font-size: 13px; 
                            line-height: 1.1; 
                            box-sizing: border-box; 
                            margin: 0;
                            text-align: center;
                        }
                        .thermal-header { margin-bottom: 5px; }
                        .thermal-title { font-size: 18px; font-weight: 800; margin-bottom: 2px; }
                        .thermal-subtitle { font-size: 14px; font-weight: 600; margin-bottom: 1px; }
                        .thermal-payment-codes { font-size: 11px; font-weight: bold; margin-bottom: 5px; border-bottom: 1px dashed #000; padding-bottom: 5px; }
                        
                        .thermal-info { font-size: 12px; margin-bottom: 5px; text-align: left; padding: 0 2mm; }
                        .thermal-info div { margin-bottom: 3px; }
                        .thermal-label { font-weight: bold; }
                        
                        .thermal-separator { border-top: 1px dashed #000; margin: 5px 0; }
                        
                        .thermal-table { width: 100%; text-align: left; border-collapse: collapse; font-size: 12px; padding: 0 1mm; }
                        .thermal-table th { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 4px 0; text-align: left; font-weight: bold; }
                        .thermal-table td { padding: 4px 0; }
                        
                        .thermal-totals { border-top: 1px dashed #000; padding: 5px 2mm; text-align: left; }
                        .thermal-row { display: flex; justify-content: space-between; margin-bottom: 3px; font-weight: bold; }
                        
                        .thermal-footer { text-align: center; font-size: 13px; padding-top: 5px; font-weight: bold; }
                        .qr-container { display: flex; justify-content: center; margin: 8px 0; }
                        .qr-image { width: 140px; height: 140px; }
                    </style>
                </head>
                <body>
                    ${printContent.outerHTML}
                </body>
                </html>
            `)
            doc.close()

            setTimeout(() => {
                iframe.contentWindow?.focus()
                iframe.contentWindow?.print()
                setTimeout(() => {
                    document.body.removeChild(iframe)
                }, 1000)
            }, 250)
        }
    }

    return (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 h-[calc(100vh-140px)] min-h-[700px]">

            {/* LEFT SECTION - CATALOG */}
            <div className="xl:col-span-5 flex flex-col gap-4">
                <Card className="flex-1 flex flex-col overflow-hidden border-none shadow-sm h-full">
                    <CardHeader className="pb-3 border-b bg-slate-50">
                        <div className="flex flex-col gap-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                                <Input
                                    placeholder="Scan barcode or search products/services..."
                                    className="pl-10 h-12 bg-white rounded-xl shadow-sm border-slate-200"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button variant={categoryFilter === "all" ? "default" : "outline"} size="sm" className="rounded-lg tabular-nums font-bold" onClick={() => setCategoryFilter("all")}>All</Button>
                                <Button variant={categoryFilter === "medicine" ? "default" : "outline"} size="sm" className="rounded-lg tabular-nums font-bold" onClick={() => setCategoryFilter("medicine")}>
                                    <Pill className="size-3 mr-1" /> Medicines
                                </Button>
                                <Button variant={categoryFilter === "lab" ? "default" : "outline"} size="sm" className="rounded-lg tabular-nums font-bold" onClick={() => setCategoryFilter("lab")}>
                                    <Activity className="size-3 mr-1" /> Lab Tests
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 p-0 overflow-hidden relative">
                        <ScrollArea className="h-full">
                            <div className="grid grid-cols-2 gap-3 p-4">
                                {filteredCatalog.map(item => (
                                    <div
                                        key={item.id}
                                        onClick={() => handleAddToCart(item)}
                                        className="group border border-slate-200 rounded-2xl p-4 cursor-pointer hover:border-primary/50 hover:shadow-md transition-all bg-white flex flex-col gap-2 relative overflow-hidden"
                                    >
                                        <div className="flex justify-between items-start">
                                            <Badge variant={item.type === 'medicine' ? "default" : "secondary"} className="text-[10px] uppercase tracking-widest bg-slate-100 text-slate-600 hover:bg-slate-200">
                                                {item.category}
                                            </Badge>
                                            {item.type === 'medicine' && (
                                                <span className={`text-xs font-black ${item.stock && item.stock > 10 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                    {item.stock} in stock
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-1">
                                            <h4 className="font-bold text-slate-900 leading-tight line-clamp-2">{item.name}</h4>
                                            <p className="text-lg font-black text-primary mt-1">${item.unitPrice.toLocaleString()}</p>
                                        </div>
                                        <div className="absolute opacity-0 group-hover:opacity-100 bottom-4 right-4 bg-primary text-white p-2 rounded-full transition-all scale-75 group-hover:scale-100">
                                            <Plus className="size-4" />
                                        </div>
                                    </div>
                                ))}
                                {filteredCatalog.length === 0 && (
                                    <div className="col-span-2 text-center py-12 text-slate-400 font-medium">
                                        No items found.
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>

            {/* CENTER SECTION - CART */}
            <div className="xl:col-span-4 flex flex-col">
                <Card className="flex-1 flex flex-col overflow-hidden border-none shadow-md h-full">
                    <CardHeader className="pb-4 border-b bg-white">
                        <CardTitle className="flex items-center gap-2 text-slate-900">
                            <Receipt className="size-5" /> Current Order
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 p-0 overflow-hidden flex flex-col bg-slate-50/50">
                        <ScrollArea className="flex-1 p-4">
                            <div className="space-y-3">
                                {cart.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-400 py-20 opacity-50">
                                        <Receipt className="size-16 mb-4 stroke-1 text-slate-300" />
                                        <p className="font-medium">Cart is empty</p>
                                        <p className="text-xs">Scan or select items to add</p>
                                    </div>
                                ) : (
                                    cart.map(item => (
                                        <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex gap-4 items-center animate-in slide-in-from-bottom-2">
                                            <div className="flex-1 min-w-0">
                                                <h5 className="font-bold text-slate-900 truncate">{item.name}</h5>
                                                <p className="text-xs font-bold text-slate-400 mt-0.5">${item.unitPrice.toLocaleString()} {item.type === 'medicine' ? 'each' : ''}</p>
                                            </div>
                                            <div className="flex items-center gap-2 bg-slate-50 rounded-xl p-1 border border-slate-100">
                                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-slate-500 hover:text-rose-500 hover:bg-rose-50" onClick={() => updateQuantity(item.id, -1)}>
                                                    <Minus className="size-3" />
                                                </Button>
                                                <span className="w-6 text-center font-black text-sm">{item.quantity}</span>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-slate-500 hover:text-emerald-500 hover:bg-emerald-50" onClick={() => updateQuantity(item.id, 1)}>
                                                    <Plus className="size-3" />
                                                </Button>
                                            </div>
                                            <div className="w-16 text-right font-black text-slate-900">
                                                ${(item.unitPrice * item.quantity).toLocaleString()}
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg -ml-2" onClick={() => removeFromCart(item.id)}>
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>

            {/* RIGHT SECTION - PATIENT & PAYMENT */}
            <div className="xl:col-span-3 flex flex-col gap-4">
                <Card className="border-none shadow-sm sticky top-0">
                    <CardHeader className="pb-3 border-b bg-slate-50">
                        <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                            <User className="size-4" /> Patient Info
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                        {!selectedPatient ? (
                            <div className="space-y-3">
                                <div className="relative">
                                    <Input
                                        placeholder="Search registered patient..."
                                        value={patientSearch}
                                        onChange={e => setPatientSearch(e.target.value)}
                                        className="h-11 rounded-xl bg-slate-50 border-slate-200"
                                    />
                                    {patientSearch && (
                                        <div className="absolute left-0 right-0 top-12 bg-white border border-slate-200 shadow-xl rounded-xl z-50 overflow-hidden max-h-48 overflow-y-auto">
                                            {filteredPatients.map(p => (
                                                <div
                                                    key={p.id}
                                                    className="p-3 border-b border-slate-50 hover:bg-slate-50 cursor-pointer flex flex-col"
                                                    onClick={() => handlePatientSelect(p)}
                                                >
                                                    <span className="font-bold text-sm text-slate-900">{p.firstName} {p.lastName}</span>
                                                    <span className="text-xs text-slate-500 uppercase font-mono">{p.patientId} · {p.phone}</span>
                                                </div>
                                            ))}
                                            {filteredPatients.length === 0 && (
                                                <div className="p-4 text-center text-xs text-slate-400 font-medium">No patients found. Walk-in will be used.</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-4 text-xs font-bold text-slate-400 uppercase">
                                    <div className="h-px bg-slate-200 flex-1"></div> OR <div className="h-px bg-slate-200 flex-1"></div>
                                </div>
                                <div className="p-3 bg-slate-50 border border-slate-200 border-dashed rounded-xl flex items-center justify-center text-slate-500 text-sm font-bold">
                                    Walk-In Selected by Default
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex justify-between items-start">
                                <div>
                                    <h4 className="font-black text-emerald-900 leading-none mb-1">{selectedPatient.firstName} {selectedPatient.lastName}</h4>
                                    <p className="text-xs font-bold text-emerald-600/70 font-mono uppercase">{selectedPatient.patientId}</p>
                                </div>
                                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full text-emerald-600 hover:bg-emerald-200 hover:text-emerald-800" onClick={() => setSelectedPatient(null)}>
                                    <X className="size-3" />
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="flex-1 flex flex-col border-none shadow-md overflow-hidden bg-slate-900 text-white">
                    <CardContent className="p-6 flex flex-col h-full justify-between gap-6 relative">
                        <div className="absolute top-0 right-0 p-8 opacity-5"><CreditCard className="size-32" /></div>

                        <div className="space-y-4 relative z-10">
                            <div className="flex justify-between items-center text-slate-400 font-bold text-sm">
                                <span>Subtotal</span>
                                <span className="text-white">${subtotal.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-400 font-bold text-sm">
                                <span>Tax (10%)</span>
                                <span className="text-white">${tax.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-400 font-bold text-sm group">
                                <span>Discount</span>
                                <div className="w-24">
                                    <Input
                                        className="h-8 bg-slate-800 border-slate-700 text-white text-right px-2 no-spinners font-mono"
                                        type="number"
                                        value={discount || ''}
                                        onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            <div className="h-px bg-slate-800 my-4"></div>

                            <div className="flex justify-between items-end">
                                <span className="text-xs font-black uppercase tracking-widest text-slate-400">Grand Total</span>
                                <span className="text-4xl font-black text-emerald-400 tracking-tighter">${total.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="space-y-4 relative z-10 mt-auto">
                            <div className="grid grid-cols-2 gap-3">
                                <Button variant={paymentMethod === 'cash' ? "default" : "outline"} className={`h-12 border-slate-700 ${paymentMethod === 'cash' ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-transparent text-slate-300 hover:bg-slate-800'}`} onClick={() => setPaymentMethod('cash')}>
                                    Cash
                                </Button>
                                <Button variant={paymentMethod === 'card' ? "default" : "outline"} className={`h-12 border-slate-700 ${paymentMethod === 'card' ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-transparent text-slate-300 hover:bg-slate-800'}`} onClick={() => setPaymentMethod('card')}>
                                    Card
                                </Button>
                            </div>

                            {paymentMethod === 'cash' && (
                                <div className="flex items-center gap-3">
                                    <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Amount Tendered</Label>
                                    <Input
                                        className="h-12 bg-slate-800 border-slate-700 text-white font-black text-xl text-center focus-visible:ring-emerald-500"
                                        placeholder={total.toString()}
                                        value={amountPaid}
                                        onChange={e => setAmountPaid(e.target.value)}
                                    />
                                </div>
                            )}

                            <Button
                                className="w-full h-16 rounded-2xl text-lg font-black tracking-widest uppercase bg-white text-slate-900 hover:bg-slate-100 shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 mt-2"
                                disabled={cart.length === 0 || isProcessing}
                                onClick={handleCheckout}
                            >
                                {isProcessing ? "Processing..." : `PAY & FINISH ($${total.toLocaleString()})`}
                                <ChevronRight className="ml-2 size-5" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* RECEIPT MODAL */}
            <Dialog open={showReceipt} onOpenChange={(open) => { if (!open) setShowReceipt(false) }}>
                <DialogContent className="max-w-md rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
                    <DialogHeader className="p-6 bg-slate-50 border-b">
                        <DialogTitle className="sr-only">Transaction Receipt</DialogTitle>
                        <div className="flex flex-col items-center justify-center text-center space-y-2 py-4">
                            <div className={`h-16 w-16 ${receiptMode === 'review' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'} rounded-full flex items-center justify-center mb-2`}>
                                {receiptMode === 'review' ? <Info className="size-8" /> : <CheckCircle2 className="size-8" />}
                            </div>
                            <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">
                                {receiptMode === 'review' ? 'Review Receipt' : 'Payment Successful'}
                            </h3>
                            <p className="text-sm font-bold text-slate-500">
                                {receiptMode === 'review' ? 'Please verify details before printing' : `Transaction ID: ${lastInvoice?.invoiceId}`}
                            </p>
                        </div>
                    </DialogHeader>

                    {/* Visible Review Section */}
                    <div className="p-4 bg-slate-50 border-y border-dashed border-slate-200">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 max-h-[300px] overflow-y-auto">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                                    <span className="text-xs font-black uppercase text-slate-400">Items Scan</span>
                                    <span className="text-xs font-mono font-bold text-slate-500">#{lastInvoice?.invoiceId || 'PENDING'}</span>
                                </div>
                                <div className="space-y-3">
                                    {lastInvoice?.items?.map((item: any, i: number) => (
                                        <div key={i} className="flex justify-between text-sm">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-900">{item.description}</span>
                                                <span className="text-[10px] font-black text-slate-400 uppercase">{item.quantity} x ${item.unitPrice}</span>
                                            </div>
                                            <span className="font-black text-slate-900">${item.total}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="pt-4 border-t border-slate-200 space-y-1">
                                    <div className="flex justify-between text-xs font-bold text-slate-500">
                                        <span>Subtotal</span>
                                        <span>${lastInvoice?.subtotal}</span>
                                    </div>
                                    <div className="flex justify-between text-xs font-bold text-slate-500">
                                        <span>Tax</span>
                                        <span>${lastInvoice?.tax}</span>
                                    </div>
                                    {lastInvoice?.discount > 0 && (
                                        <div className="flex justify-between text-xs font-bold text-rose-500">
                                            <span>Discount</span>
                                            <span>-${lastInvoice?.discount}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-lg font-black text-slate-900 pt-2 text-emerald-600">
                                        <span>TOTAL PAID</span>
                                        <span>${lastInvoice?.total}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Printable Receipt Area container */}
                    <div className="hidden">
                        <div id="thermal-receipt-content" className="thermal-receipt">
                            <div className="thermal-header">
                                <div className="thermal-title">GarGaar Hospital</div>
                                <div className="thermal-subtitle">Health & Care Center</div>
                                <div className="thermal-payment-codes">
                                    ZAAD: 515735 - SAHAL: 523080<br />
                                    E-DAHAB: 742298 - MyCash: 931539
                                </div>
                            </div>

                            <div className="thermal-info">
                                <div><span className="thermal-label">Receipt Number : </span>{lastInvoice?.invoiceId}</div>
                                <div><span className="thermal-label">Served By : </span>{localStorage.getItem('userName') || 'Cashier'}</div>
                                <div><span className="thermal-label">Customer : </span>{lastInvoice?.patientName || 'Walking Customer'}</div>
                                <div><span className="thermal-label">Date : </span>{lastInvoice ? new Date(lastInvoice.date).toLocaleDateString('en-GB') + ' ' + new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''}</div>
                            </div>

                            <table className="thermal-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '45%' }}>Item.</th>
                                        <th style={{ width: '15%', textAlign: 'center' }}>No.</th>
                                        <th style={{ width: '15%', textAlign: 'center' }}>Price.</th>
                                        <th style={{ width: '25%', textAlign: 'right' }}>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lastInvoice?.items?.map((item: any, i: number) => (
                                        <tr key={i}>
                                            <td style={{ wordBreak: 'break-word', fontWeight: 'bold' }}>{item.description}</td>
                                            <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                                            <td style={{ textAlign: 'center' }}>{Number(item.unitPrice).toFixed(1)}</td>
                                            <td style={{ textAlign: 'right' }}>{Number(item.total).toFixed(1)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <div className="thermal-separator"></div>

                            <div className="thermal-totals">
                                <div className="thermal-row">
                                    <span>Vat @ 5 %</span>
                                    <span>{(Number(lastInvoice?.total || 0) * 0.05).toFixed(1)}</span>
                                </div>
                                <div className="thermal-row">
                                    <span>Paid Amount</span>
                                    <span>{Number(lastInvoice?.paidAmount || 0).toFixed(0)}</span>
                                </div>
                                <div className="thermal-separator"></div>
                                <div className="thermal-row" style={{ fontWeight: 'bold' }}>
                                    <span>Total : {Number(lastInvoice?.total || 0).toFixed(1)}</span>
                                </div>
                                <div className="thermal-row">
                                    <span>Total L/Currency : 0</span>
                                </div>
                            </div>

                            <div className="thermal-separator"></div>

                            <div className="thermal-footer">
                                <div className="qr-container">
                                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${lastInvoice?.invoiceId}`} className="qr-image" alt="QR Code" />
                                </div>
                                <div style={{ marginBottom: '5px', textTransform: 'uppercase' }}>Thank you for visiting us</div>
                                <div style={{ fontSize: '12px' }}>Powered by HUDI-SOFT</div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="p-6 bg-slate-100 flex gap-3 sm:justify-center">
                        <Button variant="outline" className="h-12 rounded-xl font-bold uppercase tracking-widest text-xs flex-1 border-slate-300" onClick={() => setShowReceipt(false)}>
                            NEW SALE
                        </Button>
                        <Button
                            className="h-12 rounded-xl font-bold uppercase tracking-widest text-xs flex-1 shadow-lg bg-emerald-600 text-white hover:bg-emerald-700"
                            onClick={() => {
                                handlePrintReceipt()
                                setReceiptMode('print')
                            }}
                        >
                            <Printer className="size-4 mr-2" /> PRINT RECEIPT
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    )
}
