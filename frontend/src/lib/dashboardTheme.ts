export type DashboardAccent =
  | "emerald"
  | "sky"
  | "violet"
  | "amber"
  | "rose"
  | "indigo"
  | "cyan"
  | "fuchsia"

export const DASHBOARD_ACCENT_STYLES: Record<
  DashboardAccent,
  {
    topBorder: string
    surface: string
    icon: string
    label: string
    sectionBar: string
  }
> = {
  emerald: {
    topBorder: "border-t-emerald-500",
    surface: "bg-emerald-50/60",
    icon: "bg-emerald-500 text-white",
    label: "text-emerald-700",
    sectionBar: "bg-emerald-500",
  },
  sky: {
    topBorder: "border-t-sky-500",
    surface: "bg-sky-50/60",
    icon: "bg-sky-500 text-white",
    label: "text-sky-700",
    sectionBar: "bg-sky-500",
  },
  violet: {
    topBorder: "border-t-violet-500",
    surface: "bg-violet-50/60",
    icon: "bg-violet-500 text-white",
    label: "text-violet-700",
    sectionBar: "bg-violet-500",
  },
  amber: {
    topBorder: "border-t-amber-500",
    surface: "bg-amber-50/60",
    icon: "bg-amber-500 text-white",
    label: "text-amber-700",
    sectionBar: "bg-amber-500",
  },
  rose: {
    topBorder: "border-t-rose-500",
    surface: "bg-rose-50/60",
    icon: "bg-rose-500 text-white",
    label: "text-rose-700",
    sectionBar: "bg-rose-500",
  },
  indigo: {
    topBorder: "border-t-indigo-500",
    surface: "bg-indigo-50/60",
    icon: "bg-indigo-500 text-white",
    label: "text-indigo-700",
    sectionBar: "bg-indigo-500",
  },
  cyan: {
    topBorder: "border-t-cyan-500",
    surface: "bg-cyan-50/60",
    icon: "bg-cyan-500 text-white",
    label: "text-cyan-700",
    sectionBar: "bg-cyan-500",
  },
  fuchsia: {
    topBorder: "border-t-fuchsia-500",
    surface: "bg-fuchsia-50/60",
    icon: "bg-fuchsia-500 text-white",
    label: "text-fuchsia-700",
    sectionBar: "bg-fuchsia-500",
  },
}

export const INSIGHT_TYPE_STYLES = {
  success: {
    surface: "bg-emerald-50 border-emerald-200",
    icon: "text-emerald-600",
    label: "text-emerald-700/80",
  },
  warning: {
    surface: "bg-amber-50 border-amber-200",
    icon: "text-amber-600",
    label: "text-amber-800/80",
  },
  info: {
    surface: "bg-sky-50 border-sky-200",
    icon: "text-sky-600",
    label: "text-sky-800/80",
  },
} as const
