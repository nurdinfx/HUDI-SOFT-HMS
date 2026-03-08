"use client"

import { usePathname } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { hasAccess } from "@/lib/rbac"
import Link from "next/link"
import { ShieldAlert } from "lucide-react"

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const pathname = usePathname()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    )
  }

  // Dashboard root is accessible to anyone who logs in
  if (pathname === '/dashboard') {
      return <>{children}</>;
  }

  const isAllowed = hasAccess(user?.role, pathname)

  if (!isAllowed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 text-center space-y-6 shadow-xl border border-slate-100">
          <div className="h-20 w-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-2 relative">
            <div className="absolute inset-0 bg-rose-100 animate-ping rounded-full opacity-50"></div>
            <ShieldAlert className="size-10 relative z-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Access Denied</h2>
            <p className="text-slate-500 font-medium">
              You do not have permission to view this page. If you believe this is a mistake, contact your administrator.
            </p>
          </div>
          <div className="bg-slate-50 p-4 rounded-2xl flex flex-col gap-1 text-sm font-medium border border-slate-200">
            <div className="flex justify-between">
              <span className="text-slate-500">Your Role</span>
              <span className="text-slate-900 capitalize font-bold">{user?.role?.replace('_', ' ') || 'Unknown'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Attempted Path</span>
              <span className="text-slate-900 font-mono truncate max-w-[150px]">{pathname}</span>
            </div>
          </div>
          <Link href="/dashboard" className="block w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all hover:scale-[1.02] active:scale-[0.98]">
            Return to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
