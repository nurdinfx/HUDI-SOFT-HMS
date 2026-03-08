"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { useAuth } from "@/lib/auth-context"
import { Loader2 } from "lucide-react"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, isLoading, user } = useAuth()

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      const redirect = `/login?redirect=${encodeURIComponent(pathname || "/dashboard")}`
      router.replace(redirect)
      return
    }

    // Role-based route protection
    const rolePermissions: Record<string, string[]> = {
      "/patients": ["admin", "doctor", "nurse", "receptionist"],
      "/appointments": ["admin", "doctor", "nurse", "receptionist"],
      "/doctors": ["admin", "doctor", "nurse", "receptionist"],
      "/opd": ["admin", "doctor", "nurse", "receptionist"],
      "/ipd": ["admin", "doctor", "nurse", "receptionist"],
      "/pharmacy": ["admin", "pharmacist"],
      "/laboratory": ["admin", "lab_tech"],
      "/inventory": ["admin", "pharmacist", "lab_tech", "accountant"],
      "/pos": ["admin", "accountant", "receptionist"],
      "/billing": ["admin", "accountant", "receptionist"],
      "/payments": ["admin", "accountant", "receptionist"],
      "/insurance": ["admin", "accountant", "receptionist"],
      "/accounts": ["admin", "accountant"],
      "/reports": ["admin", "accountant"],
      "/users": ["admin"],
      "/audit-logs": ["admin", "accountant"],
      "/settings": ["admin"],
    }

    const currentRoute = Object.keys(rolePermissions).find(route =>
      pathname === route || pathname.startsWith(route + "/")
    )

    if (currentRoute && user?.role) {
      if (!rolePermissions[currentRoute].includes(user.role)) {
        router.replace("/dashboard")
      }
    }
  }, [isAuthenticated, isLoading, router, pathname, user?.role])

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <DashboardHeader />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
