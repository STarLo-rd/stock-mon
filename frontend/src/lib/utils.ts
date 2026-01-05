import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get semantic badge variant based on alert threshold
 * @param threshold - Alert threshold percentage (5, 10, 15, 20+)
 * @returns Badge variant name
 */
export function getAlertSeverityVariant(threshold: number): 'critical' | 'warning' | 'caution' | 'success' {
  if (threshold >= 20) return 'critical';
  if (threshold >= 15) return 'warning';
  if (threshold >= 10) return 'caution';
  return 'success';
}

/**
 * Get semantic color class for alert threshold
 * @param threshold - Alert threshold percentage
 * @returns Tailwind color class
 */
export function getAlertSeverityColor(threshold: number): string {
  if (threshold >= 20) return 'bg-critical text-critical-foreground';
  if (threshold >= 15) return 'bg-warning text-warning-foreground';
  if (threshold >= 10) return 'bg-caution text-caution-foreground';
  return 'bg-success text-success-foreground';
}

