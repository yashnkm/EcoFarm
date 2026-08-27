import { useCallback, useEffect, useState } from "react"

/** Registers /sw.js on mount and flags when a newly-installed worker is
 * ready to take over from one that's already controlling this page — i.e.
 * a new version of the app is cached and waiting, as opposed to the very
 * first install (nothing to "update" from, so no banner then).
 *
 * sw.js calls skipWaiting()/clients.claim() unconditionally, so the new
 * worker activates on its own without needing a postMessage handshake —
 * this hook only has to detect that it happened and let the user decide
 * when to actually reload the page to pick up the new build. */
export function useServiceWorkerUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false)

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return

    navigator.serviceWorker.register("/sw.js").then((registration) => {
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing
        if (!newWorker) return
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            setUpdateAvailable(true)
          }
        })
      })
    }).catch(() => {
      // Registration can fail (e.g. non-HTTPS, or the file 404s) — the
      // site just keeps working as a normal, uncached website either way.
    })
  }, [])

  const reload = useCallback(() => window.location.reload(), [])

  return { updateAvailable, reload }
}
