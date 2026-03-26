"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { AlertTriangle, Phone, ShieldCheck, Lock } from "lucide-react"

// Trial duration: 10 hours as requested
const TRIAL_DURATION_MS = 10 * 60 * 60 * 1000 
const STORAGE_KEY = "hms_trial_start"
const CEO_NUMBER = "0638326814"

export function TrialGuard() {
  const [mounted, setMounted] = useState(false)
  const [isExpired, setIsExpired] = useState(false)

  useEffect(() => {
    const checkTrial = () => {
      let startTime = localStorage.getItem(STORAGE_KEY)
      
      if (!startTime) {
        startTime = Date.now().toString()
        localStorage.setItem(STORAGE_KEY, startTime)
      }

      const elapsed = Date.now() - parseInt(startTime)
      const expired = elapsed >= TRIAL_DURATION_MS
      
      setIsExpired(expired)
    }

    setMounted(true)
    checkTrial()
    // Re-check every minute
    const interval = setInterval(checkTrial, 60000)
    return () => clearInterval(interval)
  }, [])

  if (!mounted || !isExpired) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-in fade-in duration-500">
      <div className="glass-card max-w-2xl w-full p-8 rounded-3xl border border-white/20 shadow-2xl relative overflow-hidden group">
        {/* Abstract background glow */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/20 rounded-full blur-3xl group-hover:bg-primary/30 transition-all duration-1000" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />

        <div className="relative z-10 space-y-8">
          <div className="flex flex-col items-center text-center space-y-6">
            {/* LOGO ADDED HERE */}
            <div className="relative w-24 h-24 bg-white/10 rounded-2xl p-2 backdrop-blur-md border border-white/20 shadow-xl overflow-hidden ring-4 ring-primary/20">
              <Image 
                src="/logo.jpg" 
                alt="HUDI_SOFT Logo" 
                fill 
                className="object-cover rounded-xl"
              />
            </div>
            
            <div className="p-3 bg-destructive/10 rounded-full ring-2 ring-destructive/20 animate-pulse">
              <Lock className="w-8 h-8 text-destructive" />
            </div>
            
            <div className="space-y-3">
              <h2 className="text-5xl font-extrabold tracking-tighter text-white drop-shadow-2xl">
                SYSTEM SUSPENDED
              </h2>
              <p className="text-xl text-blue-100/80 font-medium">
                Your free trial days are ended
              </p>
            </div>
          </div>

          <div className="space-y-6 text-center">
            {/* Somali Message */}
            <div className="p-6 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
              <p className="text-lg leading-relaxed text-white/90 italic font-medium">
                "Walaal, wuu ka dhammaaday labadii casho ee aad ku fiirinaysay sida uu u shaqeeyo system-ku. 
                Waxaan ku faraxsanahay in aad isticmaashay system-ka <span className="text-primary font-bold">HUDI_SOFT</span> Company."
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 py-4">
              <div className="flex items-center gap-3 px-6 py-4 bg-primary text-white rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 transition-transform duration-300">
                <Phone className="w-5 h-5" />
                <span className="text-xl font-bold tracking-wider">{CEO_NUMBER}</span>
              </div>
              
              <div className="text-white/60 text-sm font-medium">
                Contact CEO to activate full version
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-white/10 flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 text-white/40 text-xs tracking-widest uppercase font-bold">
              <ShieldCheck className="w-4 h-4" />
              HUDI_SOFT HMS Professional Edition
            </div>
            
            <p className="text-white/70 text-lg font-semibold">
              Nasiib Wacan! 🚀
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
