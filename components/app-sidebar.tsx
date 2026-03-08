"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSidebar } from "@/components/ui/sidebar"
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Stethoscope,
  ClipboardPlus,
  BedDouble,
  Pill,
  FlaskConical,
  Receipt,
  ShieldCheck,
  Warehouse,
  BarChart3,
  BookOpen,
  Settings,
  UserCog,
  ScrollText,
  Activity,
  User,
  ShoppingCart,
  DollarSign,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useAuth } from "@/lib/auth-context"

const navGroups = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Clinical",
    roles: ["admin", "doctor", "nurse", "receptionist"],
    items: [
      { title: "Patients", href: "/patients", icon: Users },
      { title: "Appointments", href: "/appointments", icon: CalendarDays },
      { title: "Doctors", href: "/doctors", icon: Stethoscope },
      { title: "OPD", href: "/opd", icon: ClipboardPlus },
      { title: "IPD", href: "/ipd", icon: BedDouble },
    ],
  },
  {
    label: "Pharmacy & Lab",
    roles: ["admin", "pharmacist", "lab_tech"],
    items: [
      { title: "Pharmacy", href: "/pharmacy", icon: Pill },
      { title: "Laboratory", href: "/laboratory", icon: FlaskConical },
      { title: "Inventory", href: "/inventory", icon: Warehouse, roles: ["admin", "pharmacist", "lab_tech", "accountant"] },
    ],
  },
  {
    label: "Financial",
    roles: ["admin", "accountant", "receptionist"],
    items: [
      { title: "Point of Sale", href: "/pos", icon: ShoppingCart },
      { title: "Billing", href: "/billing", icon: Receipt },
      { title: "Payments", href: "/payments", icon: DollarSign },
      { title: "Insurance", href: "/insurance", icon: ShieldCheck },
      { title: "Accounts", href: "/accounts", icon: BookOpen, roles: ["admin", "accountant"] },
      { title: "Reports", href: "/reports", icon: BarChart3, roles: ["admin", "accountant"] },
    ],
  },
  {
    label: "Administration",
    roles: ["admin", "accountant"],
    items: [
      { title: "Users", href: "/users", icon: UserCog, roles: ["admin"] },
      { title: "Audit Logs", href: "/audit-logs", icon: ScrollText },
      { title: "Settings", href: "/settings", icon: Settings, roles: ["admin"] },
    ],
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { user } = useAuth()
  const { setOpenMobile, isMobile } = useSidebar()

  const filteredGroups = navGroups.filter(group => {
    if (group.roles && !group.roles.includes(user?.role || "")) return false
    return true
  }).map(group => ({
    ...group,
    items: group.items.filter(item => {
      if ((item as any).roles && !(item as any).roles.includes(user?.role || "")) return false
      return true
    })
  })).filter(group => group.items.length > 0)

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="border-b border-sidebar-border">
        {/* ... existing header ... */}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="mb-2 h-auto py-2 hover:bg-transparent">
              <Link href="/dashboard" onClick={() => isMobile && setOpenMobile(false)} className="justify-center">
                <div className="flex items-center justify-center w-full">
                  <img
                    src="/logo.jpg"
                    alt="HUDI SOFT Logo"
                    className="h-16 w-auto object-contain transition-transform hover:scale-105"
                  />
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {filteredGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                        <Link href={item.href} onClick={() => isMobile && setOpenMobile(false)}>
                          <item.icon className="size-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        {/* ... existing footer ... */}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg">
              <div className="flex aspect-square size-8 items-center justify-center rounded-full bg-sidebar-primary/20 text-sidebar-primary">
                <User className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="text-sm font-medium">{user?.name}</span>
                <span className="text-xs text-sidebar-foreground/60 capitalize">{user?.role?.replace("_", " ")}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
