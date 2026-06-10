import { MarketingBenchmarkChart } from "./MarketingBenchmarkChart"

export function HeroBenchmarkPreview() {
  return (
    <div className="bg-background px-8 py-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-muted-foreground">Portfolio vs benchmark</p>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            <span className="h-0.5 w-4 bg-foreground" />
            Portfolio
          </span>
          <span className="flex items-center gap-2">
            <span className="h-0.5 w-4 border-t border-dashed border-muted-foreground" />
            Benchmark
          </span>
        </div>
      </div>
      <MarketingBenchmarkChart height={360} gradientId="heroPortfolioFill" />
    </div>
  )
}
