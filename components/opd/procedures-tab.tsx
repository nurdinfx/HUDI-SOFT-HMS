"use client"

import { useState, useEffect } from "react"
import { 
    Plus, 
    Trash2, 
    Edit2, 
    CheckCircle2, 
    XCircle, 
    DollarSign,
    Clipboard,
    Activity,
    AlertTriangle
} from "lucide-react"
import { procedureApi, type Procedure, type OPDVisit } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { format } from "date-fns"

interface ProceduresTabProps {
    visit: OPDVisit
}

export function ProceduresTab({ visit }: ProceduresTabProps) {
    const [procedures, setProcedures] = useState<Procedure[]>([])
    const [loading, setLoading] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingProcedure, setEditingProcedure] = useState<Procedure | null>(null)
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        category: "General",
        cost: ""
    })

    const fetchProcedures = async () => {
        setLoading(true)
        try {
            const data = await procedureApi.getByVisitId(visit.id)
            setProcedures(data)
        } catch (error) {
            console.error(error)
            toast.error("Failed to load procedures")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchProcedures()
    }, [visit.id])

    const handleOpenAdd = () => {
        setEditingProcedure(null)
        setFormData({ name: "", description: "", category: "General", cost: "" })
        setIsModalOpen(true)
    }

    const handleOpenEdit = (proc: Procedure) => {
        setEditingProcedure(proc)
        setFormData({
            name: proc.name,
            description: proc.description || "",
            category: proc.category || "General",
            cost: proc.cost.toString()
        })
        setIsModalOpen(true)
    }

    const handleSubmit = async () => {
        if (!formData.name || !formData.cost) {
            toast.error("Name and cost are required")
            return
        }

        setLoading(true)
        try {
            if (editingProcedure) {
                await procedureApi.update(editingProcedure.id, {
                    ...formData,
                    cost: parseFloat(formData.cost)
                })
                toast.success("Procedure updated")
            } else {
                await procedureApi.create({
                    ...formData,
                    opdVisitId: visit.id,
                    patientId: visit.patientId,
                    doctorId: visit.doctorId,
                    cost: parseFloat(formData.cost)
                })
                toast.success("Procedure added and billed")
            }
            setIsModalOpen(false)
            fetchProcedures()
        } catch (error) {
            console.error(error)
            toast.error("Failed to save procedure")
        } finally {
            setLoading(false)
        }
    }

    const handleCancel = async (id: string) => {
        if (!confirm("Are you sure you want to cancel this procedure? This will reverse the revenue.")) return
        
        setLoading(true)
        try {
            await procedureApi.cancel(id)
            toast.success("Procedure cancelled and revenue reversed")
            fetchProcedures()
        } catch (error) {
            console.error(error)
            toast.error("Failed to cancel procedure")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-primary/5 p-4 rounded-xl border border-primary/10">
                <div>
                    <h3 className="font-black text-slate-900 uppercase italic tracking-tighter flex items-center gap-2">
                        <Activity className="size-4 text-primary" />
                        Clinical Procedures
                    </h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Record and bill procedures performed during this visit</p>
                </div>
                <Button onClick={handleOpenAdd} className="gap-2 font-black text-[10px] uppercase tracking-widest rounded-full px-6 shadow-lg shadow-primary/20">
                    <Plus className="size-3.5" />
                    Record Procedure
                </Button>
            </div>

            <div className="border rounded-2xl overflow-hidden bg-white shadow-sm">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow className="hover:bg-transparent border-slate-100">
                            <TableHead className="font-black text-[10px] uppercase tracking-widest h-12">Name</TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest h-12">Category</TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest h-12 text-right">Cost</TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest h-12 text-center">Status</TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest h-12 text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {procedures.map((proc) => (
                            <TableRow key={proc.id} className="hover:bg-slate-50/50 border-slate-50">
                                <TableCell>
                                    <div className="font-bold text-sm text-slate-900">{proc.name}</div>
                                    {proc.description && <div className="text-[10px] text-slate-400 font-medium line-clamp-1 italic">{proc.description}</div>}
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="text-[9px] font-black uppercase tracking-tighter rounded-md bg-slate-50 border-slate-100 text-slate-500">
                                        {proc.category}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right font-black text-sm text-slate-900 italic">
                                    ${proc.cost.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-center">
                                    {proc.status === 'active' ? (
                                        <Badge className="bg-emerald-50 text-emerald-600 border-none font-black text-[9px] uppercase tracking-widest rounded-lg px-2">
                                            <CheckCircle2 className="size-2 mr-1" />
                                            Active
                                        </Badge>
                                    ) : (
                                        <Badge className="bg-rose-50 text-rose-500 border-none font-black text-[9px] uppercase tracking-widest rounded-lg px-2">
                                            <XCircle className="size-2 mr-1" />
                                            Cancelled
                                        </Badge>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-1">
                                        {proc.status === 'active' && (
                                            <>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-8 w-8 text-slate-400 hover:text-primary rounded-full transition-all"
                                                    onClick={() => handleOpenEdit(proc)}
                                                >
                                                    <Edit2 className="size-3.5" />
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-8 w-8 text-slate-400 hover:text-rose-500 rounded-full transition-all"
                                                    onClick={() => handleCancel(proc.id)}
                                                >
                                                    <Trash2 className="size-3.5" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        {procedures.length === 0 && !loading && (
                            <TableRow>
                                <TableCell colSpan={5} className="h-32 text-center">
                                    <div className="flex flex-col items-center justify-center text-slate-400">
                                        <Clipboard className="size-8 opacity-20 mb-2" />
                                        <p className="text-xs font-bold uppercase tracking-widest opacity-40">No procedures recorded</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[500px] rounded-[2rem] p-8 border-none shadow-2xl overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                    
                    <DialogHeader className="relative">
                        <DialogTitle className="text-2xl font-black italic tracking-tighter text-slate-900 flex items-center gap-3">
                            <div className="size-10 bg-primary/10 rounded-2xl flex items-center justify-center">
                                <Activity className="size-6 text-primary" />
                            </div>
                            {editingProcedure ? 'EDIT PROCEDURE' : 'RECORD PROCEDURE'}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6 pt-6 relative">
                        <div className="grid gap-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Procedure Name</Label>
                            <Input 
                                placeholder="e.g. Ear Syringing, Wound Dressing..." 
                                className="h-12 rounded-2xl border-slate-100 bg-slate-50/50 font-bold focus:bg-white transition-all"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Category</Label>
                                <Select value={formData.category} onValueChange={v => setFormData({ ...formData, category: v })}>
                                    <SelectTrigger className="h-12 rounded-2xl border-slate-100 bg-slate-50/50 font-bold">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl">
                                        <SelectItem value="ENT">ENT</SelectItem>
                                        <SelectItem value="General">General</SelectItem>
                                        <SelectItem value="Surgery">Surgery</SelectItem>
                                        <SelectItem value="Orthopedic">Orthopedic</SelectItem>
                                        <SelectItem value="Dental">Dental</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Cost ($)</Label>
                                <div className="relative">
                                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-primary font-black opacity-40" />
                                    <Input 
                                        type="number"
                                        placeholder="0.00" 
                                        className="h-12 pl-10 rounded-2xl border-slate-100 bg-slate-50/50 font-black italic text-lg focus:bg-white transition-all"
                                        value={formData.cost}
                                        onChange={e => setFormData({ ...formData, cost: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Notes / Description</Label>
                            <Textarea 
                                placeholder="Additional clinical notes regarding the procedure..." 
                                className="min-h-[100px] rounded-2xl border-slate-100 bg-slate-50/50 font-medium focus:bg-white transition-all p-4"
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>

                        {editingProcedure && (
                            <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100/50">
                                <AlertTriangle className="size-5 text-amber-500" />
                                <p className="text-[10px] text-amber-600 font-bold leading-tight uppercase tracking-wider">
                                    Note: Updating the cost will automatically adjust the original financial transaction.
                                </p>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="pt-8">
                        <Button 
                            variant="ghost" 
                            className="h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest px-8"
                            onClick={() => setIsModalOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button 
                            className="h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest px-10 shadow-lg shadow-primary/20 gap-2"
                            onClick={handleSubmit}
                            disabled={loading}
                        >
                            {loading ? 'Processing...' : (editingProcedure ? 'UPDATE & SYNC BILL' : 'RECORD & GENERATE BILL')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
