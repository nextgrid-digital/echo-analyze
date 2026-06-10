import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useClientAnalysis } from "@/hooks/useClientAnalysis"
import { getDashboardMethodologyWarnings } from "@/lib/portfolioAnalysis"

export function NotificationCenter() {
  const { summary, holdings, hasData } = useClientAnalysis()

  const notices = hasData
    ? [
        ...(summary.warnings ?? []),
        ...getDashboardMethodologyWarnings(summary, holdings),
      ].slice(0, 5)
    : []

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Methodology notices</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notices.length === 0 ? (
          <DropdownMenuItem disabled>No notices for the active client</DropdownMenuItem>
        ) : (
          notices.map((notice) => (
            <DropdownMenuItem
              key={`${notice.section}|${notice.message}`}
              className="flex flex-col items-start gap-0.5"
            >
              <span className="font-medium">{notice.section}</span>
              <span className="text-xs text-muted-foreground line-clamp-2">
                {notice.message}
              </span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
