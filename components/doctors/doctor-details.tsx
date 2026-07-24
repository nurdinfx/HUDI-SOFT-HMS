"use client"

import { useState, useEffect } from "react"
import {
    User,
    Mail,
    Phone,
    Stethoscope,
    Award,
    Calendar,
    Clock,
    DollarSign,
    TrendingUp,
    Activity,
    ArrowLeft,
    ChevronRight,
    MapPin
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { doctorsApi, type Doctor, type DoctorPerformance } from "@/lib/api"
import { StatusBadge } from "@/components/shared/status-badge"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

interface DoctorDetailsProps {
    doctor: Doctor
    onBack: () => void
    onEdit: () => void
}

export function DoctorDetails({ doctor, onBack, onEdit }: DoctorDetailsProps) {
    const [performance, setPerformance] = useState<DoctorPerformance | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        doctorsApi.getPerformance(doctor.id)
            .then(setPerformance)
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [doctor.id])

    return (
        <div className="space-y-6 animate-in slide-in-from-right duration-300">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={onBack}>
                    <ArrowLeft className="size-5" />
                </Button>
                <div>
                    <h2 className="text-2xl font-bold">{doctor.name}</h2>
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary">{doctor.specialization}</Badge>
                        <StatusBadge status={doctor.status} />
                    </div>
                </div>
                <div className="ml-auto">
                    <Button onClick={onEdit}>Edit Profile</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Profile Sidebar */}
                <div className="space-y-6">
                    <Card>
                        <CardContent className="pt-6 space-y-6">
                            <div className="size-32 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-4xl font-bold text-primary">
                                {doctor.name.replace("Dr. ", "").split(" ").map(n => n[0]).join("")}
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-sm">
                                    <Mail className="size-4 text-muted-foreground" />
                                    <span>{doctor.email}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <Phone className="size-4 text-muted-foreground" />
                                    <span>{doctor.phone}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <Award className="size-4 text-muted-foreground" />
                                    <span className="font-medium">{doctor.qualification}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <MapPin className="size-4 text-muted-foreground" />
                                    <span>Department: {doctor.department}</span>
                                </div>
                            </div>

                            <div className="pt-6 border-t">
                                <h4 className="text-xs font-bold uppercase text-muted-foreground mb-4">Availability Schedule</h4>
                                <div className="flex flex-wrap gap-1.5">
                                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => (
                                        <Badge
                                            key={day}
                                            variant={doctor.availableDays.includes(day) ? "default" : "outline"}
                                            className="text-[10px] px-2 py-0"
                                        >
                                            {day}
                                        </Badge>
                                    ))}
                                </div>
                                <p className="text-xs mt-4 text-muted-foreground flex items-center gap-1">
                                    <Clock className="size-3" />
                                    Shift: {doctor.availableTimeStart} - {doctor.availableTimeEnd}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-primary/5 border-primary/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <DollarSign className="size-4 text-primary" />
                                Revenue Impact
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-extrabold text-primary">${performance?.estimatedRevenue || 0}</div>
                            <p className="text-[10px] text-muted-foreground mt-1">Total consultation revenue generated to date.</p>
                        </CardContent>
                    </Card>
                </div>

                {/* performance Content */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div className="bg-emerald-500/10 p-2 rounded-lg text-emerald-600">
                                        <TrendingUp className="size-5" />
                                    </div>
                                    <span className="text-2xl font-bold">{performance?.totalAppointments || 0}</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-3 font-medium">Total Appointments</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div className="bg-sky-500/10 p-2 rounded-lg text-sky-600">
                                        <Stethoscope className="size-5" />
                                    </div>
                                    <span className="text-2xl font-bold">{performance?.opdVisits || 0}</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-3 font-medium">OPD Consultations</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div className="bg-violet-500/10 p-2 rounded-lg text-violet-600">
                                        <Activity className="size-5" />
                                    </div>
                                    <span className="text-2xl font-bold">{performance?.ipdAdmissions || 0}</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-3 font-medium">IPD Admissions</p>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Clinical Metrics</CardTitle>
                            <CardDescription>Performance breakdown across hospital modules.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Patient Satisfaction</span>
                                    <span className="font-bold">94%</span>
                                </div>
                                <Progress value={94} className="h-2" />
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Promptness (Wait Time)</span>
                                    <span className="font-bold">88%</span>
                                </div>
                                <Progress value={88} className="h-2" />
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Follow-up Retention</span>
                                    <span className="font-bold">75%</span>
                                </div>
                                <Progress value={75} className="h-2" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Activity</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className="size-8 rounded-full bg-muted flex items-center justify-center">
                                                <User className="size-4" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">Outpatient Visit #V-00{i}</p>
                                                <p className="text-xs text-muted-foreground">2 hours ago</p>
                                            </div>
                                        </div>
                                        <ChevronRight className="size-4 text-muted-foreground" />
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
