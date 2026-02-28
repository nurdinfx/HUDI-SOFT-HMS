"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { type IPDAnalytics } from "@/lib/api"
import { BarChart3, TrendingUp, Users, BedDouble, Timer, Wallet } from "lucide-react"

interface IPDAnalyticsViewProps {
    analytics: IPDAnalytics | null
}

export function IPDAnalyticsView({ analytics }: IPDAnalyticsViewProps) {
    if (!analytics) return <div className="p-8 text-center text-muted-foreground">Loading analytics...</div>

    return (
        <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Bed Occupancy Rate</CardTitle>
                        <TrendingUp className="size-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{analytics.occupancyRate}%</div>
                        <Progress value={parseFloat(analytics.occupancyRate)} className="h-2 mt-4" />
                        <p className="text-xs text-muted-foreground mt-2">
                            {analytics.occupiedBeds} out of {analytics.totalBeds} beds occupied
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Avg. Length of Stay</CardTitle>
                        <Timer className="size-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{analytics.averageStayDays} Days</div>
                        <p className="text-xs text-muted-foreground mt-6">
                            Average duration from admission to discharge
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Active Admissions</CardTitle>
                        <Users className="size-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{analytics.occupiedBeds}</div>
                        <p className="text-xs text-muted-foreground mt-6">
                            Currently admitted patients across all wards
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Capacity Status</CardTitle>
                        <BedDouble className="size-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{analytics.totalBeds - analytics.occupiedBeds}</div>
                        <p className="text-xs text-muted-foreground mt-6">
                            Total available beds for new admissions
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base font-semibold">Department-wise Admissions</CardTitle>
                        <CardDescription>Admission counts broken down by medical departments.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {analytics.departmentAdmissions.map((dept) => (
                                <div key={dept.department} className="space-y-1">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-medium">{dept.department}</span>
                                        <span className="text-muted-foreground">{dept.count} Admissions</span>
                                    </div>
                                    <Progress value={(dept.count / analytics.occupiedBeds) * 100 || 0} className="h-1.5" />
                                </div>
                            ))}
                            {analytics.departmentAdmissions.length === 0 && (
                                <p className="text-sm text-center py-4 text-muted-foreground">No departmental data available.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base font-semibold">Ward Usage</CardTitle>
                        <CardDescription>Current patient count per ward.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {analytics.wardCurrentUsage.map((ward) => (
                                <div key={ward.ward} className="space-y-1">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-medium">{ward.ward}</span>
                                        <span className="text-muted-foreground">{ward.count} Patients</span>
                                    </div>
                                    <Progress value={(ward.count / analytics.occupiedBeds) * 100 || 0} className="h-1.5 bg-secondary" />
                                </div>
                            ))}
                            {analytics.wardCurrentUsage.length === 0 && (
                                <p className="text-sm text-center py-4 text-muted-foreground">No ward usage data available.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
