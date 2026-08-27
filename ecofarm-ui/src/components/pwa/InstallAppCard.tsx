import { CheckCircle2, Download, Smartphone } from "lucide-react"

import { usePwaInstall } from "@/hooks/usePwaInstall"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { IOSInstallDialog } from "./IOSInstallDialog"

/** Settings-page counterpart to the header install button — same
 * usePwaInstall state, just laid out as a full card matching this page's
 * existing Account/Change-password card style. */
export function InstallAppCard() {
  const { platform, promptInstall } = usePwaInstall()

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="size-4" />
          Install app
        </CardTitle>
        <CardDescription>
          Add EcoFarm to your home screen or desktop for quick, full-screen access — no app store needed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {platform === "installed" && (
          <Badge variant="secondary" className="gap-1">
            <CheckCircle2 className="size-3.5" />
            App already installed
          </Badge>
        )}

        {platform === "promptable" && (
          <Button onClick={promptInstall}>
            <Download data-icon="inline-start" />
            Install EcoFarm
          </Button>
        )}

        {platform === "ios-safari" && (
          <IOSInstallDialog
            trigger={
              <Button>
                <Download data-icon="inline-start" />
                Install EcoFarm
              </Button>
            }
          />
        )}

        {platform === "ios-other-browser" && (
          <p className="text-sm text-muted-foreground">
            To install EcoFarm on this device, open this page in <strong>Safari</strong> — other browsers on iOS
            can't add it to your home screen.
          </p>
        )}

        {platform === "unsupported" && (
          <p className="text-sm text-muted-foreground">
            This browser doesn't support installing EcoFarm as an app — try Chrome or Edge instead.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
