"use client"

import { useState, useMemo } from "react"
import {
    Plus,
    Search,
    Filter,
    AlertTriangle,
    Calendar,
    Package,
    MoreVertical,
    Edit,
    Trash2,
    ArrowUpDown,
    CheckCircle2
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/shared/status-badge"
import { pharmacyApi, type Medicine } from "@/lib/api"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

interface Props {
    medicines: Medicine[]
    onRefresh: () => void
}

export function InventoryManagement({ medicines, onRefresh }: Props) {
    const [search, setSearch] = useState("")
    const [isAdding, setIsAdding] = useState(false)
    const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null)

    const [formData, setFormData] = useState<Partial<Medicine>>({
        name: "",
        genericName: "",
        category: "Tablet",
        manufacturer: "",
        batchNumber: "",
        expiryDate: "",
        quantity: 0,
        reorderLevel: 10,
        unitPrice: 0,
        sellingPrice: 0,
        unit: "tablet"
    })

    const filtered = useMemo(() => {
        return medicines.filter(m =>
            m.name.toLowerCase().includes(search.toLowerCase()) ||
            m.genericName?.toLowerCase().includes(search.toLowerCase()) ||
            m.batchNumber?.toLowerCase().includes(search.toLowerCase())
        )
    }, [medicines, search])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            if (selectedMedicine) {
                await pharmacyApi.updateMedicine(selectedMedicine.id, formData)
                toast.success("Medicine updated")
            } else {
                await pharmacyApi.createMedicine(formData)
                toast.success("Medicine added")
            }
            setIsAdding(false)
            setSelectedMedicine(null)
            onRefresh()
        } catch (error) {
            toast.error("Operation failed")
        }
    }

    const handleDelete = async (id: string) => {
        if (confirm("Delete this medicine?")) {
            await pharmacyApi.deleteMedicine(id)
            onRefresh()
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                        placeholder="Search inventory (name, batch, generic)..."
                        className="pl-9"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-2">
                        <Filter className="size-4" />
                        Filter
                    </Button>
                    <Button size="sm" className="gap-2" onClick={() => {
                        setFormData({
                            name: "", genericName: "", category: "Tablet", manufacturer: "",
                            batchNumber: "", expiryDate: "", quantity: 0, reorderLevel: 10,
                            unitPrice: 0, sellingPrice: 0, unit: "tablet"
                        })
                        setSelectedMedicine(null)
                        setIsAdding(true)
                    }}>
                        <Plus className="size-4" />
                        Add Medicine
                    </Button>
                </div>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Medicine Name</TableHead>
                                <TableHead>Batch #</TableHead>
                                <TableHead>Stock</TableHead>
                                <TableHead>Price (Sell)</TableHead>
                                <TableHead>Expiry</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.map((med) => (
                                <TableRow key={med.id}>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-bold">{med.name}</span>
                                            <span className="text-[10px] text-muted-foreground uppercase">{med.category} • {med.genericName}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">{med.batchNumber || "N/A"}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <span className={med.quantity <= med.reorderLevel ? "text-rose-500 font-bold" : ""}>
                                                {med.quantity}
                                            </span>
                                            {med.quantity <= med.reorderLevel && (
                                                <AlertTriangle className="size-3 text-rose-500" />
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>${med.sellingPrice}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-xs">{med.expiryDate || "N/A"}</span>
                                            {new Date(med.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && (
                                                <span className="text-[9px] text-rose-500 font-bold uppercase italic">Expiring Soon</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell><StatusBadge status={med.status} /></TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="size-8">
                                                    <MoreVertical className="size-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => {
                                                    setSelectedMedicine(med)
                                                    setFormData({ ...med })
                                                    setIsAdding(true)
                                                }}>
                                                    <Edit className="size-4 mr-2" /> Edit Item
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="text-rose-500" onClick={() => handleDelete(med.id)}>
                                                    <Trash2 className="size-4 mr-2" /> Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filtered.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground italic">No medicines found in inventory</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isAdding} onOpenChange={setIsAdding}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{selectedMedicine ? "Update Medicine" : "Register New Medicine"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Medicine Name</Label>
                                <Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Generic Name</Label>
                                <Input value={formData.genericName} onChange={e => setFormData({ ...formData, genericName: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Category</Label>
                                <Select value={formData.category} onValueChange={v => setFormData({ ...formData, category: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Tablet">Tablet</SelectItem>
                                        <SelectItem value="Syrup">Syrup</SelectItem>
                                        <SelectItem value="Injection">Injection</SelectItem>
                                        <SelectItem value="Ointment">Ointment</SelectItem>
                                        <SelectItem value="Capsule">Capsule</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Manufacturer</Label>
                                <Input value={formData.manufacturer} onChange={e => setFormData({ ...formData, manufacturer: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Batch Number</Label>
                                <Input value={formData.batchNumber} onChange={e => setFormData({ ...formData, batchNumber: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Expiry Date</Label>
                                <Input type="date" value={formData.expiryDate} onChange={e => setFormData({ ...formData, expiryDate: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Initial Quantity</Label>
                                <Input type="number" value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Reorder Level</Label>
                                <Input type="number" value={formData.reorderLevel} onChange={e => setFormData({ ...formData, reorderLevel: parseInt(e.target.value) })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Cost Price ($)</Label>
                                <Input type="number" step="0.01" value={formData.unitPrice} onChange={e => setFormData({ ...formData, unitPrice: parseFloat(e.target.value) })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Selling Price ($)</Label>
                                <Input type="number" step="0.01" value={formData.sellingPrice} onChange={e => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) })} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsAdding(false)}>Cancel</Button>
                            <Button type="submit">Save Medicine</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
