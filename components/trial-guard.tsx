"use client"

import { useEffect, useState, useCallback } from "react"
import Image from "next/image"
import { Phone, ShieldCheck, Lock, RefreshCw, CheckCircle2 } from "lucide-react"
import { settingsApi } from "@/lib/api"

// Trial duration: 10 hours as requested
const TRIAL_DURATION_MS = 10 * 60 * 60 * 1000 
const CEO_NUMBER = "0638326814"

// Custom styles for animations
const customAnimations = `
  @keyframes marquee {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  @keyframes float {
    0%, 100% { transform: translateY(0) rotate(0); }
    33% { transform: translateY(-10px) rotate(1deg); }
    66% { transform: translateY(5px) rotate(-1deg); }
  }
  @keyframes phone-ring {
    0% { transform: rotate(0) scale(1.1); }
    10% { transform: rotate(-15deg) scale(1.2); }
    20% { transform: rotate(11deg) scale(1.2); }
    30% { transform: rotate(-15deg) scale(1.2); }
    40% { transform: rotate(11deg) scale(1.2); }
    50% { transform: rotate(0) scale(1.2); }
    100% { transform: rotate(0) scale(1.1); }
  }
  @keyframes pulse-glow {
    0%, 100% { box-shadow: 0 0 20px rgba(var(--primary), 0.2); }
    50% { box-shadow: 0 0 50px rgba(var(--primary), 0.5); }
  }
  .animate-marquee {
    animation: marquee 40s linear infinite;
  }
  .animate-float {
    animation: float 6s ease-in-out infinite;
  }
  .animate-ring {
    animation: phone-ring 0.6s ease-in-out infinite;
  }
  .animate-glow {
    animation: pulse-glow 3s ease-in-out infinite;
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

  const marqueeText = "HADA DALBO OO KU RAAXAYSO SYSTEMS KA AMAANKA AH EE SHIRKADA HUDI_SOFT • "

  return (
    <>
    <style dangerouslySetInnerHTML={{ __html: customAnimations }} />
    <div className="fixed inset-0 z-[2147483647] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-[40px] animate-in fade-in duration-1000 select-none overflow-hidden cursor-default">
      
      {/* Background Marquee Layer */}
      <div className="absolute inset-0 pointer-events-none opacity-10 flex flex-col justify-around overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="whitespace-nowrap flex" style={{ transform: `rotate(${i % 2 === 0 ? -2 : 2}deg) scale(1.5)` }}>
            <div className="animate-marquee flex text-white text-6xl font-black tracking-tighter uppercase">
              {marqueeText.repeat(10)}
            </div>
            <div className="animate-marquee flex text-white text-6xl font-black tracking-tighter uppercase">
              {marqueeText.repeat(10)}
            </div>
          </div>
        ))}
      </div>

      <div className="relative w-full max-w-xl max-h-[98dvh] transition-all duration-1000 zoom-in-95 group animate-float">
        {/* Dynamic Glowing Aura */}
        <div className="absolute -top-40 -left-40 w-[40rem] h-[40rem] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-[40rem] h-[40rem] bg-blue-600/10 rounded-full blur-[120px] animate-pulse delay-1000" />
        
        {/* Main Card */}
        <div className="relative glass-card w-full p-10 rounded-[3.5rem] border border-white/20 shadow-[0_50px_200px_-30px_rgba(0,0,0,0.9)] overflow-y-auto flex flex-col items-center text-center space-y-10 max-h-[98dvh] custom-scrollbar animate-glow">
          
          <div className="w-full relative z-10 space-y-10">
            {/* Header Section */}
            <div className="flex flex-col items-center space-y-6">
              <div className="relative w-32 h-32 bg-white rounded-[2.5rem] p-4 shadow-2xl ring-[16px] ring-white/5 transition-all duration-700 hover:scale-110 hover:rotate-3">
                <Image 
                  src="/logo.jpg" 
                  alt="HUDI_SOFT Logo" 
                  fill 
                  className="object-contain p-2"
                  priority
                />
              </div>
              
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-6 py-2.5 bg-destructive/10 rounded-full border border-destructive/20 text-destructive text-[11px] font-black uppercase tracking-[0.3em] animate-pulse">
                  <Lock className="w-4 h-4" />
                  System Locked
                </div>
                <h2 className="text-6xl font-[1000] tracking-tighter text-white leading-none">
                  SYSTEM <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-400 to-primary italic drop-shadow-[0_0_20px_rgba(var(--primary),0.6)]">SUSPENDED</span>
                </h2>
                <div className="h-1 w-24 bg-gradient-to-r from-transparent via-primary to-transparent mx-auto mt-2" />
                <p className="text-2xl text-blue-200/50 font-bold tracking-tight mt-4">
                  Software trial period has concluded.
                </p>
              </div>
            </div>

            {/* Somali Message Section */}
            <div className="relative group/box">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-blue-500/20 rounded-[3rem] blur opacity-0 group-hover/box:opacity-100 transition duration-1000" />
              <div className="relative p-12 bg-white/[0.03] rounded-[3rem] border border-white/10 backdrop-blur-3xl shadow-3xl overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
                <div className="absolute bottom-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mb-10 -mr-10" />
                
                <p className="text-2xl leading-[1.7] text-white/90 font-semibold tracking-tight italic">
                  "Walaal, wuu ka dhammaaday labadii casho ee aad ku fiirinaysay sida uu u shaqeeyo system-ku. 
                  Waxaan ku faraxsanahay in aad isticmaashay system-ka <span className="text-primary font-black underline decoration-primary/50 underline-offset-8">HUDI_SOFT</span>."
                </p>
              </div>
            </div>

            {/* Support Call-to-Action */}
            <div className="w-full px-4">
              <div className="group/btn relative">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-blue-600 rounded-[3rem] blur opacity-60 group-hover/btn:opacity-100 transition duration-1000 group-hover/btn:duration-200" />
                <div className="relative flex flex-col items-center justify-center p-12 bg-gradient-to-br from-primary via-primary/95 to-blue-700 text-white rounded-[3rem] shadow-2xl transition-all duration-500 transform-gpu cursor-default border border-white/30 overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.2),transparent)]" />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1500 ease-in-out" />
                  
                  <div className="flex items-center gap-6 mb-4 select-all relative z-10 scale-110">
                    <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md animate-ring ring-1 ring-white/20">
                      <Phone className="w-10 h-10 text-white" />
                    </div>
                    <span className="text-6xl font-[1000] tracking-tighter tabular-nums drop-shadow-2xl">{CEO_NUMBER}</span>
                  </div>
                  
                  <div className="relative z-10 flex flex-col items-center gap-2">
                    <div className="h-px w-32 bg-white/20 mb-2" />
                    <span className="text-sm font-black uppercase tracking-[0.5em] text-white/80">Official Support & Activation</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Section */}
            <div className="pt-8 flex flex-col items-center gap-6">
              <div className="flex items-center gap-3 px-6 py-2 bg-white/[0.05] rounded-full border border-white/5 text-white/30 text-[10px] font-black uppercase tracking-[0.5em]">
                <ShieldCheck className="w-4 h-4 text-primary/50" />
                HUDI_SOFT HMS PRO PROFESSIONAL
              </div>
              <div className="flex items-center gap-3 animate-bounce">
                <CheckCircle2 className="w-6 h-6 text-primary" />
                <p className="text-white/70 text-2xl font-[900] tracking-tight">
                  Nasiib Wacan! 🏥
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}

