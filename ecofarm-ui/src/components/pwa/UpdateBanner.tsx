import { RefreshCw } from "lucide-react"

import { useServiceWorkerUpdate } from "@/hooks/useServiceWorkerUpdate"
import { Button } from "@/components/ui/button"

/** Sits mounted once at the app root (see main.tsx) and renders nothing
 * until a new version has finished installing in the background. Refresh
 * is always the user's own choice — nothing here ever reloads the page
 * on its own mid-use. */
export function UpdateBanner() {
  const { updateAvailable, reload } = useServiceWorkerUpdate()

  if (!updateAvailable) return null

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      <div className="flex items-center gap-3 rounded-lg border bg-popover px-4 py-2.5 text-sm text-popover-foreground shadow-lg">
        <span>A new version is available.</span>
        <Button size="sm" onClick={reload}>
          <RefreshCw data-icon="inline-start" />
          Refresh
        </Button>
      </div>
    </div>
  )
}
