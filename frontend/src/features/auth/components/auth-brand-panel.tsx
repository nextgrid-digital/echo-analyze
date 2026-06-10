import { EchoLogo } from "@/components/EchoLogo"
import { cn } from "@/lib/utils"
import { InteractiveGridPattern } from "./interactive-grid"

export function AuthBrandPanel() {
  return (
    <div className="relative hidden h-full flex-col p-10 lg:flex dark:border-r">
      <div className="absolute inset-0 bg-sidebar" />
      <div className="relative z-20 flex items-center gap-2 text-lg font-medium text-sidebar-foreground">
        <EchoLogo size={32} />
        ECHO
      </div>
      <InteractiveGridPattern
        className={cn(
          "mask-[radial-gradient(400px_circle_at_center,white,transparent)]",
          "inset-x-0 inset-y-[0%] h-full skew-y-12"
        )}
      />
      <div className="relative z-20 mt-auto text-sidebar-foreground">
        <p className="text-2xl font-semibold leading-snug tracking-tight">
          Portfolio intelligence for modern wealth advisors.
        </p>
      </div>
    </div>
  )
}
