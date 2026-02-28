"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageHeader } from "@/components/shared/page-header"
import type { HospitalSettings } from "@/lib/api"

interface SettingsContentProps {
  settings: HospitalSettings
}

export function SettingsContent({ settings }: SettingsContentProps) {
  const [form, setForm] = useState(settings)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Hospital Settings"
        description="Manage hospital information and preferences"
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">General</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Hospital Name</Label>
            <Input
              value={form.name ?? ""}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Hospital name"
            />
          </div>
          <div className="grid gap-2">
            <Label>Tagline</Label>
            <Input
              value={form.tagline ?? ""}
              onChange={(e) => setForm((p) => ({ ...p, tagline: e.target.value }))}
              placeholder="Tagline"
            />
          </div>
          <div className="grid gap-2">
            <Label>Address</Label>
            <Input
              value={form.address ?? ""}
              onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
              placeholder="Address"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Phone</Label>
              <Input
                value={form.phone ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                placeholder="Phone"
              />
            </div>
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="Email"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Website</Label>
            <Input
              value={form.website ?? ""}
              onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))}
              placeholder="Website"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Currency</Label>
              <Input
                value={form.currency ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}
                placeholder="e.g. USD"
              />
            </div>
            <div className="grid gap-2">
              <Label>Tax Rate (%)</Label>
              <Input
                type="number"
                min={0}
                step={0.1}
                value={form.taxRate ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, taxRate: Number(e.target.value) || 0 }))}
              />
            </div>
          </div>
          <Button type="button">Save Changes</Button>
        </CardContent>
      </Card>
    </div>
  )
}
