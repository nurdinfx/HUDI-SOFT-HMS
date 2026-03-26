"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, Phone, ExternalLink, ShieldCheck, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

// Trial duration: 48 hours (2 days) as requested in Somali "labadii casho"
const TRIAL_DURATION_MS = 48 * 60 * 60 * 1000 
const STORAGE_KEY = "hms_trial_start"
const CEO_NUMBER = "0638326814"

export function TrialGuard() {
  const [isExpired, setIsExpired] = useState(false)
  const [timeLeft, setTimeLeft] = useState<string>("")

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

      if (!expired) {
        const remaining = TRIAL_DURATION_MS - elapsed
        const hours = Math.floor(remaining / (1000 * 60 * 60))
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))
        setTimeLeft(`${hours}h ${minutes}m`)
      }
    }

    checkTrial()
    // Re-check every minute
    const interval = setInterval(checkTrial, 60000)
    return () => clearInterval(interval)
  }, [])

  if (!isExpired) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-in fade-in duration-500">
      <div className="glass-card max-w-2xl w-full p-8 rounded-3xl border border-white/20 shadow-2xl relative overflow-hidden group">
        {/* Abstract background glow */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/20 rounded-full blur-3xl group-hover:bg-primary/30 transition-all duration-1000" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />

        <div className="relative z-10 space-y-8">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-4 bg-destructive/20 rounded-2xl ring-4 ring-destructive/10 animate-pulse">
              <AlertTriangle className="w-12 h-12 text-destructive" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-4xl font-bold tracking-tight text-white drop-shadow-sm">
                Trial Expired
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
