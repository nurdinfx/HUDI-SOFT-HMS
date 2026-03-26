"use client"

import { useEffect, useState, useCallback } from "react"
import Image from "next/image"
import { Phone, ShieldCheck, Lock, RefreshCw, CheckCircle2 } from "lucide-react"
import { settingsApi } from "@/lib/api"

// Trial duration: 10 hours as requested
const TRIAL_DURATION_MS = 10 * 60 * 60 * 1000 
const CEO_NUMBER = "0638326814"

// Custom styles for the ringing animation
const ringAnimation = `
  @keyframes phone-ring {
    0% { transform: rotate(0) scale(1.1); }
    10% { transform: rotate(-25deg) scale(1.2); }
    20% { transform: rotate(21deg) scale(1.2); }
    30% { transform: rotate(-25deg) scale(1.2); }
    40% { transform: rotate(21deg) scale(1.2); }
    50% { transform: rotate(0) scale(1.2); }
    100% { transform: rotate(0) scale(1.1); }
  }
  @keyframes glow-pulse {
    0%, 100% { filter: drop-shadow(0 0 5px rgba(var(--primary), 0.5)); border-color: rgba(255,255,255,0.2); }
    50% { filter: drop-shadow(0 0 20px rgba(var(--primary), 0.8)); border-color: rgba(var(--primary), 0.5); }
  }
  .animate-ring {
    animation: phone-ring 0.6s ease-in-out infinite;
  }
  .animate-glow-border {
    animation: glow-pulse 3s infinite;
  }
`

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
    <>
    <style dangerouslySetInnerHTML={{ __html: ringAnimation }} />
    <div className="fixed inset-0 z-[2147483647] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-[50px] animate-in fade-in duration-1000 select-none overflow-hidden cursor-default">
      <div className="relative w-full max-w-lg max-h-[95dvh] transition-all duration-700 zoom-in-95">
        {/* Extreme Premium Glows */}
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-primary/30 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-blue-600/20 rounded-full blur-[100px] animate-pulse delay-700" />
        
        <div className="glass-card w-full p-8 rounded-[3rem] border border-white/20 shadow-[0_40px_150px_-20px_rgba(0,0,0,0.8)] relative overflow-y-auto flex flex-col items-center text-center space-y-8 group max-h-[95dvh] custom-scrollbar animate-glow-border">
          
          <div className="relative z-10 space-y-8 w-full">
            {/* Logo Section */}
            <div className="flex flex-col items-center space-y-5">
              <div className="relative w-28 h-28 bg-white rounded-3xl p-3 shadow-2xl ring-[12px] ring-white/5 transition-all duration-700 hover:rotate-6">
                <Image 
                  src="/logo.jpg" 
                  alt="HUDI_SOFT Logo" 
                  fill 
                  className="object-contain p-2"
                  priority
                />
              </div>
              
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-5 py-2 bg-destructive/20 rounded-full border border-destructive/30 text-destructive text-[10px] font-black uppercase tracking-[0.2em] animate-bounce">
                  <Lock className="w-3.5 h-3.5" />
                  System Locked
                </div>
                <h2 className="text-5xl font-[950] tracking-tighter text-white leading-none">
                  SYSTEM <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-400 to-primary italic drop-shadow-[0_0_15px_rgba(var(--primary),0.5)]">SUSPENDED</span>
                </h2>
                <p className="text-xl text-blue-100/40 font-bold tracking-tight">
                  Software trial period has concluded.
                </p>
              </div>
            </div>

            {/* Content Section */}
            <div className="space-y-6 w-full">
              <div className="p-10 bg-white/[0.04] rounded-[2.5rem] border border-white/10 backdrop-blur-3xl shadow-2xl relative group/box overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                <p className="text-2xl leading-[1.6] text-white/95 font-medium tracking-tight italic drop-shadow-sm">
                  "Walaal, wuu ka dhammaaday labadii casho ee aad ku fiirinaysay sida uu u shaqeeyo system-ku. 
                  Waxaan ku faraxsanahay in aad isticmaashay system-ka <span className="text-primary font-black underline decoration-primary/40 underline-offset-8">HUDI_SOFT</span>."
                </p>
              </div>

              <div className="w-full px-2">
                <div className="flex flex-col items-center justify-center p-10 bg-gradient-to-br from-primary via-primary/90 to-blue-700 text-white rounded-[2.5rem] shadow-[0_20px_50px_-10px_rgba(var(--primary),0.5)] hover:shadow-[0_25px_60px_-10px_rgba(var(--primary),0.7)] transition-all duration-500 transform-gpu cursor-default border border-white/30 relative overflow-hidden group/btn">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
                  <div className="flex items-center gap-5 mb-3 select-all">
                    <Phone className="w-10 h-10 animate-ring" />
                    <span className="text-5xl font-black tracking-tighter tabular-nums drop-shadow-xl">{CEO_NUMBER}</span>
                  </div>
                  <span className="text-xs font-black uppercase tracking-[0.4em] text-white/90">Official Support & Activation</span>
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
    </>
  )
}
