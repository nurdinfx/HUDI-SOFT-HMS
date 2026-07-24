import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const statusStyles: Record<string, string> = {
  // General
  "active": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  "inactive": "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  "available": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",

  // Appointments
  "scheduled": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "in-progress": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  "completed": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  "cancelled": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  "no-show": "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",

  // Prescriptions
  "pending": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  "dispensed": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  "partially-dispensed": "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",

  // Lab
  "ordered": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "sample-collected": "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",

  // Billing
  "paid": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  "partial": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  "unpaid": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  "overdue": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",

  // Insurance
  "submitted": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "under-review": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  "approved": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  "rejected": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  "settled": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",

  // Doctors
  "on-leave": "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  "busy": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",

  // IPD
  "admitted": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "discharged": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  "transferred": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",

  // OPD
  "waiting": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  "in-consultation": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",

  // Inventory
  "in-stock": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  "low-stock": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  "out-of-stock": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  "expired": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",

  // Beds
  "occupied": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "maintenance": "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  "reserved": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",

  // Priority
  "normal": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "urgent": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  "critical": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
}

interface StatusBadgeProps {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const style = statusStyles[status] ?? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
  return (
    <Badge variant="secondary" className={cn("border-0 font-medium capitalize", style, className)}>
      {status.replace(/-/g, " ")}
    </Badge>
  )
}
