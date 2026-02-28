"use client"

import { useState, useEffect } from "react"
import { Search, FlaskConical, Plus, CheckCircle2, Clock, AlertCircle, FileText, Printer, Download, ClipboardList } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { laboratoryApi, type LabTest, type LabCatalogItem, type OPDVisit } from "@/lib/api"
import { toast } from "sonner"
import { StatusBadge } from "@/components/shared/status-badge"
import { Dialog, DialogContent } from "@/components/ui/dialog"

interface LabInvestigationsTabProps {
    visit: OPDVisit
}

export function LabInvestigationsTab({ visit }: LabInvestigationsTabProps) {
    const [catalog, setCatalog] = useState<LabCatalogItem[]>([])
    const [patientTests, setPatientTests] = useState<LabTest[]>([])
    const [search, setSearch] = useState("")
    const [orderPriority, setOrderPriority] = useState("normal")
    const [loading, setLoading] = useState(false)
    const [selectedTest, setSelectedTest] = useState<LabTest | null>(null)
    const [isReportModalOpen, setIsReportModalOpen] = useState(false)

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
        const element = document.getElementById('report-content-opd')
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
            const script = document.createElement('script')
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
            script.onload = startDownload
            document.head.appendChild(script)
        }
    }

    useEffect(() => {
        loadData()
    }, [visit.patientId])

    const loadData = async () => {
        try {
            const [cat, tests] = await Promise.all([
                laboratoryApi.getCatalog(),
                laboratoryApi.getAll({ patientId: visit.patientId })
            ])
            setCatalog(cat)
            setPatientTests(tests)
        } catch (error) {
            console.error("Failed to load lab data:", error)
        }
    }

    const handleOrderTest = async (item: LabCatalogItem) => {
        setLoading(true)
        try {
            await laboratoryApi.create({
                patientId: visit.patientId,
                patientName: visit.patientName,
                doctorId: visit.doctorId,
                doctorName: visit.doctorName,
                testName: item.name,
                testCategory: item.category,
                sampleType: item.sampleType,
                priority: orderPriority,
                cost: item.cost
            })
            toast.success(`${item.name} ordered successfully`)
            loadData()
        } catch (error) {
            toast.error("Failed to order test")
        } finally {
            setLoading(false)
        }
    }

    const filteredCatalog = catalog.filter(item =>
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.category.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-500">
            {/* Catalog Ordering Side */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold flex items-center gap-2">
                        <FlaskConical className="size-4 text-primary" />
                        Available Investigations
                    </h3>
                    <div className="flex items-center gap-2">
                        <Label className="text-[10px] font-bold uppercase text-muted-foreground">Priority:</Label>
                        <Select value={orderPriority} onValueChange={setOrderPriority}>
                            <SelectTrigger className="h-7 w-[100px] text-[10px] font-bold rounded-lg border-primary/20 bg-primary/5">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="normal">Routine</SelectItem>
                                <SelectItem value="urgent">Urgent</SelectItem>
                                <SelectItem value="emergency">Emergency</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                        placeholder="Search catalog (e.g. CBC, Lipid)..."
                        className="pl-9 h-11 rounded-xl bg-white focus-visible:ring-primary/20"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <ScrollArea className="h-[435px] border-none rounded-2xl bg-slate-50/50 p-2 shadow-inner">
                    <div className="grid gap-2 pr-4">
                        {filteredCatalog.map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-primary/30 transition-all group">
                                <div className="space-y-0.5">
                                    <p className="text-sm font-bold text-slate-900">{item.name}</p>
                                    <div className="flex gap-2">
                                        <Badge variant="secondary" className="text-[9px] h-4 uppercase font-black tracking-tighter bg-slate-100">{item.category}</Badge>
                                        <span className="text-[10px] text-slate-500 font-medium">{item.sampleType}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-mono font-black text-primary">${item.cost}</span>
                                    <Button
                                        size="sm"
                                        variant="default"
                                        className="h-8 w-8 p-0 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-md shadow-primary/20"
                                        disabled={loading}
                                        onClick={() => handleOrderTest(item)}
                                    >
                                        <Plus className="size-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>

            {/* Patient Test History Side */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold flex items-center gap-2">
                    <Clock className="size-4 text-amber-500" />
                    Patient Diagnostic Status
                </h3>
                <ScrollArea className="h-[490px] border-none rounded-2xl bg-white shadow-xl shadow-slate-200/50 p-4 border border-slate-100">
                    <div className="space-y-4 pr-3">
                        {patientTests.length === 0 && (
                            <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed">
                                <AlertCircle className="size-10 mx-auto text-slate-200 mb-2" />
                                <p className="text-xs text-slate-400 font-medium italic px-6">No diagnostic investigations have been recorded for this patient yet.</p>
                            </div>
                        )}
                        {patientTests.map((test) => (
                            <Card key={test.id} className={`overflow-hidden border-none shadow-sm transition-all ${test.criticalFlag ? 'ring-2 ring-red-500/50' : 'bg-slate-50/50'}`}>
                                <CardContent className="p-4 space-y-4">
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-[9px] font-black text-slate-400 uppercase tracking-widest">{test.testId}</span>
                                                <StatusBadge status={test.priority} className="text-[8px] h-3.5 px-1 font-black" />
                                            </div>
                                            <p className="text-sm font-black text-slate-900">{test.testName}</p>
                                        </div>
                                        <StatusBadge status={test.status} />
                                    </div>

                                    {test.status === 'completed' && test.results ? (
                                        <div className={`p-4 rounded-xl border-2 ${test.criticalFlag ? 'bg-red-50 border-red-100 animate-pulse' : 'bg-white border-emerald-50'}`}>
                                            <div className="flex items-center justify-between mb-3">
                                                <div className={`flex items-center gap-2 ${test.criticalFlag ? 'text-red-600' : 'text-emerald-700'}`}>
                                                    <CheckCircle2 className="size-4" />
                                                    <span className="text-[10px] uppercase font-black tracking-widest">Diagnostic Findings</span>
                                                </div>
                                                {test.criticalFlag && (
                                                    <Badge className="bg-red-600 text-white text-[9px] font-black animate-pulse">CRITICAL ALERT</Badge>
                                                )}
                                            </div>
                                            <p className={`text-base font-black ${test.criticalFlag ? 'text-red-950' : 'text-emerald-950'} mb-2`}>{test.results}</p>
                                            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100">
                                                <div>
                                                    <p className="text-[8px] uppercase font-black text-slate-400 tracking-tighter mb-1">Reference Range</p>
                                                    <p className="text-[11px] font-mono font-bold text-slate-700">{test.normalRange || 'N/A'}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[8px] uppercase font-black text-slate-400 tracking-tighter mb-1">Technician</p>
                                                    <p className="text-[11px] font-bold text-slate-700">{test.sampleCollectedBy || 'Automated'}</p>
                                                </div>
                                            </div>
                                            {test.clinicalNotes && (
                                                <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1 italic">Clinical Interpretations</p>
                                                    <p className="text-[11px] text-slate-600 leading-relaxed font-medium italic">{test.clinicalNotes}</p>
                                                </div>
                                            )}
                                            <div className="mt-4 flex justify-end">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 rounded-lg border-primary/20 text-primary font-bold transition-all hover:bg-primary hover:text-white"
                                                    onClick={() => { setSelectedTest(test); setIsReportModalOpen(true) }}
                                                >
                                                    <FileText className="size-3.5 mr-2" />
                                                    View Final Report
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl">
                                            <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold">
                                                <Clock className="size-3" />
                                                <span>Requested {new Date(test.orderedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                            {test.sampleCollectedAt && (
                                                <div className="flex items-center gap-1 text-indigo-500 text-[9px] font-black uppercase">
                                                    <Plus className="size-3" /> Sampled
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </ScrollArea>
            </div>

            {/* REPORT PREVIEW MODAL */}
            <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
                <DialogContent
                    className="max-h-[96vh] p-0 overflow-hidden border-none rounded-2xl shadow-2xl flex flex-col"
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
                            .bg-slate-900 { background-color: #0f172a !important; color: white !important; }
                        }
                    `}</style>
                    <ScrollArea className="flex-1">
                        <div id="report-content-opd" className="printable-area">
                            <div className="absolute top-0 right-0 p-8 opacity-10">
                                <FlaskConical className="size-32" />
                            </div>
                            <div className="relative z-10 flex justify-between items-start">
                                <div>
                                    <Badge className="bg-primary/20 text-primary-foreground border-primary/20 mb-4 px-3 py-1 text-xs font-black tracking-widest uppercase">
                                        Official Diagnostic Report
                                    </Badge>
                                    <h2 className="text-3xl font-black tracking-tighter mb-1 uppercase">MedCore Clinical Lab</h2>
                                    <p className="text-slate-400 text-sm font-medium">Department of Pathology & Laboratory Medicine</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-mono text-xs text-slate-400 mb-1">REFERENCE NO</p>
                                    <p className="text-xl font-black tracking-tight">{selectedTest?.testId}</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-white space-y-8">
                            <div className="grid grid-cols-2 gap-12">
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Patient Demographics</h4>
                                    <div className="space-y-2">
                                        <p className="text-lg font-black text-slate-900 uppercase">{selectedTest?.patientName}</p>
                                        <div className="flex gap-4 text-xs font-bold text-slate-500">
                                            <span className="flex items-center gap-1 group"><span className="text-slate-300">ID:</span> {selectedTest?.patientId}</span>
                                            <span className="flex items-center gap-1"><span className="text-slate-300">GENDER:</span> MALE</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Clinical Context</h4>
                                    <div className="space-y-2 text-xs font-bold">
                                        <p className="flex justify-between border-b border-dashed border-slate-100 pb-1">
                                            <span className="text-slate-400 uppercase">Referring Physician</span>
                                            <span className="text-slate-900">{selectedTest?.doctorName || 'WALK-IN'}</span>
                                        </p>
                                        <p className="flex justify-between border-b border-dashed border-slate-100 pb-1">
                                            <span className="text-slate-400 uppercase">Sample Collection</span>
                                            <span className="text-slate-900">{selectedTest?.sampleCollectedAt ? new Date(selectedTest.sampleCollectedAt).toLocaleString() : 'N/A'}</span>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4">
                                <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2">
                                    <h4 className="font-black text-slate-900 uppercase tracking-tighter text-lg flex items-center gap-2">
                                        Investigation Findings
                                    </h4>
                                    <Badge className={`${selectedTest?.criticalFlag ? 'bg-red-500' : 'bg-emerald-500'} text-white text-[10px] font-black px-4 py-1 rounded-full shadow-lg`}>
                                        {selectedTest?.criticalFlag ? 'CRITICAL ALERT' : 'NORMAL RANGE'}
                                    </Badge>
                                </div>
                                <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase">Test Parameter</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase text-center">Result</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase text-right">Reference Range</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            <tr>
                                                <td className="px-6 py-8">
                                                    <p className="font-black text-slate-900 text-lg uppercase tracking-tight">{selectedTest?.testName}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">{selectedTest?.testCategory}</p>
                                                </td>
                                                <td className="px-6 py-8 text-center">
                                                    <span className={`text-3xl font-black leading-none ${selectedTest?.criticalFlag ? 'text-red-600' : 'text-slate-900'}`}>
                                                        {selectedTest?.results}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-8 text-right">
                                                    <p className="font-mono text-sm font-black text-slate-600 bg-slate-50 inline-block px-3 py-1 rounded-lg border border-slate-100">
                                                        {selectedTest?.normalRange || 'NOT DEFINED'}
                                                    </p>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 italic">Pathologist Interpretation</h5>
                                <p className="text-sm text-slate-700 leading-relaxed font-medium italic">
                                    {selectedTest?.clinicalNotes || "No clinical discrepancies noted. Findings correlate with provided medical history."}
                                </p>
                            </div>

                        </div>
                    </ScrollArea>

                    <div className="bg-slate-50 p-6 flex justify-between gap-4 border-t border-slate-100 no-print">
                        <Button variant="ghost" className="rounded-xl h-12 font-black text-slate-400 hover:text-slate-900 uppercase tracking-widest text-xs" onClick={() => setIsReportModalOpen(false)}>CLOSE REVIEW</Button>
                        <div className="flex gap-3">
                            <Button variant="outline" className="rounded-xl h-12 px-8 font-black border-2 border-slate-200 shadow-sm transition-all hover:bg-white hover:border-slate-300 uppercase tracking-widest text-xs" onClick={handleDownload}>
                                <Download className="size-4 mr-2" />
                                EXPORT PDF
                            </Button>
                            <Button className="rounded-xl h-12 px-10 font-black shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] uppercase tracking-widest text-xs" onClick={handlePrint}>
                                <Printer className="size-4 mr-2" />
                                PRINT DOCUMENT
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
