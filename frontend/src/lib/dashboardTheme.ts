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
    leftBorder: string
    surface: string
    icon: string
    label: string
    sectionBar: string
    sectionBadge: string
  }
> = {
  emerald: {
    leftBorder: "border-l-teal-600",
    surface: "bg-white",
    icon: "rounded-lg bg-teal-50 text-teal-700 ring-1 ring-teal-100",
    label: "text-teal-800",
    sectionBar: "bg-teal-600",
    sectionBadge: "bg-teal-50 text-teal-800 ring-1 ring-teal-100",
  },
  sky: {
    leftBorder: "border-l-blue-600",
    surface: "bg-white",
    icon: "rounded-lg bg-blue-50 text-blue-700 ring-1 ring-blue-100",
    label: "text-blue-800",
    sectionBar: "bg-blue-600",
    sectionBadge: "bg-blue-50 text-blue-800 ring-1 ring-blue-100",
  },
  violet: {
    leftBorder: "border-l-indigo-600",
    surface: "bg-white",
    icon: "rounded-lg bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100",
    label: "text-indigo-800",
    sectionBar: "bg-indigo-600",
    sectionBadge: "bg-indigo-50 text-indigo-800 ring-1 ring-indigo-100",
  },
  amber: {
    leftBorder: "border-l-amber-600",
    surface: "bg-white",
    icon: "rounded-lg bg-amber-50 text-amber-800 ring-1 ring-amber-100",
    label: "text-amber-900",
    sectionBar: "bg-amber-600",
    sectionBadge: "bg-amber-50 text-amber-900 ring-1 ring-amber-100",
  },
  rose: {
    leftBorder: "border-l-rose-600",
    surface: "bg-white",
    icon: "rounded-lg bg-rose-50 text-rose-700 ring-1 ring-rose-100",
    label: "text-rose-800",
    sectionBar: "bg-rose-600",
    sectionBadge: "bg-rose-50 text-rose-800 ring-1 ring-rose-100",
  },
  indigo: {
    leftBorder: "border-l-slate-600",
    surface: "bg-white",
    icon: "rounded-lg bg-slate-100 text-slate-700 ring-1 ring-slate-200",
    label: "text-slate-800",
    sectionBar: "bg-slate-600",
    sectionBadge: "bg-slate-100 text-slate-800 ring-1 ring-slate-200",
  },
  cyan: {
    leftBorder: "border-l-cyan-700",
    surface: "bg-white",
    icon: "rounded-lg bg-cyan-50 text-cyan-800 ring-1 ring-cyan-100",
    label: "text-cyan-900",
    sectionBar: "bg-cyan-700",
    sectionBadge: "bg-cyan-50 text-cyan-900 ring-1 ring-cyan-100",
  },
  fuchsia: {
    leftBorder: "border-l-violet-600",
    surface: "bg-white",
    icon: "rounded-lg bg-violet-50 text-violet-700 ring-1 ring-violet-100",
    label: "text-violet-800",
    sectionBar: "bg-violet-600",
    sectionBadge: "bg-violet-50 text-violet-800 ring-1 ring-violet-100",
  },
}

export const INSIGHT_TYPE_STYLES = {
  success: {
    surface: "bg-teal-50/80 border-teal-200/80",
    icon: "text-teal-600",
    label: "text-teal-800/90",
  },
  warning: {
    surface: "bg-amber-50/80 border-amber-200/80",
    icon: "text-amber-700",
    label: "text-amber-900/90",
  },
  info: {
    surface: "bg-blue-50/80 border-blue-200/80",
    icon: "text-blue-600",
    label: "text-blue-900/90",
  },
} as const
