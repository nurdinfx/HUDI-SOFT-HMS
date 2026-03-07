"use client"

import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Bell, Moon, Sun, Search, LogOut, BellOff } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/lib/auth-context"
import { Badge } from "@/components/ui/badge"
import { useNotifications } from "@/hooks/use-notifications"

export function DashboardHeader() {
  const router = useRouter()
  const { setTheme, theme } = useTheme()
  const { user, logout } = useAuth()
  const { permission, requestPermission } = useNotifications()
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchNotifications() {
      try {
        const res = await fetch('/api/audit?limit=5')
        if (res.ok) {
          const data = await res.json()
          setNotifications(data)
        }
      } catch (error) {
        console.error('Failed to fetch notifications:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchNotifications()
    // Poll for notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  function handleLogout() {
    logout()
    router.replace("/login")
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-card px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />

      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search patients, doctors, records..."
          className="pl-9 h-9 bg-secondary/50 border-0 focus-visible:ring-1"
        />
      </div>

      <div className="ml-auto flex items-center gap-1">
        {permission !== 'granted' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={requestPermission}
            className="text-xs text-muted-foreground hover:text-primary transition-colors hidden md:flex items-center gap-1.5"
          >
            <BellOff className="size-3.5" />
            Enable Alerts
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className={`size-4 ${permission === 'granted' ? 'text-primary' : ''}`} />
              {notifications.length > 0 && (
                <Badge className="absolute -top-0.5 -right-0.5 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-destructive text-destructive-foreground">
                  {notifications.length}
                </Badge>
              )}
              <span className="sr-only">Notifications</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Recent Activity</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {loading ? (
              <div className="p-4 text-center text-xs text-muted-foreground">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">No recent notifications</div>
            ) : (
              notifications.map((notif) => (
                <DropdownMenuItem key={notif.id} className="flex flex-col items-start gap-1 cursor-pointer p-3">
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-primary">{notif.module.toUpperCase()}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <span className="text-xs font-medium">{notif.action}</span>
                  <span className="text-[11px] text-muted-foreground line-clamp-2">{notif.details}</span>
                  <span className="text-[10px] text-muted-foreground/70 italic">By {notif.userName}</span>
                </DropdownMenuItem>
              ))
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="justify-center text-xs font-medium cursor-pointer text-primary" onClick={() => router.push('/audit-logs')}>
              View All Logs
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 ml-1">
              <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                <span className="text-xs font-semibold">
                  {user?.name?.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </span>
              </div>
              <span className="hidden md:block text-sm">{user?.name}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex flex-col">
              <span>{user?.name}</span>
              <span className="text-xs font-normal text-muted-foreground">{user?.email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive cursor-pointer" onClick={handleLogout}>
              <LogOut className="mr-2 size-4" />
              Log Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
