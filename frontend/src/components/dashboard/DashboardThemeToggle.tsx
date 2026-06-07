import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface DashboardThemeToggleProps {
  isDark: boolean
  onToggle: () => void
  className?: string
}

export function DashboardThemeToggle({
  isDark,
  onToggle,
  className,
}: DashboardThemeToggleProps) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onToggle}
      aria-pressed={isDark}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "min-h-[44px] gap-2 sm:min-h-0",
        isDark && "border-white/15 bg-slate-800/80 text-slate-100 hover:bg-slate-700",
        className
      )}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      <span className="hidden sm:inline">{isDark ? "Light" : "Dark"}</span>
    </Button>
  )
}
