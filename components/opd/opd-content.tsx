"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Activity } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/page-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { OPDDashboard } from "./opd-dashboard"
import { ConsultationPage } from "./consultation-page"
import { CreateVisitForm } from "./create-visit-form"
import { LiveQueue } from "./live-queue"
import { VisitHistory } from "./visit-history"
import type { OPDVisit, Doctor, Patient } from "@/lib/api"

interface OPDContentProps {
  visits: OPDVisit[]
  doctors: Doctor[]
  patients: Patient[]
  onRefresh: () => void
}

export function OPDContent({
  visits: initial = [],
  doctors = [],
  patients = [],
  onRefresh
}: OPDContentProps) {
  const [activeTab, setActiveTab] = useState("dashboard")
  const [activeConsultation, setActiveConsultation] = useState<OPDVisit | null>(null)

  const searchParams = useSearchParams()
  const initialPatientId = searchParams?.get("patientId")
  const initialDoctorId = searchParams?.get("doctorId")

  useEffect(() => {
    if (initialPatientId || initialDoctorId) {
      setActiveTab("create")
    }
  }, [initialPatientId, initialDoctorId])

  const visitsList = Array.isArray(initial) ? initial : []

  const handleStartConsult = (v: OPDVisit) => {
    setActiveConsultation(v)
    setActiveTab("consultation")
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="OPD Clinical Suite"
        description="Unified hub for outpatient consultations and queue management."
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-muted p-1 rounded-xl mb-6 shadow-sm border h-12">
          <TabsTrigger value="dashboard" className="rounded-lg font-bold text-xs px-6">DASHBOARD</TabsTrigger>
          <TabsTrigger value="create" className="rounded-lg font-bold text-xs px-6 text-primary">CREATE VISIT</TabsTrigger>
          <TabsTrigger value="queue" className="rounded-lg font-bold text-xs px-6">LIVE QUEUE</TabsTrigger>
          <TabsTrigger value="history" className="rounded-lg font-bold text-xs px-6">VISIT HISTORY</TabsTrigger>
          <TabsTrigger
            value="consultation"
            className="rounded-lg font-bold text-xs px-6 data-[state=active]:bg-primary data-[state=active]:text-white transition-all disabled:opacity-30"
            disabled={!activeConsultation}
          >
            {activeConsultation ? `CLINICAL: ${activeConsultation.patientName.split(' ')[0].toUpperCase()}` : 'CONSULTATION'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <OPDDashboard onAction={(action) => {
            if (action === 'new-visit') setActiveTab("create")
            if (action.startsWith('view-')) {
              const vid = action.replace('view-', '')
              const v = visitsList.find(x => x.visitId === vid)
              if (v) handleStartConsult(v)
            }
          }} />
        </TabsContent>

        <TabsContent value="create" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <CreateVisitForm
            doctors={doctors}
            patients={patients}
            initialPatientId={initialPatientId}
            initialDoctorId={initialDoctorId}
            onSuccess={() => {
              onRefresh()
              setActiveTab("queue")
            }}
          />
        </TabsContent>

        <TabsContent value="queue" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <LiveQueue
            visits={visitsList}
            onRefresh={onRefresh}
            onStartConsult={handleStartConsult}
          />
        </TabsContent>

        <TabsContent value="history" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <VisitHistory
            visits={visitsList}
            onView={handleStartConsult}
          />
        </TabsContent>

        <TabsContent value="consultation">
          {activeConsultation ? (
            <ConsultationPage
              visit={activeConsultation}
              patient={patients.find(p => p.id === activeConsultation.patientId) || {} as any}
              onComplete={() => {
                setActiveConsultation(null)
                onRefresh()
                setActiveTab("dashboard")
              }}
              onCancel={() => {
                setActiveConsultation(null)
                setActiveTab("queue")
              }}
            />
          ) : (
            <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-xl bg-muted/20">
              <Activity className="size-12 mb-4 opacity-10" />
              <p className="font-bold text-sm">No active consultation selected.</p>
              <p className="text-xs">Start a session from the Live Queue.</p>
              <Button variant="outline" className="mt-4" onClick={() => setActiveTab("queue")}>Open Live Queue</Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
