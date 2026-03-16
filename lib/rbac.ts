export type UserRole = 
  | "admin"
  | "doctor"
  | "nurse"
  | "pharmacist"
  | "lab_tech"
  | "receptionist"
  | "accountant"

export const ROLE_ROUTE_MAP: Record<UserRole, string[]> = {
  admin: ["*"],
  doctor: [
    "/dashboard",
    "/patients",
    "/appointments",
    "/doctors",
    "/opd",
    "/ipd",
    "/laboratory",
  ],
  nurse: [
    "/dashboard",
    "/patients",
    "/appointments",
    "/opd",
    "/ipd",
  ],
  pharmacist: [
    "/dashboard",
    "/pharmacy",
    "/inventory",
    "/pos",
    "/daily-operations",
    "/payments",
    "/credit",
  ],
  lab_tech: [
    "/dashboard",
    "/laboratory",
    "/inventory",
  ],
  receptionist: [
    "/dashboard",
    "/patients",
    "/appointments",
    "/doctors",
    "/pos",
    "/billing",
    "/payments",
    "/laboratory",
    "/daily-operations",
    "/credit",
  ],
  accountant: [
    "/dashboard",
    "/billing",
    "/payments",
    "/insurance",
    "/accounts",
    "/reports",
    "/inventory",
    "/pos",
    "/audit-logs",
    "/daily-operations",
  ]
}

export function hasAccess(userRole: string | undefined, pathname: string): boolean {
  if (!userRole) return false;
  
  const role = userRole as UserRole;
  const allowedRoutes = ROLE_ROUTE_MAP[role];

  if (!allowedRoutes) return false;
  if (allowedRoutes.includes("*")) return true;

  // Check if current pathname starts with any allowed route
  // e.g. /patients/123 should be allowed if /patients is allowed
  return allowedRoutes.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  );
}
