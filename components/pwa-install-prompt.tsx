"use client"

import { useState, useEffect } from "react"
import { X, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Detect iOS
    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    setIsIOS(isIosDevice)

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    // If iOS and not standalone, we can optionally show the iOS instructions
    if (isIosDevice && !window.matchMedia('(display-mode: standalone)').matches) {
      const hasDismissed = localStorage.getItem('pwaPromptDismissed')
      if (!hasDismissed) {
        setTimeout(() => setShowPrompt(true), 2500)
      }
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const subscribeUser = async () => {
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: 'BN3M5npdAHbqVJ6eBiKEwQkcXBCRkYd3EzCl5Sl0SfCxM1D8WLNUzIacVzrj5dB37GDGpb2HlM3F6dno2fGmhJw'
      })

      // Send to backend
      const res = await fetch('https://hudi-soft-hms.onrender.com/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription })
      })
      
      if (res.ok) {
        console.log('✅ Push subscription synced with backend')
      }
    } catch (err) {
      console.error('❌ Failed to subscribe to push notifications:', err)
    }
  }

  const handleInstallClick = async () => {
    // Request notification permission first (Professional Social Alert Step)
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        await subscribeUser()
      }
    } else if (Notification.permission === 'granted') {
      await subscribeUser()
    }

    if (!deferredPrompt) {
      if (isIOS) {
        setShowPrompt(false)
        localStorage.setItem('pwaPromptDismissed', 'true')
      }
      return
    }
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShowPrompt(false)
    }
    setDeferredPrompt(null)
  }

  const handleClose = () => {
    setShowPrompt(false)
    localStorage.setItem('pwaPromptDismissed', 'true')
  }

  if (!showPrompt) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-6 z-[100] w-[calc(100%-2rem)] sm:w-[380px] p-1">
      <Card className="rounded-[24px] shadow-2xl border-0 overflow-hidden relative bg-white">
        {/* Subtle background decoration like the image */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        
        <button 
          onClick={handleClose} 
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 z-10 p-1"
        >
          <X className="size-4" />
        </button>

        <CardContent className="p-6 relative z-10 flex flex-col gap-5">
          <div className="flex gap-4 items-start">
            <div className="bg-[#1f66ff] w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
              <Download className="size-6 text-white" />
            </div>
            <div className="space-y-1.5 pt-1">
              <h3 className="font-bold text-slate-900 leading-none text-[17px]">
                Install Hudi-soft-HMS
              </h3>
              <p className="text-[13px] text-slate-500 leading-snug">
                {isIOS && !deferredPrompt 
                  ? "Install our app for a faster experience. Tap the 'Share' icon then 'Add to Home Screen'."
                  : "Enable professional alerts and install our app for a faster, more secure experience."}
              </p>
            </div>
          </div>
          <Button 
            onClick={handleInstallClick} 
            className="w-full bg-[#f1f3f5] hover:bg-[#e9ecef] text-slate-800 font-bold rounded-xl h-12 shadow-none"
          >
            Enable & Install
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
