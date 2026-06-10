import { MarketingPreviewViewport } from "./MarketingPreviewViewport"
import { ClientBookMiniPreview } from "./previews/ClientBookMiniPreview"
import { HeroBenchmarkPreview } from "./previews/HeroBenchmarkPreview"
import { InsightsPanelPreview } from "./previews/InsightsPanelPreview"
import { KpiStripPreview } from "./previews/KpiStripPreview"
import { PerformanceChartPreview } from "./previews/PerformanceChartPreview"
import { WorkspaceSlicePreview } from "./previews/WorkspaceSlicePreview"

interface PreviewWrapperProps {
  aspectRatio?: string
  canvasWidth?: number
  showChrome?: boolean
}

export function HeroWorkspacePreviewFrame({
  aspectRatio = "21 / 9",
  canvasWidth = 1280,
}: PreviewWrapperProps = {}) {
  return (
    <MarketingPreviewViewport
      title="Portfolio vs benchmark"
      aspectRatio={aspectRatio}
      canvasWidth={canvasWidth}
    >
      <HeroBenchmarkPreview />
    </MarketingPreviewViewport>
  )
}

export function InsightsPreview({
  aspectRatio = "4 / 3",
  showChrome = true,
}: PreviewWrapperProps = {}) {
  return (
    <MarketingPreviewViewport
      title="Insights"
      aspectRatio={aspectRatio}
      canvasWidth={960}
      showChrome={showChrome}
    >
      <InsightsPanelPreview />
    </MarketingPreviewViewport>
  )
}

export function KpiStripPreviewFrame({
  aspectRatio = "4 / 3",
  showChrome = true,
}: PreviewWrapperProps = {}) {
  return (
    <MarketingPreviewViewport
      title="Reviews"
      aspectRatio={aspectRatio}
      canvasWidth={960}
      showChrome={showChrome}
    >
      <KpiStripPreview />
    </MarketingPreviewViewport>
  )
}

export function PerformanceChartPreviewFrame({
  aspectRatio = "4 / 3",
  showChrome = true,
}: PreviewWrapperProps = {}) {
  return (
    <MarketingPreviewViewport
      title="Performance"
      aspectRatio={aspectRatio}
      canvasWidth={960}
      showChrome={showChrome}
    >
      <PerformanceChartPreview />
    </MarketingPreviewViewport>
  )
}

export function ClientBookPreview({
  aspectRatio = "4 / 3",
  showChrome = true,
}: PreviewWrapperProps = {}) {
  return (
    <MarketingPreviewViewport
      title="Advisor book"
      aspectRatio={aspectRatio}
      canvasWidth={960}
      showChrome={showChrome}
    >
      <ClientBookMiniPreview />
    </MarketingPreviewViewport>
  )
}

export function WorkspaceSlicePreviewFrame({
  aspectRatio = "4 / 3",
  showChrome = true,
}: PreviewWrapperProps = {}) {
  return (
    <MarketingPreviewViewport
      title="Meeting prep"
      aspectRatio={aspectRatio}
      canvasWidth={960}
      showChrome={showChrome}
    >
      <WorkspaceSlicePreview />
    </MarketingPreviewViewport>
  )
}

/** @deprecated Use HeroWorkspacePreviewFrame */
export function WorkspaceOverviewPreview() {
  return <HeroWorkspacePreviewFrame />
}

/** @deprecated Use PerformanceChartPreviewFrame */
export function PerformanceTabPreview() {
  return <PerformanceChartPreviewFrame />
}

/** @deprecated Use KpiStripPreviewFrame */
export function CompactOverviewPreview() {
  return <KpiStripPreviewFrame />
}
