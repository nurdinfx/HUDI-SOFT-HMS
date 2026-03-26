"use client"

import { useEffect, useState, useCallback } from "react"
import Image from "next/image"
import { Phone, ShieldCheck, Lock, RefreshCw, CheckCircle2 } from "lucide-react"
import { settingsApi } from "@/lib/api"

// Trial duration: 10 hours as requested
const TRIAL_DURATION_MS = 10 * 60 * 60 * 1000 
const SNOOZE_DURATION_MS = 10 * 60 * 60 * 1000
const SNOOZE_KEY = "hms_trial_snooze"
const CEO_NUMBER = "0638326814"

export function TrialGuard() {
  const [mounted, setMounted] = useState(false)
  const [isExpired, setIsExpired] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSnoozed, setIsSnoozed] = useState(false)

  const checkTrialStatus = useCallback(async () => {
    try {
      const settings = await settingsApi.get()
      if (!settings.trialStartedAt) {
        setIsLoading(false)
        return
      }

      const startTime = new Date(settings.trialStartedAt).getTime()
      const elapsed = Date.now() - startTime
      
      // Check for local snooze
      const snoozeTimestamp = localStorage.getItem(SNOOZE_KEY)
      if (snoozeTimestamp) {
        const snoozeElapsed = Date.now() - parseInt(snoozeTimestamp)
        if (snoozeElapsed < SNOOZE_DURATION_MS) {
          setIsSnoozed(true)
          setIsExpired(false)
          setIsLoading(false)
          return
        } else {
          localStorage.removeItem(SNOOZE_KEY)
        }
      }

      setIsExpired(elapsed >= TRIAL_DURATION_MS)
      setIsSnoozed(false)
    } catch (err) {
      console.error("Failed to check trial status:", err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    setMounted(true)
    checkTrialStatus()
    
    // Check every 5 minutes
    const interval = setInterval(checkTrialStatus, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [checkTrialStatus])

  const handleSnooze = () => {
    localStorage.setItem(SNOOZE_KEY, Date.now().toString())
    setIsSnoozed(true)
    setIsExpired(false)
    // Small delay to let the user feel the action
    window.location.reload() 
  }

  if (!mounted || isLoading || isSnoozed || !isExpired) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-2xl animate-in fade-in duration-700">
      <div className="glass-card max-w-2xl w-full p-10 rounded-[2.5rem] border border-white/20 shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] relative overflow-hidden group">
        {/* Animated Background Orbs */}
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-primary/30 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-blue-600/20 rounded-full blur-[100px]" />

        <div className="relative z-10 space-y-10">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="relative w-28 h-28 bg-white rounded-3xl p-3 shadow-2xl ring-4 ring-white/10 group-hover:scale-110 transition-transform duration-500">
              <Image 
                src="/logo.jpg" 
                alt="HUDI_SOFT Logo" 
                fill 
                className="object-contain p-2"
              />
            </div>
            
            <div className="flex flex-col items-center space-y-2">
              <div className="px-4 py-1.5 bg-destructive/20 rounded-full flex items-center gap-2 border border-destructive/30">
                <Lock className="w-4 h-4 text-destructive" />
                <span className="text-xs font-bold text-destructive uppercase tracking-widest">Security Lock</span>
              </div>
              <h2 className="text-5xl font-black tracking-tighter text-white">
                SYSTEM SUSPENDED
              </h2>
              <p className="text-xl text-blue-200/60 font-medium italic">
                "Your free trial days are ended"
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Somali Message Box */}
            <div className="p-8 bg-white/5 rounded-[2rem] border border-white/10 backdrop-blur-md relative overflow-hidden">
               <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
               <p className="text-xl leading-relaxed text-white/90 font-medium">
                "Walaal, wuu ka dhammaaday labadii casho ee aad ku fiirinaysay sida uu u shaqeeyo system-ku. 
                Waxaan ku faraxsanahay in aad isticmaashay system-ka <span className="text-primary font-bold underline decoration-primary/30">HUDI_SOFT</span> Company."
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col items-center justify-center p-6 bg-primary text-white rounded-3xl shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all cursor-default group/btn">
                <div className="flex items-center gap-3 mb-1">
                  <Phone className="w-6 h-6 animate-bounce" />
                  <span className="text-2xl font-black tracking-tighter">{CEO_NUMBER}</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Contact CEO Now</span>
              </div>

              <button 
                onClick={handleSnooze}
                className="flex flex-col items-center justify-center p-6 bg-white/10 hover:bg-white/20 text-white rounded-3xl border border-white/10 transition-all active:scale-95"
              >
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <span className="text-lg font-bold">I Contacted CEO</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Snooze for 10 Hours</span>
              </button>
            </div>
          </div>

          <div className="pt-8 border-t border-white/10 flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 text-white/30 text-[10px] tracking-[0.3em] uppercase font-black">
              <ShieldCheck className="w-4 h-4" />
              HUDI_SOFT HMS • Institutional Edition
            </div>
            
            <p className="text-white/80 text-xl font-bold tracking-tight">
              Nasiib Wacan! 🏥
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
