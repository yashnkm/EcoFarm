import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"

import { useTheme } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

/** Same sliding pill-switch visual language as the section on/off controls
 * elsewhere in the app — clicking always sets an explicit light or dark
 * (never leaves it on "system"), same as any simple two-state switch. */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const [systemIsDark, setSystemIsDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches
  )
  useEffect(() => {
    if (theme !== "system") return
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = () => setSystemIsDark(mq.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [theme])

  const isDark = theme === "system" ? systemIsDark : theme === "dark"

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-300",
        isDark ? "border-transparent bg-primary" : "border-input bg-muted"
      )}
    >
      <span
        className={cn(
          "inline-flex size-5 translate-x-0.5 items-center justify-center rounded-full bg-background shadow transition-transform duration-300 motion-reduce:transition-none",
          isDark && "translate-x-5.5"
        )}
      >
        {isDark
          ? <Moon className="size-3 text-primary" />
          : <Sun className="size-3 text-muted-foreground" />}
      </span>
    </button>
  )
}
