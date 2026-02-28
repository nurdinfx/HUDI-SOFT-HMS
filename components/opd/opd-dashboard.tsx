"use client"

import { useEffect, useState } from "react"
import {
    Users,
    Clock,
    CheckCircle2,
    TrendingUp,
    Plus,
    Calendar,
    ArrowRight,
    Stethoscope,
    AlertTriangle,
    FlaskConical
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { opdApi, laboratoryApi, type OPDAnalytics, type LabTest } from "@/lib/api"
import { cn } from "@/lib/utils"

interface OPDDashboardProps {
    onAction: (action: string) => void
}

export function OPDDashboard({ onAction }: OPDDashboardProps) {
    const [stats, setStats] = useState<OPDAnalytics | null>(null)
    const [criticalResults, setCriticalResults] = useState<LabTest[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadStats()
        const interval = setInterval(loadStats, 30000) // Refresh every 30s
        return () => clearInterval(interval)
    }, [])

    const loadStats = async () => {
        try {
            const [data, criticals] = await Promise.all([
                opdApi.getStats(),
                laboratoryApi.getAll({ critical: '1' })
            ])
            setStats(data)
            setCriticalResults(criticals)
        } catch (error) {
            console.error("Failed to load OPD stats:", error)
        } finally {
            setLoading(false)
        }
    }

    if (loading || !stats) return <div className="p-8 text-center text-muted-foreground">Loading dashboard...</div>

    return (
        <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="relative overflow-hidden group hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">Today's Visits</CardTitle>
                        <Users className="size-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.todayVisits}</div>
                        <p className="text-xs text-muted-foreground mt-1">Total registered today</p>
                        <div className="absolute bottom-0 left-0 h-1 bg-primary w-full opacity-20" />
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden group hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">Waiting Queue</CardTitle>
                        <Clock className="size-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.waitingCount}</div>
                        <p className="text-xs text-muted-foreground mt-1">Patients in waiting room</p>
                        <div className="absolute bottom-0 left-0 h-1 bg-amber-500 w-full opacity-20" />
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden group hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">In Consultation</CardTitle>
                        <Stethoscope className="size-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.consultingCount}</div>
                        <p className="text-xs text-muted-foreground mt-1">Active doctor sessions</p>
                        <div className="absolute bottom-0 left-0 h-1 bg-blue-500 w-full opacity-20" />
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden group hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">Revenue (Today)</CardTitle>
                        <TrendingUp className="size-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${stats.dailyRevenue.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground mt-1">Accrued consultation fees</p>
                        <div className="absolute bottom-0 left-0 h-1 bg-emerald-500 w-full opacity-20" />
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Real-Time Patient Queue</CardTitle>
                            <CardDescription>Current status of patients in the OPD wing</CardDescription>
                        </div>
                        <Badge variant="outline" className="font-mono">{stats.queueStatus.length} Active</Badge>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/30">
                                        <th className="px-4 py-2 font-medium text-left">Token</th>
                                        <th className="px-4 py-2 font-medium text-left">Patient</th>
                                        <th className="px-4 py-2 font-medium text-left">Visit ID</th>
                                        <th className="px-4 py-2 font-medium text-left">Status</th>
                                        <th className="px-4 py-2 font-medium text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.queueStatus.slice(0, 10).map((q) => (
                                        <tr key={q.visitId} className="border-b hover:bg-muted/30 transition-colors">
                                            <td className="px-4 py-3 font-mono font-bold">{q.token}</td>
                                            <td className="px-4 py-3 font-medium">{q.patientName}</td>
                                            <td className="px-4 py-3 text-xs text-muted-foreground">{q.visitId}</td>
                                            <td className="px-4 py-3">
                                                <Badge variant={q.status === 'waiting' ? 'secondary' : q.status === 'in-consultation' ? 'default' : 'outline'}>
                                                    {q.status}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <Button variant="ghost" size="sm" className="h-8" onClick={() => onAction(`view-${q.visitId}`)}>
                                                    <ArrowRight className="size-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                    {stats.queueStatus.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="py-8 text-center text-muted-foreground italic">
                                                Empty queue. Register a patient to start today's visits.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex flex-col gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-2">
                            <Button className="w-full justify-start gap-2 h-10" onClick={() => onAction('new-visit')}>
                                <Plus className="size-4" /> New OPD Visit
                            </Button>
                            <Button variant="outline" className="w-full justify-start gap-2 h-10" onClick={() => onAction('new-patient')}>
                                <Users className="size-4" /> Register Patient
                            </Button>
                            <Button variant="outline" className="w-full justify-start gap-2 h-10" onClick={() => onAction('view-billing')}>
                                <TrendingUp className="size-4" /> View Daily Billing
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="border-red-100 bg-red-50/10">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-bold flex items-center gap-2 text-red-600">
                                <AlertTriangle className="size-4 animate-pulse" />
                                Critical Lab Alerts
                            </CardTitle>
                            <CardDescription className="text-[10px]">Urgent attention required for these results</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <ScrollArea className="h-[200px]">
                                <div className="divide-y divide-red-100">
                                    {criticalResults.map((r) => (
                                        <div key={r.id} className="p-3 hover:bg-red-50 transition-colors cursor-pointer" onClick={() => onAction(`view-${r.id}`)}>
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="text-[10px] font-black text-red-500 uppercase tracking-tighter">{r.testName}</span>
                                                <Badge className="bg-red-600 text-[8px] h-3.5 px-1 font-black animate-pulse">CRITICAL</Badge>
                                            </div>
                                            <p className="text-xs font-bold text-slate-900">{r.patientName}</p>
                                            <div className="flex justify-between items-center mt-1">
                                                <span className="text-[10px] text-slate-500 font-mono">{r.testId}</span>
                                                <span className="text-[10px] font-black text-red-700">{r.results}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {criticalResults.length === 0 && (
                                        <div className="p-8 text-center text-slate-400">
                                            <FlaskConical className="size-8 mx-auto opacity-10 mb-2" />
                                            <p className="text-[10px] font-medium italic">No critical results reported today.</p>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base font-semibold">Today's Performance</CardTitle>
                            <CardDescription>Departmental breakdown</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {stats.departmentStats.map((dept) => (
                                <div key={dept.department} className="space-y-1">
                                    <div className="flex justify-between text-xs font-medium">
                                        <span>{dept.department}</span>
                                        <span>{dept.count}</span>
                                    </div>
                                    <Progress value={(dept.count / stats.todayVisits) * 100} className="h-1" />
                                </div>
                            ))}
                            {stats.departmentStats.length === 0 && <p className="text-xs text-muted-foreground text-center">No departmental data yet.</p>}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
