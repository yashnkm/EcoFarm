import { useState } from "react"
import { Share, Plus, SquarePlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

/** iOS Safari has no beforeinstallprompt — "installing" only happens
 * through the Share sheet, so the best a web app can do is walk the user
 * through it. trigger lets each call site (Settings card vs. header
 * button) supply its own button style while sharing this one dialog. */
export function IOSInstallDialog({ trigger }: { trigger: React.ReactElement }) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Install EcoFarm</DialogTitle>
          <DialogDescription>iOS doesn't let a website trigger this automatically — a couple of taps in Safari does it:</DialogDescription>
        </DialogHeader>
        <ol className="flex flex-col gap-3 py-2 text-sm">
          <li className="flex items-center gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted font-medium">1</span>
            <span className="flex items-center gap-1.5">
              Tap the Share icon <Share className="size-4 text-muted-foreground" /> in Safari's toolbar
            </span>
          </li>
          <li className="flex items-center gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted font-medium">2</span>
            <span className="flex items-center gap-1.5">
              Scroll down and tap <SquarePlus className="size-4 text-muted-foreground" /> "Add to Home Screen"
            </span>
          </li>
          <li className="flex items-center gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted font-medium">3</span>
            <span className="flex items-center gap-1.5">
              Tap <Plus className="size-4 text-muted-foreground" /> "Add" to confirm
            </span>
          </li>
        </ol>
        <Button variant="outline" onClick={() => setOpen(false)}>Got it</Button>
      </DialogContent>
    </Dialog>
  )
}
