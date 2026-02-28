"use client"

import { useState, useEffect } from "react"
import { settingsApi } from "@/lib/api"
import { SettingsContent } from "@/components/settings/settings-content"

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    settingsApi.get().then(setSettings).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading settings...</p></div>
  if (!settings) return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Failed to load settings.</p></div>

  return <SettingsContent settings={settings} />
}
