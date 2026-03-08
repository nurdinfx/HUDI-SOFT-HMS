"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { 
    Search, Plus, Minus, Trash2, User, CreditCard, Receipt, 
    Activity, Pill, FileText, CheckCircle2, ChevronRight, X, 
    Printer, QrCode, Info, History, Loader2, RotateCcw, Calendar, 
    DollarSign, Wallet, Smartphone, Landmark, ShieldCheck
} from "lucide-react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { pharmacyApi, laboratoryApi, patientsApi, posApi, type POSItem, type Patient } from "@/lib/api"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

interface CatalogItem {
    id: string;
    name: string;
    type: 'medicine' | 'lab' | 'service';
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
    const [insuranceCoverage, setInsuranceCoverage] = useState<number>(0)

    const [patients, setPatients] = useState<Patient[]>([])
    const [patientSearch, setPatientSearch] = useState("")
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)

    const [paymentMethod, setPaymentMethod] = useState("cash") // cash, card, mobile, insurance, bank
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
        
        // Auto-fill insurance if present
        if (patient.insuranceProvider) {
            setInsuranceDetails({
                ...insuranceDetails,
                company: patient.insuranceProvider,
                policyNumber: patient.insurancePolicyNumber || ""
            })
        }

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
                toast.success(`Loaded ${pending.items.length} pending charges automatically`)
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
    const subtotal = cart.reduce((sum, item) => sum + ((item.unitPrice || 0) * (item.quantity || 1)), 0)
    const totalBeforeInsurance = subtotal - discount
    const total = Math.max(0, totalBeforeInsurance - insuranceCoverage)

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

            // If insurance is specified, pass it
            const insData = insuranceCoverage > 0 ? {
                company: insuranceDetails.company,
                policyNumber: insuranceDetails.policyNumber,
                claimAmount: insuranceCoverage
            } : undefined

            const res = await posApi.checkout({
                patientId: selectedPatient ? selectedPatient.id : null,
                patientName: selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : "Walk-In Patient",
                items: cart,
                discount: parsedDiscount,
                paymentMethod: paymentMethod,
                amountPaid: parsedAmountPaid,
                insuranceInfo: insData
            })

            setLastInvoice(res)
            toast.success("Transaction completed successfully! Accounts updated.")

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
            setInsuranceCoverage(0)
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

    const PAYMENT_METHODS = [
        { id: 'cash', label: 'Cash', icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
        { id: 'card', label: 'Card', icon: CreditCard, color: 'text-blue-500', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
        { id: 'mobile', label: 'Mobile', icon: Smartphone, color: 'text-purple-500', bg: 'bg-purple-50 text-purple-700 border-purple-200' },
        { id: 'bank', label: 'Bank', icon: Landmark, color: 'text-indigo-500', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
        { id: 'insurance', label: 'Insurance', icon: ShieldCheck, color: 'text-cyan-500', bg: 'bg-cyan-50 text-cyan-700 border-cyan-200' }
    ]

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden bg-slate-100/50 rounded-2xl border border-slate-200 shadow-sm relative">
            
            {/* TOP HEADER - Premium Glassmorphism */}
            <div className="h-16 px-6 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between shrink-0 z-10 sticky top-0">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                        <Wallet className="size-5" />
                    </div>
                    <div>
                        <h2 className="font-bold text-slate-900 leading-tight">Billing & POS</h2>
                        <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Fast Checkout Terminal</p>
                    </div>
                </div>

                <div className="flex-1 max-w-md mx-8 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <QrCode className="h-4 w-4 text-slate-400" />
                    </div>
                    <Input
                        placeholder="Scan patient QR or search by name/ID..."
                        className="pl-10 h-10 bg-white shadow-sm border-slate-200 rounded-xl font-medium focus-visible:ring-primary/20 transition-all"
                        value={patientSearch}
                        onChange={e => setPatientSearch(e.target.value)}
                    />
                    {patientSearch && (
                        <div className="absolute top-12 left-0 right-0 bg-white border border-slate-200 shadow-xl rounded-xl z-50 overflow-hidden max-h-[300px] overflow-y-auto animate-in fade-in slide-in-from-top-2 focus-within:ring-2">
                            {filteredPatients.length > 0 ? (
                                filteredPatients.map((p) => (
                                    <div
                                        key={p.id}
                                        className="p-3 border-b border-slate-50 hover:bg-slate-50 cursor-pointer flex flex-col transition-colors"
                                        onClick={() => handlePatientSelect(p)}
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold text-slate-900 text-sm">{p.firstName} {p.lastName}</span>
                                            {p.insuranceProvider && (
                                                <Badge variant="secondary" className="text-[9px] uppercase tracking-wider bg-cyan-50 text-cyan-600 px-1 py-0 h-4">
                                                    Insured
                                                </Badge>
                                            )}
                                        </div>
                                        <span className="text-xs text-slate-500 font-mono mt-0.5">{p.patientId} • {p.phone || 'No Phone'}</span>
                                    </div>
                                ))
                            ) : (
                                <div className="p-4 text-center">
                                    <User className="size-6 text-slate-300 mx-auto mb-2" />
                                    <p className="text-sm font-medium text-slate-600">No patients found</p>
                                    <p className="text-xs text-slate-400">Press enter to use as Walk-in Patient</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {selectedPatient ? (
                        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 pl-3 pr-1 py-1 rounded-full animate-in zoom-in-95">
                            <div className="flex flex-col items-end">
                                <span className="text-xs font-bold text-emerald-900 leading-none">{selectedPatient.firstName} {selectedPatient.lastName}</span>
                                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">{selectedPatient.patientId}</span>
                            </div>
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-emerald-100 hover:bg-emerald-200 text-emerald-700" onClick={() => setSelectedPatient(null)}>
                                <X className="size-3" />
                            </Button>
                        </div>
                    ) : (
                        <Badge variant="outline" className="border-slate-300 text-slate-500 px-3 py-1 font-semibold uppercase tracking-widest text-[10px]">
                            Walking Customer
                        </Badge>
                    )}
                    
                    <Button variant="outline" size="sm" className="h-9 gap-2 ml-2 shadow-sm rounded-xl border-slate-200" onClick={() => setShowHistory(true)} disabled={!selectedPatient}>
                        <History className="size-4" />
                        <span className="hidden xl:inline">History</span>
                    </Button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden relative">
                
                {/* LEFT COLLABORATIVE PANEL: Catalog & Search */}
                <div className="w-[45%] flex flex-col bg-slate-50 border-r border-slate-200">
                    <div className="p-4 shrink-0 border-b border-slate-200 bg-white">
                        <Tabs defaultValue="all" value={categoryFilter} onValueChange={setCategoryFilter} className="w-full">
                            <TabsList className="w-full grid grid-cols-4 h-10 p-1 bg-slate-100 rounded-xl">
                                <TabsTrigger value="all" className="rounded-lg text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">All</TabsTrigger>
                                <TabsTrigger value="medicine" className="rounded-lg text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Pharmacy</TabsTrigger>
                                <TabsTrigger value="lab" className="rounded-lg text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Labs</TabsTrigger>
                                <TabsTrigger value="service" className="rounded-lg text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Services</TabsTrigger>
                            </TabsList>
                        </Tabs>
                        <div className="relative mt-3">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                            <Input
                                placeholder="Search catalog items..."
                                className="pl-9 h-10 bg-slate-100 border-transparent rounded-xl text-sm font-medium focus-visible:bg-white transition-colors focus-visible:ring-1 focus-visible:ring-primary/30"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    
                    <ScrollArea className="flex-1 p-4">
                        <div className="grid grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                            {filteredCatalog.map(item => (
                                <div
                                    key={item.id}
                                    onClick={() => handleAddToCart(item)}
                                    className="group bg-white border border-slate-200 rounded-2xl p-4 cursor-pointer hover:border-primary/50 hover:shadow-md transition-all flex flex-col gap-2 relative overflow-hidden h-[120px] select-none"
                                >
                                    <div className="flex justify-between items-start">
                                        <div className={cn("text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-md font-bold", 
                                            item.type === 'medicine' ? "bg-emerald-50 text-emerald-600" : 
                                            item.type === 'lab' ? "bg-blue-50 text-blue-600" : 
                                            "bg-purple-50 text-purple-600"
                                        )}>
                                            {item.category}
                                        </div>
                                        {item.type === 'medicine' && (
                                            <span className={cn("text-[10px] font-black", (item.stock || 0) > 10 ? 'text-emerald-500' : 'text-rose-500')}>
                                                {item.stock} LEFT
                                            </span>
                                        )}
                                    </div>
                                    <div className="mt-auto">
                                        <h4 className="font-bold text-slate-900 text-sm leading-tight line-clamp-2">{item.name}</h4>
                                        <p className="text-base font-black text-slate-700 mt-1">${item.unitPrice.toLocaleString()}</p>
                                    </div>
                                    <div className="absolute opacity-0 group-hover:opacity-100 bottom-3 right-3 bg-primary text-white p-1.5 rounded-full transition-all scale-75 group-hover:scale-100 shadow-sm">
                                        <Plus className="size-4" />
                                    </div>
                                </div>
                            ))}
                            {filteredCatalog.length === 0 && (
                                <div className="col-span-full flex flex-col items-center justify-center py-16 text-slate-400">
                                    <Search className="size-8 mb-3 opacity-20" />
                                    <p className="text-sm font-medium">No catalog items found.</p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>

                {/* RIGHT COLLABORATIVE PANEL: Cart & Payment */}
                <div className="w-[55%] flex flex-col bg-white">
                    {/* CART LIST */}
                    <div className="flex-1 flex flex-col overflow-hidden relative">
                        {isLoadingPending && (
                            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center">
                                <Loader2 className="size-8 animate-spin text-primary mb-2" />
                                <p className="text-sm font-medium text-slate-600 animate-pulse">Scanning for pending charges...</p>
                            </div>
                        )}
                        <ScrollArea className="flex-1 p-6">
                            <div className="space-y-3">
                                {cart.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center text-slate-400 py-32 opacity-60">
                                        <div className="h-20 w-20 rounded-full bg-slate-50 flex items-center justify-center mb-4 border border-slate-100">
                                            <Receipt className="size-10 stroke-1 text-slate-400" />
                                        </div>
                                        <p className="font-bold text-lg text-slate-600">Order is empty</p>
                                        <p className="text-sm font-medium">Add items from the catalog</p>
                                    </div>
                                ) : (
                                    cart.map(item => (
                                        <div key={item.id} className="group relative bg-white p-4 rounded-2xl shadow-sm border border-slate-200/60 flex gap-4 items-center hover:border-slate-300 transition-colors animate-in slide-in-from-bottom-2">
                                            <div className="flex-1 min-w-0 pr-4">
                                                <div className="flex items-center gap-2 mb-1">
                                                    {item.isFromVisit && <Badge variant="secondary" className="text-[9px] h-4 bg-orange-100 text-orange-700 hover:bg-orange-100">VISIT</Badge>}
                                                    {item.isFromLab && <Badge variant="secondary" className="text-[9px] h-4 bg-blue-100 text-blue-700 hover:bg-blue-100">LAB</Badge>}
                                                    {item.isFromPrescription && <Badge variant="secondary" className="text-[9px] h-4 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">RX</Badge>}
                                                    <h5 className="font-bold text-slate-900 truncate text-sm leading-none">{item.name}</h5>
                                                </div>
                                                <p className="text-xs font-bold text-slate-400 font-mono">${item.unitPrice.toLocaleString()}</p>
                                            </div>
                                            
                                            <div className="flex items-center gap-1 bg-slate-50 rounded-lg p-1 border border-slate-200/60">
                                                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md text-slate-500 hover:text-rose-600 hover:bg-rose-50" onClick={() => updateQuantity(item.id, -1)}>
                                                    <Minus className="size-3" />
                                                </Button>
                                                <span className="w-8 text-center font-black text-sm text-slate-700">{item.quantity}</span>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md text-slate-500 hover:text-emerald-600 hover:bg-emerald-50" onClick={() => updateQuantity(item.id, 1)}>
                                                    <Plus className="size-3" />
                                                </Button>
                                            </div>
                                            
                                            <div className="w-20 text-right">
                                                <span className="font-black text-slate-900 block">${(item.unitPrice * item.quantity).toLocaleString()}</span>
                                            </div>
                                            
                                            <Button variant="ghost" size="icon" className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-rose-500 hover:bg-rose-50 hover:border-rose-200 opacity-0 group-hover:opacity-100 transition-all z-10 shadow-sm" onClick={() => removeFromCart(item.id)}>
                                                <X className="size-3" />
                                            </Button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* PAYMENT CONTROLS */}
                    <div className="shrink-0 bg-white border-t border-slate-200 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)] z-10 flex flex-col">
                        
                        {/* Calculations Row */}
                        <div className="grid grid-cols-2 md:grid-cols-4 border-b border-slate-100 divide-x divide-slate-100">
                            <div className="p-3 px-4 flex flex-col">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Subtotal</span>
                                <span className="text-base font-bold text-slate-900">${subtotal.toLocaleString()}</span>
                            </div>
                            <div className="p-3 px-4 flex flex-col relative group">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 group-hover:text-primary transition-colors cursor-pointer border-b border-dashed border-slate-300 w-fit">Discount</span>
                                <div className="flex items-center gap-1">
                                    <span className="text-base font-bold text-slate-900">-</span>
                                    <Input 
                                        type="number" 
                                        className="h-6 w-full px-1 py-0 text-base font-bold bg-transparent border-0 border-b border-transparent focus-visible:border-primary focus-visible:ring-0 rounded-none shadow-none" 
                                        value={discount || ''}
                                        onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                                        placeholder="$0.00"
                                    />
                                </div>
                            </div>
                            <div className="p-3 px-4 flex flex-col relative group">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 group-hover:text-cyan-500 transition-colors cursor-pointer border-b border-dashed border-slate-300 w-fit flex items-center gap-1">
                                    Insurance <ShieldCheck className="size-3" />
                                </span>
                                <div className="flex items-center gap-1">
                                    <span className="text-base font-bold text-slate-900">-</span>
                                    <Input 
                                        type="number" 
                                        className="h-6 w-full px-1 py-0 text-base font-bold bg-transparent border-0 border-b border-transparent focus-visible:border-cyan-500 focus-visible:ring-0 rounded-none shadow-none text-cyan-700" 
                                        value={insuranceCoverage || ''}
                                        onChange={(e) => setInsuranceCoverage(parseFloat(e.target.value) || 0)}
                                        placeholder="$0.00"
                                        disabled={!selectedPatient}
                                    />
                                </div>
                            </div>
                            <div className="p-3 px-4 flex flex-col bg-emerald-50/50">
                                <span className="text-[10px] font-black text-emerald-600/70 uppercase tracking-widest mb-1">Total Due</span>
                                <span className="text-2xl font-black text-emerald-600 tracking-tighter leading-none">${total.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Payment Methods */}
                        <div className="p-4 flex flex-col gap-4">
                            <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
                                {PAYMENT_METHODS.map(method => (
                                    <button
                                        key={method.id}
                                        onClick={() => setPaymentMethod(method.id)}
                                        className={cn(
                                            "flex items-center justify-center gap-2 h-10 px-4 rounded-xl border font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap outline-none",
                                            paymentMethod === method.id 
                                                ? method.bg + ' shadow-sm ring-2 ring-offset-1 ' + method.color.replace('text-', 'ring-')
                                                : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                                        )}
                                    >
                                        <method.icon className="size-4" />
                                        {method.label}
                                    </button>
                                ))}
                            </div>

                            <div className="flex gap-3">
                                {paymentMethod === 'cash' && (
                                    <div className="w-1/3 relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <span className="text-slate-400 font-bold">$</span>
                                        </div>
                                        <Input
                                            className="h-14 bg-white border-slate-200 text-slate-900 font-black text-lg text-center rounded-2xl focus-visible:ring-emerald-500 shadow-sm"
                                            placeholder="Tend. Amount"
                                            value={amountPaid}
                                            onChange={e => setAmountPaid(e.target.value)}
                                        />
                                    </div>
                                )}
                                
                                <Button
                                    className="flex-1 h-14 rounded-2xl text-lg font-black tracking-widest uppercase bg-slate-900 text-white hover:bg-slate-800 shadow-xl transition-all hover:translate-y-[-2px] hover:shadow-2xl active:translate-y-[0px] disabled:opacity-50 disabled:hover:translate-y-0"
                                    disabled={cart.length === 0 || isProcessing || (total > 0 && Number(amountPaid) > 0 && Number(amountPaid) < total)}
                                    onClick={handleCheckout}
                                >
                                    {isProcessing ? (
                                        <Loader2 className="size-5 animate-spin md:mr-2" />
                                    ) : (
                                        <CheckCircle2 className="size-5 md:mr-2" />
                                    )}
                                    <span className="hidden md:inline">
                                        {isProcessing ? "PROCESSING..." : `TENDER $${total.toLocaleString()}`}
                                    </span>
                                </Button>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* PATIENT HISTORY MODAL */}
            <Dialog open={showHistory} onOpenChange={setShowHistory}>
                <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden rounded-3xl">
                    <DialogHeader className="p-6 border-b bg-slate-50 shrink-0">
                        <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                            <History className="size-5 text-primary" />
                            Financial History
                        </DialogTitle>
                        <DialogDescription>
                            Recent transactions and pending items for {selectedPatient?.firstName} {selectedPatient?.lastName}
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="flex-1 p-6">
                        {patientHistory ? (
                            <div className="space-y-6">
                                <div>
                                    <h4 className="font-bold text-sm text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <Receipt className="size-4" /> Recent Invoices
                                    </h4>
                                    <div className="space-y-2">
                                        {patientHistory.invoices?.length > 0 ? (
                                            patientHistory.invoices.map((inv: any) => (
                                                <div key={inv.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 transition-colors">
                                                    <div>
                                                        <p className="font-bold text-sm text-slate-900">{inv.invoice_id}</p>
                                                        <p className="text-xs text-slate-500 font-mono">{new Date(inv.date).toLocaleDateString()}</p>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="text-right">
                                                            <p className="font-black text-emerald-600">${inv.total}</p>
                                                            <Badge variant="outline" className={cn("text-[9px] uppercase tracking-widest", inv.status === 'paid' ? 'text-emerald-600 border-emerald-200' : 'text-amber-600 border-amber-200')}>{inv.status}</Badge>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-sm text-slate-500 italic p-4 bg-slate-50 rounded-xl border border-dashed text-center">No previous invoices found.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-40 flex items-center justify-center">
                                <Loader2 className="size-6 animate-spin text-slate-400" />
                            </div>
                        )}
                    </ScrollArea>
                </DialogContent>
            </Dialog>            

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
                                    {lastInvoice?.items?.map((item, i) => (
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
                                    {lastInvoice?.items?.map((item, i) => (
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
