import { MarketingBenchmarkChart } from "./MarketingBenchmarkChart"

export function PerformanceChartPreview() {
  return (
    <div className="bg-background p-6">
      <div className="mb-4">
        <p className="text-base font-semibold tracking-tight">Performance vs Benchmark</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Illustrative reconstructed comparison path
        </p>
      </div>
      <div className="rounded-lg border border-border bg-card p-4">
        <MarketingBenchmarkChart height={280} gradientId="performancePreviewFill" />
      </div>
    </div>
  )
}
