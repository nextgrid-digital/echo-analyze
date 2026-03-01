import { useEffect, useMemo, useRef, useState } from "react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"
import { CHART_COLORS } from "@/lib/chartColors"
import { toLakhs } from "@/lib/format"
import {
  BENCHMARK_RECONSTRUCTED_NOTICE,
  formatBenchmarkCoverageNotice,
} from "@/lib/portfolioAnalysis"
import { Button } from "@/components/ui/button"
import type { AnalysisSummary, Holding } from "@/types/api"

interface PortfolioBenchmarkChartProps {
  summary: AnalysisSummary
  holdings: Holding[]
}

interface ChartDataPoint {
  date: string
  portfolio: number
  benchmark: number
  difference: number
  portfolioPct: number
  benchmarkPct: number
}

interface SeriesHolding {
  entryDate: Date
  entryValue: number
  portfolioTerminal: number
  benchmarkTerminal: number
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ payload?: ChartDataPoint }>
}

type ZoomLevel = "daily" | "monthly" | "yearly"

const DAYS_PER_MONTH = 30.44
const MS_PER_DAY = 1000 * 60 * 60 * 24
const MS_PER_MONTH = MS_PER_DAY * DAYS_PER_MONTH

const formatDateForZoom = (date: Date, zoom: ZoomLevel): string => {
  if (zoom === "daily") {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }
  if (zoom === "monthly") {
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" })
  }
  return date.getFullYear().toString()
}

const incrementDate = (date: Date, interval: ZoomLevel): void => {
  if (interval === "daily") {
    date.setDate(date.getDate() + 1)
    return
  }
  if (interval === "monthly") {
    date.setMonth(date.getMonth() + 1)
    return
  }
  date.setFullYear(date.getFullYear() + 1)
}

const normalizeToPeriodStart = (date: Date, zoom: ZoomLevel): Date => {
  const normalized = new Date(date)
  if (zoom === "monthly") {
    normalized.setDate(1)
  } else if (zoom === "yearly") {
    normalized.setMonth(0)
    normalized.setDate(1)
  }
  return normalized
}

const getValidDate = (value: string | null | undefined): Date | null => {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

const annualToMonthlyRate = (xirr: number | null | undefined): number | null => {
  if (xirr === null || xirr === undefined || Number.isNaN(xirr)) return null
  if (xirr <= -100) return null
  return Math.pow(1 + xirr / 100, 1 / 12) - 1
}

const monthsBetween = (start: Date, end: Date): number =>
  Math.max(0, (end.getTime() - start.getTime()) / MS_PER_MONTH)

const interpolateBetweenEndpoints = (
  entryValue: number,
  terminalValue: number,
  elapsedMonthsNow: number,
  elapsedMonthsAtPoint: number,
): number => {
  if (!Number.isFinite(entryValue) || entryValue <= 0) {
    return Number.isFinite(terminalValue) && terminalValue > 0 ? terminalValue : 0
  }
  if (!Number.isFinite(terminalValue) || terminalValue <= 0) return 0
  if (elapsedMonthsNow <= 0) return terminalValue

  const clampedElapsedMonths = Math.min(elapsedMonthsNow, Math.max(0, elapsedMonthsAtPoint))
  const endpointRatio = terminalValue / entryValue
  if (!Number.isFinite(endpointRatio) || endpointRatio <= 0) {
    return terminalValue
  }

  const progressRatio = clampedElapsedMonths / elapsedMonthsNow
  const interpolatedValue = entryValue * Math.pow(endpointRatio, progressRatio)
  if (!Number.isFinite(interpolatedValue) || interpolatedValue < 0) {
    return terminalValue
  }
  return interpolatedValue
}

export function PortfolioBenchmarkChart({ summary, holdings }: PortfolioBenchmarkChartProps) {
  const datedEntries = useMemo(
    () => holdings.map((holding) => getValidDate(holding.date_of_entry)).filter((date): date is Date => date !== null),
    [holdings],
  )

  const fallbackStartDate = useMemo(() => {
    if (datedEntries.length > 0) {
      return new Date(Math.min(...datedEntries.map((date) => date.getTime())))
    }

    const fallback = new Date()
    fallback.setMonth(fallback.getMonth() - 12)
    return fallback
  }, [datedEntries])

  const autoZoomLevel = useMemo(() => {
    const now = new Date()
    const monthsDiff = monthsBetween(fallbackStartDate, now)
    if (monthsDiff < 1) return "daily"
    if (monthsDiff > 120) return "yearly"
    return "monthly"
  }, [fallbackStartDate])

  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>(autoZoomLevel)
  const [lastZoomTime, setLastZoomTime] = useState(0)
  const touchStartDistanceRef = useRef<number | null>(null)

  useEffect(() => {
    setZoomLevel(autoZoomLevel)
  }, [autoZoomLevel])

  const seriesMeta = useMemo(() => {
    const totalPortfolioValue = holdings.reduce(
      (sum, holding) => sum + (Number.isFinite(holding.market_value) ? holding.market_value : 0),
      0,
    )

    const benchmarkComparableHoldings: SeriesHolding[] = []
    let comparableCurrentValue = 0
    let excludedHoldings = 0

    for (const holding of holdings) {
      const portfolioTerminal = Number.isFinite(holding.market_value) ? holding.market_value : 0
      if (portfolioTerminal <= 0) continue

      const benchmarkTerminal =
        holding.missed_gains !== null && holding.missed_gains !== undefined
          ? portfolioTerminal + holding.missed_gains
          : null

      if (benchmarkTerminal === null || !Number.isFinite(benchmarkTerminal) || benchmarkTerminal <= 0) {
        excludedHoldings += 1
        continue
      }

      comparableCurrentValue += portfolioTerminal
      const entryValue =
        Number.isFinite(holding.cost_value) && holding.cost_value > 0 ? holding.cost_value : portfolioTerminal

      benchmarkComparableHoldings.push({
        entryDate: getValidDate(holding.date_of_entry) ?? fallbackStartDate,
        entryValue,
        portfolioTerminal,
        benchmarkTerminal,
      })
    }

    const comparableStartDate =
      benchmarkComparableHoldings.length > 0
        ? new Date(Math.min(...benchmarkComparableHoldings.map((holding) => holding.entryDate.getTime())))
        : fallbackStartDate

    return {
      benchmarkComparableHoldings,
      comparableCoveragePct:
        totalPortfolioValue > 0 ? Math.min(100, (comparableCurrentValue / totalPortfolioValue) * 100) : 0,
      excludedHoldings,
      comparableStartDate,
      hasComparableSeries: comparableCurrentValue > 0,
    }
  }, [fallbackStartDate, holdings])

  const ZOOM_THROTTLE_MS = 300

  const changeGranularity = (direction: "in" | "out") => {
    const now = Date.now()
    if (now - lastZoomTime < ZOOM_THROTTLE_MS) return

    setLastZoomTime(now)

    if (direction === "in") {
      if (zoomLevel === "yearly") setZoomLevel("monthly")
      else if (zoomLevel === "monthly") setZoomLevel("daily")
      return
    }

    if (zoomLevel === "daily") setZoomLevel("monthly")
    else if (zoomLevel === "monthly") setZoomLevel("yearly")
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    changeGranularity(e.deltaY < 0 ? "in" : "out")
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 2) return
    touchStartDistanceRef.current = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY,
    )
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length !== 2 || touchStartDistanceRef.current === null) return

    const currentDistance = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY,
    )
    const diff = currentDistance - touchStartDistanceRef.current

    if (Math.abs(diff) <= 50) return

    changeGranularity(diff > 0 ? "out" : "in")
    touchStartDistanceRef.current = null
  }

  const handleTouchEnd = () => {
    touchStartDistanceRef.current = null
  }

  const effectiveZoomLevel = zoomLevel

  const chartData = useMemo(() => {
    const endDate = new Date()
    const usingComparableSeries = seriesMeta.benchmarkComparableHoldings.length > 0
    const baseStartDate = usingComparableSeries ? seriesMeta.comparableStartDate : fallbackStartDate
    const normalizedStartDate = usingComparableSeries
      ? new Date(baseStartDate)
      : normalizeToPeriodStart(baseStartDate, effectiveZoomLevel)
    const rawData: Array<Pick<ChartDataPoint, "date" | "portfolio" | "benchmark">> = []

    let displayStartDate = new Date(normalizedStartDate)
    if (effectiveZoomLevel === "daily") {
      const totalDays = Math.max(1, Math.ceil((endDate.getTime() - normalizedStartDate.getTime()) / MS_PER_DAY))
      const maxDailyPoints = 2000
      if (totalDays > maxDailyPoints) {
        displayStartDate = new Date(endDate)
        displayStartDate.setDate(displayStartDate.getDate() - (maxDailyPoints - 1))
      }
    }

    const current = new Date(displayStartDate)

    if (usingComparableSeries) {
      while (current <= endDate) {
        let portfolioValue = 0
        let benchmarkValue = 0

        for (const holding of seriesMeta.benchmarkComparableHoldings) {
          if (current < holding.entryDate) continue

          const elapsedMonthsNow = monthsBetween(holding.entryDate, endDate)
          const elapsedMonthsAtPoint = monthsBetween(holding.entryDate, current)

          portfolioValue += interpolateBetweenEndpoints(
            holding.entryValue,
            holding.portfolioTerminal,
            elapsedMonthsNow,
            elapsedMonthsAtPoint,
          )
          benchmarkValue += interpolateBetweenEndpoints(
            holding.entryValue,
            holding.benchmarkTerminal,
            elapsedMonthsNow,
            elapsedMonthsAtPoint,
          )
        }

        rawData.push({
          date: formatDateForZoom(current, effectiveZoomLevel),
          portfolio: portfolioValue,
          benchmark: benchmarkValue,
        })

        incrementDate(current, effectiveZoomLevel)
      }
    } else {
      const initialValue = summary.total_cost_value || 1
      const portfolioMonthlyRate = annualToMonthlyRate(summary.portfolio_xirr)
      const benchmarkMonthlyRate = annualToMonthlyRate(summary.benchmark_xirr)

      while (current <= endDate) {
        const monthsElapsed = monthsBetween(normalizedStartDate, current)
        const portfolioValue = initialValue * Math.pow(1 + (portfolioMonthlyRate ?? 0), monthsElapsed)
        const benchmarkValue = initialValue * Math.pow(1 + (benchmarkMonthlyRate ?? 0), monthsElapsed)

        rawData.push({
          date: formatDateForZoom(current, effectiveZoomLevel),
          portfolio: portfolioValue,
          benchmark: benchmarkValue,
        })

        incrementDate(current, effectiveZoomLevel)
      }
    }

    if (rawData.length < 2) {
      const portfolioFallback = usingComparableSeries
        ? seriesMeta.benchmarkComparableHoldings.reduce((sum, holding) => sum + holding.portfolioTerminal, 0)
        : summary.total_market_value || summary.total_cost_value || 1
      const benchmarkFallback = usingComparableSeries
        ? seriesMeta.benchmarkComparableHoldings.reduce((sum, holding) => sum + holding.benchmarkTerminal, 0)
        : summary.total_cost_value || 1

      rawData.push(
        {
          date: formatDateForZoom(displayStartDate, effectiveZoomLevel),
          portfolio: portfolioFallback,
          benchmark: benchmarkFallback,
        },
        {
          date: formatDateForZoom(endDate, effectiveZoomLevel),
          portfolio: portfolioFallback,
          benchmark: benchmarkFallback,
        },
      )
    }

    const baseline = Math.max(1, Math.min(rawData[0]?.portfolio || 1, rawData[0]?.benchmark || 1))

    return rawData.map((point) => ({
      ...point,
      difference: point.portfolio - point.benchmark,
      portfolioPct: ((point.portfolio - baseline) / baseline) * 100,
      benchmarkPct: ((point.benchmark - baseline) / baseline) * 100,
    }))
  }, [effectiveZoomLevel, fallbackStartDate, seriesMeta, summary.benchmark_xirr, summary.portfolio_xirr, summary.total_cost_value, summary.total_market_value])

  const portfolioRateUnavailable = annualToMonthlyRate(summary.portfolio_xirr) === null
  const benchmarkRateUnavailable = annualToMonthlyRate(summary.benchmark_xirr) === null
  const chartHasPartialCoverage =
    seriesMeta.hasComparableSeries &&
    seriesMeta.comparableCoveragePct < 99.5
  const showFallbackRateWarning =
    seriesMeta.benchmarkComparableHoldings.length === 0 &&
    (portfolioRateUnavailable || benchmarkRateUnavailable)

  const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
    if (!active || !payload || payload.length === 0) return null

    const data = payload[0]?.payload
    const portfolioValue = data?.portfolio || 0
    const benchmarkValue = data?.benchmark || 0
    const portfolioPct = data?.portfolioPct || 0
    const benchmarkPct = data?.benchmarkPct || 0
    const difference = data?.difference || 0

    return (
      <div className="bg-background border border-border rounded-none p-2 shadow-sm">
        <p className="text-xs font-semibold text-foreground mb-1.5">
          {data?.date || ""}
        </p>
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-none" style={{ backgroundColor: CHART_COLORS[0] }} />
            <span className="text-[10px] text-muted-foreground">Portfolio:</span>
            <span className="text-[10px] font-semibold text-foreground">
              {toLakhs(portfolioValue)} ({portfolioPct >= 0 ? "+" : ""}{portfolioPct.toFixed(2)}%)
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-none" style={{ backgroundColor: CHART_COLORS[1] }} />
            <span className="text-[10px] text-muted-foreground">Benchmark:</span>
            <span className="text-[10px] font-semibold text-foreground">
              {toLakhs(benchmarkValue)} ({benchmarkPct >= 0 ? "+" : ""}{benchmarkPct.toFixed(2)}%)
            </span>
          </div>
          <div className="pt-0.5 mt-0.5 border-t border-border">
            <span className="text-[10px] text-muted-foreground">Difference: </span>
            <span
              className={`text-[10px] font-semibold ${
                difference >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              }`}
            >
              {difference >= 0 ? "+" : ""}
              {toLakhs(difference)} ({(portfolioPct - benchmarkPct).toFixed(2)}%)
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="mb-3 border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900">
        {BENCHMARK_RECONSTRUCTED_NOTICE}
      </div>
      {chartHasPartialCoverage && (
        <div className="mb-3 border border-blue-300 bg-blue-50 px-3 py-2 text-xs text-blue-900">
          {formatBenchmarkCoverageNotice({
            comparableCoveragePct: seriesMeta.comparableCoveragePct,
            excludedHoldings: seriesMeta.excludedHoldings,
            hasComparableSeries: seriesMeta.hasComparableSeries,
          })}
        </div>
      )}
      {showFallbackRateWarning && (
        <div className="mb-3 border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {portfolioRateUnavailable && "Portfolio XIRR unavailable/invalid. "}
          {benchmarkRateUnavailable && "Benchmark XIRR unavailable/invalid. "}
          Unavailable aggregate rates are shown as flat reference lines only in the fallback view.
        </div>
      )}

      <div className="flex items-center justify-end gap-2 mb-4">
        <Button
          variant={zoomLevel === "daily" ? "default" : "outline"}
          onClick={() => setZoomLevel("daily")}
          className="rounded-none h-8 px-3 text-xs"
          size="sm"
        >
          Daily
        </Button>
        <Button
          variant={zoomLevel === "monthly" ? "default" : "outline"}
          onClick={() => setZoomLevel("monthly")}
          className="rounded-none h-8 px-3 text-xs"
          size="sm"
        >
          Monthly
        </Button>
        <Button
          variant={zoomLevel === "yearly" ? "default" : "outline"}
          onClick={() => setZoomLevel("yearly")}
          className="rounded-none h-8 px-3 text-xs"
          size="sm"
        >
          Yearly
        </Button>
      </div>

      <div
        className="w-full h-64 sm:h-80 relative border border-border bg-card"
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ touchAction: "none" }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="colorPortfolio" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS[0]} stopOpacity={0.3} />
                <stop offset="95%" stopColor={CHART_COLORS[0]} stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="colorBenchmark" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS[1]} stopOpacity={0.2} />
                <stop offset="95%" stopColor={CHART_COLORS[1]} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              stroke="#6b7280"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="#6b7280"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => {
                if (value >= 100_000) {
                  return `Rs ${(value / 100_000).toFixed(1)}L`
                }
                return `Rs ${(value / 1000).toFixed(0)}K`
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: "10px" }}
              iconType="square"
              formatter={(value) => (
                <span className="text-xs text-foreground">{value}</span>
              )}
            />
            <Area
              type="monotone"
              dataKey="benchmark"
              name="Benchmark"
              stroke={CHART_COLORS[1]}
              strokeWidth={2}
              fill="url(#colorBenchmark)"
              fillOpacity={0.6}
              isAnimationActive
              animationDuration={800}
            />
            <Area
              type="monotone"
              dataKey="portfolio"
              name="Portfolio"
              stroke={CHART_COLORS[0]}
              strokeWidth={3}
              fill="url(#colorPortfolio)"
              fillOpacity={0.6}
              isAnimationActive
              animationDuration={800}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
