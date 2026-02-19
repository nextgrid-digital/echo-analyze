import { useMemo, useState, useRef } from "react"
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

type ZoomLevel = "daily" | "monthly" | "yearly"

// Helper function to format dates based on zoom level
const formatDateForZoom = (date: Date, zoom: ZoomLevel): string => {
  if (zoom === "daily") {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  } else if (zoom === "monthly") {
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" })
  } else {
    return date.getFullYear().toString()
  }
}

// Helper function to increment dates
const incrementDate = (date: Date, interval: ZoomLevel): void => {
  if (interval === "daily") {
    date.setDate(date.getDate() + 1)
  } else if (interval === "monthly") {
    date.setMonth(date.getMonth() + 1)
  } else {
    date.setFullYear(date.getFullYear() + 1)
  }
}

// Helper function to normalize date to start of period
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

export function PortfolioBenchmarkChart({ summary, holdings }: PortfolioBenchmarkChartProps) {
  // Find oldest entry date from holdings
  const oldestEntryDate = useMemo(() => {
    const dates = holdings
      .map(h => h.date_of_entry)
      .filter((d): d is string => d != null && d !== "")
      .map(d => {
        // Handle different date formats
        const parsed = new Date(d)
        return parsed
      })
      .filter(d => !isNaN(d.getTime()))
    
    if (dates.length === 0) {
      // Fallback: use 12 months ago from current date
      const fallback = new Date()
      fallback.setMonth(fallback.getMonth() - 12)
      return fallback
    }
    
    return new Date(Math.min(...dates.map(d => d.getTime())))
  }, [holdings])

  // Auto-select appropriate zoom level based on date range
  const autoZoomLevel = useMemo(() => {
    const now = new Date()
    const monthsDiff = (now.getTime() - oldestEntryDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
    
    if (monthsDiff < 1) {
      return "daily"
    } else if (monthsDiff > 120) {
      return "yearly"
    }
    return "monthly"
  }, [oldestEntryDate])

  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>(autoZoomLevel)
  const [lastZoomTime, setLastZoomTime] = useState(0)
  const touchStartDistanceRef = useRef<number | null>(null)
  
  const ZOOM_THROTTLE_MS = 300 // Minimum time between granularity changes

  // Change granularity with throttling
  const changeGranularity = (direction: "in" | "out") => {
    const now = Date.now()
    if (now - lastZoomTime < ZOOM_THROTTLE_MS) return
    
    setLastZoomTime(now)
    
    if (direction === "in") {
      // Zoom in: Yearly -> Monthly -> Daily
      if (zoomLevel === "yearly") {
        setZoomLevel("monthly")
      } else if (zoomLevel === "monthly") {
        setZoomLevel("daily")
      }
    } else {
      // Zoom out: Daily -> Monthly -> Yearly
      if (zoomLevel === "daily") {
        setZoomLevel("monthly")
      } else if (zoomLevel === "monthly") {
        setZoomLevel("yearly")
      }
    }
  }

  // Mouse wheel handler
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    if (e.deltaY < 0) {
      // Scroll up = zoom in
      changeGranularity("in")
    } else {
      // Scroll down = zoom out
      changeGranularity("out")
    }
  }

  // Touch gesture handlers for pinch zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      touchStartDistanceRef.current = distance
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartDistanceRef.current !== null) {
      const currentDistance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      const diff = currentDistance - touchStartDistanceRef.current
      
      // Threshold to prevent too sensitive switching
      if (Math.abs(diff) > 50) {
        if (diff > 0) {
          // Pinch out (zoom out)
          changeGranularity("out")
        } else {
          // Pinch in (zoom in)
          changeGranularity("in")
        }
        touchStartDistanceRef.current = null // Reset to prevent rapid switching
      }
    }
  }

  const handleTouchEnd = () => {
    touchStartDistanceRef.current = null
  }

  // Use auto-selected zoom if user hasn't manually selected
  const effectiveZoomLevel = zoomLevel

  const chartData = useMemo(() => {
    const initialValue = summary.total_cost_value || 1
    const portfolioXirr = summary.portfolio_xirr || 0
    const benchmarkXirr = summary.benchmark_xirr || 0

    // Convert annual XIRR to monthly rate
    const portfolioMonthlyRate = portfolioXirr > 0 
      ? Math.pow(1 + portfolioXirr / 100, 1 / 12) - 1 
      : 0
    const benchmarkMonthlyRate = benchmarkXirr > 0 
      ? Math.pow(1 + benchmarkXirr / 100, 1 / 12) - 1 
      : 0

    // Normalize start date to period start based on zoom level
    const startDate = normalizeToPeriodStart(new Date(oldestEntryDate), effectiveZoomLevel)
    const endDate = new Date()
    
    // Generate data points based on zoom level
    const data: ChartDataPoint[] = []
    const current = new Date(startDate)
    
    // Limit data points for performance (especially for daily view)
    const maxPoints = effectiveZoomLevel === "daily" ? 365 : effectiveZoomLevel === "monthly" ? 120 : 50
    let pointCount = 0
    
    while (current <= endDate && pointCount < maxPoints) {
      // Calculate months elapsed from start date
      const monthsElapsed = (current.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
      
      // Calculate values using compound growth formula: V(t) = V(0) * (1 + r)^t
      const portfolioValue = initialValue * Math.pow(1 + portfolioMonthlyRate, monthsElapsed)
      const benchmarkValue = initialValue * Math.pow(1 + benchmarkMonthlyRate, monthsElapsed)
      
      // Format date based on zoom level
      const dateStr = formatDateForZoom(current, effectiveZoomLevel)
      
      // Calculate percentage returns from initial investment
      const portfolioPct = ((portfolioValue - initialValue) / initialValue) * 100
      const benchmarkPct = ((benchmarkValue - initialValue) / initialValue) * 100
      const difference = portfolioValue - benchmarkValue
      
      data.push({
        date: dateStr,
        portfolio: portfolioValue,
        benchmark: benchmarkValue,
        difference,
        portfolioPct,
        benchmarkPct,
      })
      
      // Increment date based on zoom level
      incrementDate(current, effectiveZoomLevel)
      pointCount++
    }

    // Ensure at least 2-3 data points
    if (data.length < 2) {
      // Fallback: generate at least 2 points
      const now = new Date()
      const start = new Date(now)
      start.setMonth(start.getMonth() - 1)
      
      for (let i = 0; i < 2; i++) {
        const date = new Date(start)
        date.setMonth(date.getMonth() + i)
        const monthsElapsed = i
        const portfolioValue = initialValue * Math.pow(1 + portfolioMonthlyRate, monthsElapsed)
        const benchmarkValue = initialValue * Math.pow(1 + benchmarkMonthlyRate, monthsElapsed)
        const portfolioPct = ((portfolioValue - initialValue) / initialValue) * 100
        const benchmarkPct = ((benchmarkValue - initialValue) / initialValue) * 100
        
        data.push({
          date: formatDateForZoom(date, effectiveZoomLevel),
          portfolio: portfolioValue,
          benchmark: benchmarkValue,
          difference: portfolioValue - benchmarkValue,
          portfolioPct,
          benchmarkPct,
        })
      }
    }

    return data
  }, [summary.total_cost_value, summary.portfolio_xirr, summary.benchmark_xirr, oldestEntryDate, effectiveZoomLevel])

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
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
              <div 
                className="w-2.5 h-2.5 rounded-none" 
                style={{ backgroundColor: CHART_COLORS[0] }}
              />
              <span className="text-[10px] text-muted-foreground">Portfolio:</span>
              <span className="text-[10px] font-semibold text-foreground">
                {toLakhs(portfolioValue)} ({portfolioPct >= 0 ? "+" : ""}{portfolioPct.toFixed(2)}%)
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div 
                className="w-2.5 h-2.5 rounded-none" 
                style={{ backgroundColor: CHART_COLORS[1] }}
              />
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
                {difference >= 0 ? "+" : ""}{toLakhs(difference)} ({(portfolioPct - benchmarkPct).toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }


  return (
    <div className="w-full">
      {/* Time Granularity Controls */}
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
      
      {/* Chart with Dynamic Time Granularity Zoom */}
      <div 
        className="w-full h-64 sm:h-80 relative border border-border bg-card"
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ touchAction: "none" }} // Prevent default browser zoom
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
          >
            <defs>
              <linearGradient id="colorPortfolio" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS[0]} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={CHART_COLORS[0]} stopOpacity={0.05}/>
              </linearGradient>
              <linearGradient id="colorBenchmark" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS[1]} stopOpacity={0.2}/>
                <stop offset="95%" stopColor={CHART_COLORS[1]} stopOpacity={0.05}/>
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
                  return `₹${(value / 100_000).toFixed(1)}L`
                }
                return `₹${(value / 1000).toFixed(0)}K`
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
              isAnimationActive={true}
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
              isAnimationActive={true}
              animationDuration={800}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
