import { cn } from "@/lib/utils"

export interface FeatureGridItem {
  title: string
  description: string
}

interface FeatureGridProps {
  items: readonly FeatureGridItem[]
  className?: string
}

export function FeatureGrid({ items, className }: FeatureGridProps) {
  return (
    <div
      className={cn(
        "grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3",
        className
      )}
    >
      {items.map((item) => (
        <div
          key={item.title}
          className="marketing-feature-card bg-background p-6 transition-colors hover:bg-muted/30 sm:p-8"
        >
          <h3 className="text-base font-semibold tracking-tight sm:text-lg">{item.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
        </div>
      ))}
    </div>
  )
}
