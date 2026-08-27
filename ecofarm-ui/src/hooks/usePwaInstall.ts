import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

export type InstallPlatform =
  | "installed"          // already running as an installed app
  | "promptable"         // beforeinstallprompt captured — Android / desktop Chromium
  | "ios-safari"         // iOS Safari — needs the manual "Add to Home Screen" flow
  | "ios-other-browser"  // iOS Chrome/Firefox/Edge — same WebKit engine, but can't install from here
  | "unsupported"        // no known install path (e.g. desktop Firefox)

function detectIOS(): boolean {
  const ua = navigator.userAgent
  // iPadOS 13+ reports itself as "MacIntel" with no "iPad" in the UA —
  // touch points is the only reliable way left to tell it apart from a
  // real Mac.
  const isIPadOS13Plus = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1
  return /iPad|iPhone|iPod/.test(ua) || isIPadOS13Plus
}

function detectIOSSafari(): boolean {
  // Every iOS browser is a WebKit wrapper, so its UA still contains
  // "Safari" — only real Safari's UA is missing every OTHER browser's own
  // marker (CriOS = Chrome, FxiOS = Firefox, EdgiOS = Edge, OPiOS = Opera).
  const ua = navigator.userAgent
  return /^((?!chrome|android|crios|fxios|edgios|opios).)*safari/i.test(ua)
}

function detectStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // Legacy iOS-only flag — set once the app is actually launched from a
    // home-screen icon; matchMedia above isn't reliable on iOS.
    (navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

/** Everything needed to render a correct "Install app" affordance for
 * whatever browser/platform the visitor is actually on — capturing
 * Chromium's install prompt where available, and telling every other
 * case apart (already installed, iOS Safari, iOS-but-not-Safari, or no
 * install path at all) so the UI never shows the wrong instructions. */
export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isStandalone, setIsStandalone] = useState(detectStandalone)

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Stop Chromium's own mini-infobar — the app shows its own Install
      // button instead, and replays this exact captured event when clicked.
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    const handleAppInstalled = () => {
      setIsStandalone(true)
      setDeferredPrompt(null)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [])

  const isIOS = detectIOS()
  const isIOSSafari = isIOS && detectIOSSafari()

  const platform: InstallPlatform = isStandalone
    ? "installed"
    : deferredPrompt
      ? "promptable"
      : isIOS
        ? (isIOSSafari ? "ios-safari" : "ios-other-browser")
        : "unsupported"

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return
    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === "accepted") {
        setIsStandalone(true)
        toast.success("EcoFarm installed")
      }
      // "dismissed" is a completely normal, silent outcome — no toast, no error.
    } catch {
      toast.error("Couldn't open the install prompt")
    } finally {
      // A captured beforeinstallprompt event can only ever be used once.
      setDeferredPrompt(null)
    }
  }, [deferredPrompt])

  return { platform, promptInstall }
}
