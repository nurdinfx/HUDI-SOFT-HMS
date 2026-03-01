"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Stethoscope, Loader2 } from "lucide-react"

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, isAuthenticated, isLoading } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  const redirectTo = searchParams.get("redirect") || "/dashboard"

  if (isAuthenticated) {
    router.replace(redirectTo)
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password) {
      toast.error("Please enter email and password")
      return
    }
    setSubmitting(true)
    try {
      await login(email.trim(), password)
      toast.success("Welcome back")
      router.replace(redirectTo)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login failed"
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="size-8 animate-spin text-white" />
      </div>
    )
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 scale-105"
        style={{ backgroundImage: "url('/login-bg.png')" }}
      />
      <div className="absolute inset-0 z-10 bg-black/30" />

      {/* Login Box */}
      <div className="relative z-20 w-full max-w-3xl px-4 flex flex-col md:flex-row items-center justify-center gap-8 animate-in fade-in zoom-in duration-700">

        {/* Fingerprint Side (Visible on MD and up) */}
        <div className="hidden md:flex flex-col items-center justify-center text-white/90 space-y-4">
          <div className="relative group cursor-pointer group">
            <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full group-hover:bg-blue-400/40 transition-all duration-500" />
            <div className="relative p-6 border-2 border-dashed border-white/30 rounded-2xl group-hover:border-white/60 transition-colors">
              <svg viewBox="0 0 24 24" className="w-24 h-24 stroke-current fill-none" strokeWidth="1.5">
                <path d="M12 11c0-1.105-.895-2-2-2m-3 3c0-2.761 2.239-5 5-5s5 2.239 5 5m-1 3c0-2.209-1.791-4-4-4s-4 1.791-4 4m6 0a2 2 0 11-4 0" strokeLinecap="round" />
                <path d="M15 17c0-1.657-1.343-3-3-3s-3 1.343-3 3m9-2c0-3.314-2.686-6-6-6s-6 2.686-6 6M6 16c0-4.418 3.582-8 8-8s8 3.582 8 8" strokeLinecap="round" />
              </svg>
            </div>
          </div>
          <p className="text-sm font-light tracking-wide opacity-80 group-hover:opacity-100 transition-opacity">Touch the fingerprint sensor</p>
        </div>

        {/* Separator for MD (Visual line from image) */}
        <div className="hidden md:block h-64 w-[1px] bg-gradient-to-b from-transparent via-white/20 to-transparent" />

        {/* Form Card */}
        <div className="glass-card w-full max-w-sm rounded-[32px] overflow-hidden p-8 flex flex-col items-center shadow-2xl relative">

          {/* Top Circular User Icon */}
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 p-1 bg-white/10 rounded-full backdrop-blur-md border border-white/20 shadow-xl overflow-hidden">
            <div className="bg-[#1e3c72]/60 p-4 rounded-full">
              <svg viewBox="0 0 24 24" className="w-10 h-10 fill-white">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>
          </div>

          <h1 className="text-white text-3xl font-light tracking-tight mt-8 mb-8">User Login</h1>

          <form onSubmit={handleSubmit} className="w-full space-y-6">
            {/* Email Field */}
            <div className="relative group">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 group-focus-within:text-white transition-colors">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </div>
              <input
                type="email"
                placeholder="Username or Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-12 glass-input pl-12 pr-4 rounded-xl outline-none focus:ring-2 focus:ring-white/30 transition-all text-sm font-light"
                required
              />
            </div>

            {/* Password Field */}
            <div className="relative group">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 group-focus-within:text-white transition-colors">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                </svg>
              </div>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-12 glass-input pl-12 pr-4 rounded-xl outline-none focus:ring-2 focus:ring-white/30 transition-all text-sm tracking-widest"
                required
              />
            </div>

            {/* Extra Options */}
            <div className="flex items-center justify-between text-[11px] text-white/60 px-1">
              <label className="flex items-center cursor-pointer group">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="mr-2 accent-white/20"
                />
                <span className="group-hover:text-white/80 transition-colors">Keep me logged in for 3 days</span>
              </label>
              <button type="button" className="hover:text-white transition-colors underline-offset-4 hover:underline">
                Forgot password?
              </button>
            </div>

            {/* Buttons */}
            <div className="flex gap-4 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 h-11 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-all transform active:scale-95 flex items-center justify-center disabled:opacity-50"
              >
                {submitting ? <Loader2 className="animate-spin size-4" /> : "Log in"}
              </button>
              <button
                type="button"
                onClick={() => { setEmail(""); setPassword(""); }}
                className="flex-1 h-11 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-all"
              >
                Cancel
              </button>
            </div>
          </form>

          <p className="mt-12 text-[10px] text-white/40 tracking-[0.2em] font-light italic">
            HUDI SOFT MEDICAL SYSTEMS
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
