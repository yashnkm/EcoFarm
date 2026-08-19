import type { Device } from "@/types/api"

// Shared online/offline visual language for device status, used by both
// the dashboard tiles and the live device detail card. Deliberately only
// two states — ONLINE (green) and everything else (grey) — so status stays
// glanceable instead of competing with alert-severity signaling.

export function isDeviceOnline(status: Device["status"]) {
  return status === "ONLINE"
}

/** Left-edge tile accent — same color tokens as the status badge below, so
 * the accent and the badge always read as one signal, not two. */
export function statusAccentClass(status: Device["status"]) {
  return isDeviceOnline(status) ? "border-l-emerald-400" : "border-l-destructive"
}

/** Status badge variant + color override — ONLINE reads as a clear positive green. */
export function statusBadgeProps(status: Device["status"]) {
  if (isDeviceOnline(status)) {
    return {
      variant: "outline" as const,
      className: "border-emerald-500/30 bg-emerald-500/15 text-emerald-400",
    }
  }
  return { variant: "destructive" as const, className: undefined }
}
