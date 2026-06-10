import { Newspaper } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { FundNewsItem } from "@/lib/holdings/fundDetailMetrics"

interface FundNewsPanelProps {
  items: FundNewsItem[]
}

export function FundNewsPanel({ items }: FundNewsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Newspaper className="size-4 text-muted-foreground" aria-hidden />
          <CardTitle className="text-base">Market context</CardTitle>
        </div>
        <CardDescription>
          Illustrative headlines for advisor discussion; not live news.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {items.map((item) => (
          <article
            key={item.id}
            className="rounded-lg border border-border bg-muted/20 p-4 transition-colors hover:bg-muted/30"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>{item.source}</span>
              <time dateTime={item.publishedAt}>{item.publishedAt}</time>
            </div>
            <h3 className="mt-2 text-sm font-semibold leading-snug">{item.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.summary}</p>
          </article>
        ))}
      </CardContent>
    </Card>
  )
}
