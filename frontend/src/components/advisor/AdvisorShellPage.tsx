import type { ReactNode } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Heading } from "@/components/ui/heading"

interface AdvisorShellPageProps {
  title?: string
  description?: string
  headerActions?: ReactNode
  children: ReactNode
  captureRef?: React.RefObject<HTMLDivElement | null>
  captureId?: string
  scrollable?: boolean
}

export function AdvisorShellPage({
  title,
  description,
  headerActions,
  children,
  captureRef,
  captureId,
  scrollable = true,
}: AdvisorShellPageProps) {
  return (
    <DashboardLayout
      headerActions={headerActions}
      captureRef={captureRef}
      captureId={captureId}
      scrollable={scrollable}
    >
      <div className="mx-auto w-full max-w-[1600px]">
        {title && <Heading title={title} description={description ?? ""} />}
        {children}
      </div>
    </DashboardLayout>
  )
}
