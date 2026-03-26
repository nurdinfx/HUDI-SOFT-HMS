"use client"

import { useEffect, useState, useCallback } from "react"
import Image from "next/image"
import { Phone, ShieldCheck, Lock, RefreshCw, CheckCircle2 } from "lucide-react"
import { settingsApi } from "@/lib/api"

// Trial duration: 10 hours as requested
const TRIAL_DURATION_MS = 10 * 60 * 60 * 1000 
const CEO_NUMBER = "0638326814"

export function TrialGuard() {
  const [mounted, setMounted] = useState(false)
  const [isExpired, setIsExpired] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const checkTrialStatus = useCallback(async () => {
    try {
      const settings = await settingsApi.get()
      if (!settings.trialStartedAt) {
        setIsLoading(false)
        return
      }

      const startTime = new Date(settings.trialStartedAt).getTime()
      const elapsed = Date.now() - startTime
      setIsExpired(elapsed >= TRIAL_DURATION_MS)
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

  if (!mounted || isLoading || !isExpired) return null

  return (
    <div className="fixed inset-0 z-[2147483647] flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-[40px] animate-in fade-in duration-1000 select-none overflow-hidden cursor-default">
      <div className="relative w-full max-w-2xl text-white">
        {/* Extreme Premium Glows */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/25 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-500/20 rounded-full blur-[120px]" />
        
        <div className="glass-card w-full p-12 rounded-[3rem] border border-white/20 shadow-[0_32px_120px_-12px_rgba(0,0,0,0.7)] relative overflow-hidden flex flex-col items-center text-center space-y-10 group">
          
          <div className="relative z-10 space-y-8 w-full">
            {/* Logo Section */}
            <div className="flex flex-col items-center space-y-6">
              <div className="relative w-32 h-32 bg-white rounded-[2rem] p-4 shadow-2xl ring-[12px] ring-white/5 group-hover:scale-105 transition-transform duration-700">
                <Image 
                  src="/logo.jpg" 
                  alt="HUDI_SOFT Logo" 
                  fill 
                  className="object-contain p-2"
                  priority
                />
              </div>
              
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-5 py-2 bg-destructive/15 rounded-full border border-destructive/20 text-destructive text-[10px] font-black uppercase tracking-[0.2em]">
                  <Lock className="w-3.5 h-3.5" />
                  System Locked
                </div>
                <h2 className="text-6xl font-[900] tracking-tight text-white leading-none">
                  SYSTEM <span className="text-primary italic text-shadow-glow">SUSPENDED</span>
                </h2>
                <p className="text-2xl text-blue-100/40 font-medium tracking-tight mt-2">
                  Software trial period has concluded.
                </p>
              </div>
            </div>

            {/* Content Section */}
            <div className="space-y-8 w-full">
              <div className="p-10 bg-white/[0.03] rounded-[2.5rem] border border-white/10 backdrop-blur-xl shadow-inner relative group/box">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/4 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />
                <p className="text-2xl leading-[1.6] text-white/90 font-medium tracking-tight italic">
                  "Walaal, wuu ka dhammaaday labadii casho ee aad ku fiirinaysay sida uu u shaqeeyo system-ku. 
                  Waxaan ku faraxsanahay in aad isticmaashay system-ka <span className="text-primary font-extrabold decoration-primary/20 underline-offset-8">HUDI_SOFT</span>."
                </p>
              </div>

              <div className="w-full">
                <div className="flex flex-col items-center justify-center p-10 bg-primary/90 hover:bg-primary text-white rounded-[2rem] shadow-[0_20px_60px_-10px_rgba(var(--primary),0.4)] transition-all duration-500 transform-gpu cursor-default border border-white/20">
                  <div className="flex items-center gap-4 mb-3">
                    <Phone className="w-8 h-8 animate-pulse" />
                    <span className="text-4xl font-black tracking-tighter tabular-nums">{CEO_NUMBER}</span>
                  </div>
                  <span className="text-sm font-bold uppercase tracking-[0.4em] opacity-80">Official Support & Activation</span>
                </div>
              </div>
            </div>

            {/* Footer Section */}
            <div className="pt-10 border-t border-white/5 flex flex-col items-center gap-6">
              <div className="flex items-center gap-3 text-white/20 text-[11px] font-bold uppercase tracking-[0.4em]">
                <ShieldCheck className="w-4 h-4" />
                HUDI_SOFT HMS Professional
              </div>
              <p className="text-white/60 text-2xl font-bold tracking-tight">
                Nasiib Wacan! 🏥
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
