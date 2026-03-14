"use client"

import { useState, useEffect } from "react"
import { 
    Dialog, DialogContent, DialogHeader, DialogTitle, 
    DialogDescription 
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { hrApi } from "@/lib/api"
import { cn } from "@/lib/utils"
import { FileText, ArrowDownLeft, ArrowUpRight, Wallet } from "lucide-react"

interface EmployeeLedgerProps {
    employee: any
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function EmployeeLedger({ employee, open, onOpenChange }: EmployeeLedgerProps) {
    const [data, setData] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        if (open && employee?.id) {
            loadLedger()
        }
    }, [open, employee])

    const loadLedger = async () => {
        setIsLoading(true)
        try {
            const res = await hrApi.getEmployeeDetails(employee.id)
            setData(res)
        } catch (err) {
            console.error("Failed to load ledger", err)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl rounded-2xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-xl">
                            {employee?.full_name?.charAt(0)}
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-bold">{employee?.full_name}</DialogTitle>
                            <DialogDescription className="text-xs">{employee?.employee_id} • Professional Ledger History</DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="grid grid-cols-3 gap-4 py-4">
                    <div className="p-4 bg-slate-100 rounded-2xl">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Monthly Base</p>
                        <p className="text-lg font-black text-slate-900 mt-1">${parseFloat(employee?.base_salary || 0).toLocaleString()}</p>
                    </div>
                    <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100/50">
                        <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest leading-none text-rose-500">Total Deducted</p>
                        <p className="text-lg font-black text-rose-600 mt-1">${(data?.expenses?.reduce((s:any, e:any) => s + (e.status === 'deducted' ? parseFloat(e.amount) : 0), 0) || 0).toLocaleString()}</p>
                    </div>
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100/50">
                        <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest leading-none text-emerald-500">Total Paid</p>
                        <p className="text-lg font-black text-emerald-600 mt-1">${(data?.payroll?.reduce((s:any, p:any) => s + (p.payment_status === 'paid' ? parseFloat(p.final_salary) : 0), 0) || 0).toLocaleString()}</p>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <History className="size-3" /> Ledger Transactions
                    </h4>
                    <div className="flex-1 border rounded-2xl overflow-hidden bg-white">
                        <div className="overflow-y-auto max-h-[400px]">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                                        <th className="px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</th>
                                        <th className="px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Debit</th>
                                        <th className="px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Credit</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {isLoading ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <tr key={i} className="animate-pulse"><td colSpan={4} className="h-10 bg-slate-50/50"></td></tr>
                                        ))
                                    ) : data?.ledger?.length === 0 ? (
                                        <tr><td colSpan={4} className="py-10 text-center text-xs text-slate-400">No transactions recorded yet.</td></tr>
                                    ) : data?.ledger?.map((item: any) => (
                                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-4 py-3 text-[11px] font-medium text-slate-500">{format(new Date(item.date), 'dd MMM yyyy')}</td>
                                            <td className="px-4 py-3 text-xs font-bold text-slate-900">{item.description}</td>
                                            <td className="px-4 py-3">
                                                {item.type === 'debit' && (
                                                    <span className="text-xs font-black text-rose-600">-${parseFloat(item.amount).toLocaleString()}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {item.type === 'credit' && (
                                                    <span className="text-xs font-black text-emerald-600">+${parseFloat(item.amount).toLocaleString()}</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

function History({ className }: { className?: string }) {
    return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="m12 7 0 5 3 3"/></svg>
}
