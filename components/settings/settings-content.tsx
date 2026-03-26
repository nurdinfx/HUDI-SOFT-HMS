"use client"

import { useState } from "react"
import { Upload } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { PageHeader } from "@/components/shared/page-header"
import { settingsApi } from "@/lib/api"
import type { HospitalSettings } from "@/lib/api"
import { toast } from "sonner"

interface SettingsContentProps {
  settings: HospitalSettings
}

export function SettingsContent({ settings }: SettingsContentProps) {
  const [form, setForm] = useState(settings)
  const [isSaving, setIsSaving] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(settings.logo || null)

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo file size must be less than 2MB")
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result as string
      setLogoPreview(base64)
      setForm((p) => ({ ...p, logo: base64 }))
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await settingsApi.update(form)
      toast.success("Settings updated successfully")
    } catch (err: any) {
      toast.error(err.message || "Failed to update settings")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Hospital Settings"
        description="Manage hospital information and preferences"
      />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Hospital Logo</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="size-40 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden bg-slate-50 relative group">
              {logoPreview ? (
                <>
                  <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-2" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      className="h-8 text-[10px] font-bold"
                      onClick={() => {
                        setLogoPreview(null)
                        setForm(p => ({ ...p, logo: "" }))
                      }}
                    >
                      REMOVE
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center p-4">
                  <div className="mx-auto size-10 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                    <Upload className="size-5 text-slate-400" />
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No Logo Uploaded</p>
                </div>
              )}
            </div>
            <div className="w-full">
              <Label htmlFor="logo-upload" className="cursor-pointer">
                <div className="w-full h-10 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center justify-center hover:bg-slate-800 transition-colors">
                  CHOOSE LOGO
                </div>
              </Label>
              <input 
                id="logo-upload" 
                type="file" 
                className="hidden" 
                accept="image/*" 
                onChange={handleLogoChange} 
              />
              <p className="text-[9px] text-slate-400 text-center mt-2 font-medium">Recommended: Square PNG/JPG, Max 2MB</p>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">General Information</CardTitle>
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>ZAAD Account</Label>
              <Input
                value={form.zaad ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, zaad: e.target.value }))}
                placeholder="ZAAD Number"
              />
            </div>
            <div className="grid gap-2">
              <Label>SAHAL Account</Label>
              <Input
                value={form.sahal ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, sahal: e.target.value }))}
                placeholder="SAHAL Number"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>EDAHAB Account</Label>
              <Input
                value={form.edahab ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, edahab: e.target.value }))}
                placeholder="EDAHAB Number"
              />
            </div>
            <div className="grid gap-2">
              <Label>MYCASH Account</Label>
              <Input
                value={form.mycash ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, mycash: e.target.value }))}
                placeholder="MYCASH Number"
              />
            </div>
          </div>

          <Separator className="my-4" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-primary">Pharmacy Accounts</h3>
          
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Pharmacy ZAAD</Label>
              <Input
                value={form.pharmacy_zaad ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, pharmacy_zaad: e.target.value }))}
                placeholder="Pharmacy ZAAD Number"
              />
            </div>
            <div className="grid gap-2">
              <Label>Pharmacy SAHAL</Label>
              <Input
                value={form.pharmacy_sahal ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, pharmacy_sahal: e.target.value }))}
                placeholder="Pharmacy SAHAL Number"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Pharmacy EDAHAB</Label>
              <Input
                value={form.pharmacy_edahab ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, pharmacy_edahab: e.target.value }))}
                placeholder="Pharmacy EDAHAB Number"
              />
            </div>
            <div className="grid gap-2">
              <Label>Pharmacy MYCASH</Label>
              <Input
                value={form.pharmacy_mycash ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, pharmacy_mycash: e.target.value }))}
                placeholder="Pharmacy MYCASH Number"
              />
            </div>
          </div>

          <Button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}
