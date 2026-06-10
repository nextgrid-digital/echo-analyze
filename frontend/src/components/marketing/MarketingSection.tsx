import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface MarketingSectionProps {
  children: ReactNode
  className?: string
  id?: string
  variant?: "default" | "muted" | "dark"
}

export function MarketingSection({
  children,
  className,
  id,
  variant = "default",
}: MarketingSectionProps) {
  return (
    <section
      id={id}
      className={cn(
        "px-4 py-16 sm:px-6 sm:py-20 lg:py-24",
        variant === "muted" && "border-y border-border bg-muted/40",
        variant === "dark" && "marketing-cta-gradient",
        className
      )}
    >
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  )
}

interface SectionHeadingProps {
  eyebrow?: string
  title: string
  description?: string
  align?: "left" | "center"
  dark?: boolean
  className?: string
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  dark = false,
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "mb-12 max-w-2xl",
        align === "center" && "mx-auto text-center",
        className
      )}
    >
      {eyebrow && (
        <p
          className={cn(
            "text-label",
            dark ? "text-white/60" : "text-muted-foreground"
          )}
        >
          {eyebrow}
        </p>
      )}
      <h2
        className={cn(
          "mt-3 text-3xl font-bold tracking-tight sm:text-4xl",
          dark && "text-white"
        )}
      >
        {title}
      </h2>
      {description && (
        <p
          className={cn(
            "mt-4 text-base sm:text-lg",
            dark ? "text-white/70" : "text-muted-foreground"
          )}
        >
          {description}
        </p>
      )}
    </div>
  )
}
