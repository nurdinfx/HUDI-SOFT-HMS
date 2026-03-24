"use client"

import { useState, useEffect, useCallback } from "react"
import { X, Download, Bell, BellRing, Share, Plus, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

// ── In-App Alert Bus ────────────────────────────────────────────
export function triggerInAppAlert(title: string, body: string, url?: string) {
  if (typeof window === "undefined") return
  // Vibrate (Android/iOS PWA)
  if (navigator.vibrate) navigator.vibrate([100, 50, 100])
  // Play chime
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator(); const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.setValueAtTime(660, ctx.currentTime + 0.12)
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.5)
  } catch (_) {}
  window.dispatchEvent(new CustomEvent("hudi-notification", { detail: { title, body, url } }))
}

// ── WhatsApp-style Toast ────────────────────────────────────────
function InAppNotificationToast() {
  const [alert, setAlert] = useState<{ title: string; body: string; url?: string } | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      const ev = e as CustomEvent
      setAlert(ev.detail); setVisible(true)
      setTimeout(() => setVisible(false), 6000)
    }
    window.addEventListener("hudi-notification", handler)
    return () => window.removeEventListener("hudi-notification", handler)
  }, [])

  if (!visible || !alert) return null
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] w-[calc(100%-2rem)] max-w-sm animate-in slide-in-from-top-4 fade-in duration-300">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 flex gap-3 items-start cursor-pointer"
        onClick={() => { if (alert.url) window.location.href = alert.url; setVisible(false) }}
      >
        <div className="bg-teal-600 w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
          <BellRing className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 text-sm">{alert.title}</p>
          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{alert.body}</p>
        </div>
        <button onClick={e => { e.stopPropagation(); setVisible(false) }} className="text-slate-400 hover:text-slate-600">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

// ── iOS Step-by-Step Install Guide ──────────────────────────────
function IOSGuideModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        <div className="bg-gradient-to-br from-teal-600 to-teal-800 p-6 text-white text-center relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white">
            <X className="h-5 w-5" />
          </button>
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Smartphone className="h-8 w-8 text-white" />
          </div>
          <h2 className="font-black text-xl">Install on iPhone / iPad</h2>
          <p className="text-teal-100 text-sm mt-1">Follow these 3 steps in Safari</p>
        </div>
        <div className="p-6 space-y-4">
          {[
            { Icon: Share, text: "Tap the Share icon (box with arrow) at the bottom of Safari", color: "text-blue-500" },
            { Icon: Plus, text: 'Scroll down and tap "Add to Home Screen"', color: "text-emerald-500" },
            { Icon: Smartphone, text: 'Tap "Add" in the top-right corner to install', color: "text-teal-500" },
          ].map(({ Icon, text, color }, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0 font-bold text-slate-600 text-sm">{i + 1}</div>
              <div className="flex items-center gap-2">
                <Icon className={`h-5 w-5 shrink-0 ${color}`} />
                <p className="text-sm text-slate-700">{text}</p>
              </div>
            </div>
          ))}
          <div className="bg-amber-50 rounded-xl p-3 text-xs text-amber-700 border border-amber-200 mt-2">
            ⚠️ <strong>Safari only.</strong> This must be opened in Apple Safari, not Chrome or other browsers, to install.
          </div>
        </div>
        <div className="px-6 pb-6">
          <Button onClick={onClose} className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-xl h-12 font-bold">
            Got It!
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────
export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [showIOSGuide, setShowIOSGuide] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  const subscribeUser = useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker.ready
      const existing = await reg.pushManager.getSubscription()
      if (existing) return
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: 'BN3M5npdAHbqVJ6eBiKEwQkcXBCRkYd3EzCl5Sl0SfCxM1D8WLNUzIacVzrj5dB37GDGpb2HlM3F6dno2fGmhJw'
      })
      await fetch('/api/push/subscribe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub })
      })
    } catch (err) { console.error('Push subscribe failed:', err) }
  }, [])

  useEffect(() => {
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone
    setIsIOS(ios)

    // If already installed, just subscribe quietly and exit
    if (standalone) {
      if ('serviceWorker' in navigator && Notification.permission === 'granted') {
        navigator.serviceWorker.ready.then(() => subscribeUser())
      }
      return
    }

    // Android / Desktop native install prompt
    const handler = (e: Event) => {
      e.preventDefault(); setDeferredPrompt(e)
      if (!localStorage.getItem('pwaPromptDismissed')) setTimeout(() => setShowPrompt(true), 3000)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // iOS — show custom prompt
    if (ios && !standalone && !localStorage.getItem('pwaPromptDismissed')) {
      setTimeout(() => setShowPrompt(true), 3000)
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [subscribeUser])

  const handleInstall = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const perm = await Notification.requestPermission()
      if (perm === 'granted') await subscribeUser()
    } else if (Notification.permission === 'granted') {
      await subscribeUser()
    }

    if (isIOS) {
      setShowPrompt(false); setShowIOSGuide(true); return
    }
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') setShowPrompt(false)
      setDeferredPrompt(null)
    }
  }

  const handleClose = () => {
    setShowPrompt(false); localStorage.setItem('pwaPromptDismissed', 'true')
  }

  return (
    <>
      <InAppNotificationToast />
      {showIOSGuide && <IOSGuideModal onClose={() => setShowIOSGuide(false)} />}
      {showPrompt && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-6 z-[100] w-[calc(100%-2rem)] sm:w-[380px]">
          <Card className="rounded-[24px] shadow-2xl border-0 bg-white overflow-hidden">
            <button onClick={handleClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 z-10 p-1">
              <X className="size-4" />
            </button>
            <CardContent className="p-6 flex flex-col gap-5">
              <div className="flex gap-4 items-start">
                <div className="bg-teal-600 w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
                  {isIOS ? <Smartphone className="size-6 text-white" /> : <Download className="size-6 text-white" />}
                </div>
                <div className="space-y-1.5 pt-1">
                  <h3 className="font-bold text-slate-900 text-[17px]">Install Hudi-soft-HMS</h3>
                  <p className="text-[13px] text-slate-500 leading-snug">
                    {isIOS
                      ? "Add this app to your Home Screen for instant access and real-time alerts."
                      : "Install for faster access, offline support, and professional alerts."}
                  </p>
                </div>
              </div>
              <Button onClick={handleInstall} className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl h-12">
                {isIOS ? "Show Me How →" : "Enable & Install"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}
