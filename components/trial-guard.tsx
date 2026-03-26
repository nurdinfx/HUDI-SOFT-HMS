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
    <div className="fixed inset-0 z-[2147483647] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-[40px] animate-in fade-in duration-1000 select-none overflow-hidden cursor-default">
      <div className="relative w-full max-w-lg max-h-[90dvh] transition-all duration-500">
        {/* Extreme Premium Glows */}
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-primary/20 rounded-full blur-[80px] animate-pulse" />
        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-blue-500/15 rounded-full blur-[80px]" />
        
        <div className="glass-card w-full p-8 rounded-[2.5rem] border border-white/20 shadow-[0_32px_120px_-12px_rgba(0,0,0,0.7)] relative overflow-y-auto flex flex-col items-center text-center space-y-8 group max-h-[90dvh] custom-scrollbar">
          
          <div className="relative z-10 space-y-6 w-full">
            {/* Logo Section */}
            <div className="flex flex-col items-center space-y-4">
              <div className="relative w-24 h-24 bg-white rounded-3xl p-3 shadow-2xl ring-8 ring-white/5 group-hover:scale-105 transition-transform duration-700">
                <Image 
                  src="/logo.jpg" 
                  alt="HUDI_SOFT Logo" 
                  fill 
                  className="object-contain p-2"
                  priority
                />
              </div>
              
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-destructive/15 rounded-full border border-destructive/20 text-destructive text-[9px] font-black uppercase tracking-[0.2em]">
                  <Lock className="w-3 h-3" />
                  System Locked
                </div>
                <h2 className="text-4xl font-[900] tracking-tight text-white leading-none">
                  SYSTEM <span className="text-primary italic text-shadow-glow">SUSPENDED</span>
                </h2>
                <p className="text-lg text-blue-100/40 font-medium tracking-tight">
                  Software trial period has concluded.
                </p>
              </div>
            </div>

            {/* Content Section */}
            <div className="space-y-6 w-full">
              <div className="p-8 bg-white/[0.03] rounded-[2rem] border border-white/10 backdrop-blur-xl shadow-inner relative group/box">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/4 h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent" />
                <p className="text-lg leading-[1.5] text-white/90 font-medium tracking-tight italic">
                  "Walaal, wuu ka dhammaaday labadii casho ee aad ku fiirinaysay sida uu u shaqeeyo system-ku. 
                  Waxaan ku faraxsanahay in aad isticmaashay system-ka <span className="text-primary font-extrabold decoration-primary/20 underline-offset-4">HUDI_SOFT</span>."
                </p>
              </div>

              <div className="w-full">
                <div className="flex flex-col items-center justify-center p-6 bg-primary/90 hover:bg-primary text-white rounded-3xl shadow-[0_15px_40px_-10px_rgba(var(--primary),0.4)] transition-all duration-500 transform-gpu cursor-default border border-white/20">
                  <div className="flex items-center gap-3 mb-2">
                    <Phone className="w-6 h-6 animate-pulse" />
                    <span className="text-3xl font-black tracking-tighter tabular-nums">{CEO_NUMBER}</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-80">Official Support & Activation</span>
                </div>
              </div>
            </div>

            {/* Footer Section */}
            <div className="pt-6 border-t border-white/5 flex flex-col items-center gap-4">
              <div className="flex items-center gap-2 text-white/20 text-[9px] font-bold uppercase tracking-[0.4em]">
                <ShieldCheck className="w-3 h-3" />
                HUDI_SOFT HMS Professional
              </div>
              <p className="text-white/60 text-xl font-bold tracking-tight">
                Nasiib Wacan! 🏥
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
