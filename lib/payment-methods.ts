/**
 * Shared payment methods used across the entire HMS system.
 * All payment-method dropdowns should import from here to stay consistent.
 */
export const PAYMENT_METHODS = [
  { value: "cash",      label: "Cash",           icon: "💵", color: "text-emerald-600" },
  { value: "zaad",      label: "Zaad",           icon: "📱", color: "text-blue-600"    },
  { value: "evc",       label: "EVC Plus",       icon: "📱", color: "text-orange-600"  },
  { value: "sahal",     label: "Sahal",          icon: "📱", color: "text-purple-600"  },
  { value: "edahab",    label: "E-Dahab",        icon: "📱", color: "text-yellow-600"  },
  { value: "bank",      label: "Bank Transfer",  icon: "🏦", color: "text-slate-700"   },
  { value: "insurance", label: "Insurance",      icon: "🛡️", color: "text-indigo-600"  },
] as const;

export type PaymentMethodValue = typeof PAYMENT_METHODS[number]["value"];

/** Get the display label for a payment method value */
export function getPaymentMethodLabel(value: string): string {
  return PAYMENT_METHODS.find(m => m.value === value)?.label ?? value;
}

/** Get the icon for a payment method value */
export function getPaymentMethodIcon(value: string): string {
  return PAYMENT_METHODS.find(m => m.value === value)?.icon ?? "💳";
}
