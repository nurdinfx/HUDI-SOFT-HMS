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
  @keyframes marquee-slow {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  @keyframes subtle-float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }
  @keyframes phone-ring {
    0% { transform: rotate(0) scale(1.1); }
    10% { transform: rotate(-10deg) scale(1.15); }
    20% { transform: rotate(8deg) scale(1.15); }
    30% { transform: rotate(-10deg) scale(1.15); }
    40% { transform: rotate(8deg) scale(1.15); }
    50% { transform: rotate(0) scale(1.15); }
    100% { transform: rotate(0) scale(1.1); }
  }
  @keyframes pulse-glow-subtle {
    0%, 100% { border-color: rgba(255,255,255,0.1); box-shadow: 0 0 50px -10px rgba(0,0,0,0.8); }
    50% { border-color: rgba(var(--primary), 0.3); box-shadow: 0 0 80px -20px rgba(var(--primary), 0.2); }
  }
  .animate-marquee-slow {
    animation: marquee-slow 180s linear infinite;
  }
  .animate-subtle-float {
    animation: subtle-float 8s ease-in-out infinite;
  }
  .animate-ring {
    animation: phone-ring 0.8s ease-in-out infinite;
  }
  .animate-glow-subtle {
    animation: pulse-glow-subtle 4s ease-in-out infinite;
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
    <div className="fixed inset-0 z-[2147483647] flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-[60px] animate-in fade-in duration-1000 select-none overflow-hidden cursor-default font-sans">
      
      {/* Professional Status Bar (Single Marquee) */}
      <div className="absolute bottom-0 left-0 right-0 h-12 sm:h-16 bg-white/[0.02] border-t border-white/10 backdrop-blur-xl flex items-center overflow-hidden z-20">
        <div className="animate-marquee-slow flex whitespace-nowrap">
          {[...Array(20)].map((_, i) => (
            <span key={i} className="text-white/60 text-[10px] sm:text-sm font-black tracking-[0.4em] uppercase py-2">
              {marqueeText}
            </span>
          ))}
        </div>
      </div>

      <div className="relative w-full max-w-4xl max-h-[92dvh] transition-all duration-1000 zoom-in-95 group animate-subtle-float">
        {/* Dynamic Glowing Aura - More Subtle */}
        <div className="absolute -top-40 sm:-top-60 -left-40 sm:-left-60 w-[30rem] sm:w-[60rem] h-[30rem] sm:h-[60rem] bg-primary/10 rounded-full blur-[80px] sm:blur-[160px] animate-pulse" />
        <div className="absolute -bottom-40 sm:-bottom-60 -right-40 sm:-right-60 w-[30rem] sm:w-[60rem] h-[30rem] sm:h-[60rem] bg-blue-600/5 rounded-full blur-[80px] sm:blur-[160px] animate-pulse delay-1000" />
        
        {/* Main Card - Larger & Professional */}
        <div className="relative glass-card w-full p-6 sm:p-10 md:p-16 rounded-[2.5rem] sm:rounded-[4rem] border border-white/10 shadow-[0_80px_250px_-50px_rgba(0,0,0,0.95)] overflow-y-auto flex flex-col items-center text-center space-y-8 sm:space-y-12 max-h-[85dvh] custom-scrollbar animate-glow-subtle bg-white/[0.02] hide-scrollbar">
          
          <div className="w-full relative z-10 space-y-8 sm:space-y-12">
            
            {/* Logo Section */}
            <div className="flex flex-col items-center space-y-5 sm:space-y-8">
              <div className="relative w-24 h-24 sm:w-32 h-32 md:w-40 h-40 bg-white rounded-[2rem] sm:rounded-[3rem] p-4 sm:p-5 md:p-6 shadow-3xl ring-[12px] sm:ring-[20px] ring-white/5 transition-all duration-1000 group-hover:scale-105">
                <Image 
                  src="/logo.jpg" 
                  alt="HUDI_SOFT Logo" 
                  fill 
                  className="object-contain p-2 sm:p-4"
                  priority
                />
              </div>
              
              <div className="space-y-2 sm:space-y-4">
                <div className="inline-flex items-center gap-2 sm:gap-3 px-5 sm:px-8 py-2 sm:py-3 bg-destructive/10 rounded-full border border-destructive/20 text-destructive text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] sm:tracking-[0.4em]">
                  <Lock className="w-4 h-4 sm:w-5 h-5 animate-pulse" />
                  Security Protocol Active
                </div>
                <h2 className="text-3xl sm:text-5xl md:text-7xl font-[1000] tracking-tighter text-white leading-tight sm:leading-none">
                  SYSTEM <span className="text-transparent bg-clip-text bg-gradient-to-br from-white via-primary to-blue-500 drop-shadow-[0_0_30px_rgba(var(--primary),0.4)] transition-all duration-700">SUSPENDED</span>
                </h2>
                <div className="flex items-center justify-center gap-2 sm:gap-4 mt-3 sm:mt-6">
                  <div className="h-px w-10 sm:w-20 bg-gradient-to-r from-transparent to-white/20" />
                  <p className="text-sm sm:text-xl md:text-2xl text-white/40 font-bold tracking-tight">
                    Professional Trial Expiration
                  </p>
                  <div className="h-px w-10 sm:w-20 bg-gradient-to-l from-transparent to-white/20" />
                </div>
              </div>
            </div>

            {/* Content Section - High Readability */}
            <div className="relative p-7 sm:p-12 bg-white/[0.04] rounded-[2rem] sm:rounded-[3.5rem] border border-white/5 backdrop-blur-2xl shadow-inner group/box text-left">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-primary via-blue-500 to-transparent rounded-l-full" />
              <p className="text-lg sm:text-2xl md:text-3xl leading-[1.6] text-white/95 font-medium tracking-tight italic">
                "Walaal, wuu ka dhammaaday labadii casho ee aad ku fiirinaysay sida uu u shaqeeyo system-ku. 
                Waxaan ku faraxsanahay in aad isticmaashay system-ka <span className="text-primary font-black underline decoration-primary/40 underline-offset-[8px] sm:underline-offset-[12px]">HUDI_SOFT</span>."
              </p>
            </div>

            {/* Support Call-to-Action - Professional Integration */}
            <div className="w-full">
              <div className="group/btn relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/40 via-blue-600/40 to-primary/40 rounded-[2rem] sm:rounded-[3.5rem] blur opacity-50 transition duration-1000 group-hover/btn:opacity-100" />
                <div className="relative flex flex-col items-center justify-center p-6 sm:p-10 md:p-14 bg-white/[0.03] border border-white/10 rounded-[2rem] sm:rounded-[3.5rem] shadow-2xl transition-all duration-700 hover:bg-white/[0.05]">
                  
                  <div className="flex items-center gap-4 sm:gap-8 mb-4 sm:mb-6 relative z-10 scale-100 sm:scale-110">
                    <div className="p-3 sm:p-5 md:p-6 bg-primary/10 rounded-2xl sm:rounded-3xl backdrop-blur-md animate-ring border border-primary/20">
                      <Phone className="w-6 h-6 sm:w-10 h-10 md:w-12 h-12 text-primary" />
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.4em] text-white/40 mb-0.5 sm:mb-1">Direct Line</span>
                      <span className="text-2xl sm:text-5xl md:text-7xl font-black tracking-tighter tabular-nums text-white drop-shadow-2xl select-all">{CEO_NUMBER}</span>
                    </div>
                  </div>
                  
                  <div className="relative z-10 w-full flex flex-col items-center">
                    <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent mb-4 sm:mb-6" />
                    <span className="text-[10px] sm:text-sm font-black uppercase tracking-[0.4em] sm:tracking-[0.6em] text-white/60 text-center">Official Enterprise Support</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Information */}
            <div className="pt-6 sm:pt-10 flex flex-col items-center gap-5 sm:gap-8">
              <div className="flex items-center gap-2 sm:gap-4 px-6 sm:px-10 py-2 sm:py-3 bg-white/[0.04] rounded-full border border-white/5 text-white/30 text-[9px] sm:text-[11px] font-black uppercase tracking-[0.4em] sm:tracking-[0.6em]">
                <ShieldCheck className="w-4 h-4 sm:w-5 h-5 text-primary/40" />
                HUDI_SOFT HMS PRO • V2.0
              </div>
              <div className="flex items-center gap-3 sm:gap-4 group/footer cursor-help">
                <div className="w-8 h-8 sm:w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover/footer:scale-110 transition-transform">
                  <CheckCircle2 className="w-5 h-5 sm:w-6 h-6 text-primary" />
                </div>
                <p className="text-white/60 text-lg sm:text-2xl font-[900] tracking-tight">
                  Nasiib Wacan! 🏥
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <style jsx global>{`
      .hide-scrollbar::-webkit-scrollbar {
        display: none;
      }
      .hide-scrollbar {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }
    `}</style>
    </>
  )
}


