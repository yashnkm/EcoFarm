import { Download } from "lucide-react"

import { usePwaInstall } from "@/hooks/usePwaInstall"
import { Button } from "@/components/ui/button"
import { IOSInstallDialog } from "./IOSInstallDialog"

/** Compact header affordance for discoverability, next to ThemeToggle.
 * Deliberately renders nothing at all outside the two cases where there's
 * actually something useful to do here (a real install prompt, or iOS
 * Safari's manual flow) — already-installed and unsupported-browser cases
 * only get a message in the fuller Settings > Install app card, not a
 * disabled button cluttering every page's header. */
export function InstallAppHeaderButton() {
  const { platform, promptInstall } = usePwaInstall()

  if (platform === "promptable") {
    return (
      <Button variant="ghost" size="icon-sm" onClick={promptInstall} title="Install EcoFarm" aria-label="Install EcoFarm">
        <Download />
      </Button>
    )
  }

  if (platform === "ios-safari") {
    return (
      <IOSInstallDialog
        trigger={
          <Button variant="ghost" size="icon-sm" title="Install EcoFarm" aria-label="Install EcoFarm">
            <Download />
          </Button>
        }
      />
    )
  }

  return null
}
