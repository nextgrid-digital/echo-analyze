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
    cardGradient: string
    cardShadow: string
    topGradient: string
    surface: string
    icon: string
    label: string
    sectionGradient: string
    sectionBadge: string
    sectionGlow: string
    panelTint: string
  }
> = {
  emerald: {
    cardGradient: "from-teal-50 via-white to-emerald-50/40",
    cardShadow: "shadow-teal-500/12",
    topGradient: "from-teal-500 to-emerald-400",
    surface: "bg-white/90",
    icon: "rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-md shadow-teal-500/30",
    label: "text-teal-800",
    sectionGradient: "from-teal-500 to-emerald-500",
    sectionBadge: "bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-md shadow-teal-500/25",
    sectionGlow: "bg-teal-400/20",
    panelTint: "from-teal-50/60 via-white/80 to-emerald-50/30",
  },
  sky: {
    cardGradient: "from-sky-50 via-white to-blue-50/40",
    cardShadow: "shadow-blue-500/12",
    topGradient: "from-sky-500 to-blue-500",
    surface: "bg-white/90",
    icon: "rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-md shadow-blue-500/30",
    label: "text-blue-800",
    sectionGradient: "from-sky-500 to-blue-600",
    sectionBadge: "bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-md shadow-blue-500/25",
    sectionGlow: "bg-blue-400/20",
    panelTint: "from-sky-50/60 via-white/80 to-blue-50/30",
  },
  violet: {
    cardGradient: "from-violet-50 via-white to-indigo-50/40",
    cardShadow: "shadow-indigo-500/12",
    topGradient: "from-violet-500 to-indigo-500",
    surface: "bg-white/90",
    icon: "rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-md shadow-indigo-500/30",
    label: "text-indigo-800",
    sectionGradient: "from-violet-500 to-indigo-600",
    sectionBadge: "bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-md shadow-indigo-500/25",
    sectionGlow: "bg-indigo-400/20",
    panelTint: "from-violet-50/60 via-white/80 to-indigo-50/30",
  },
  amber: {
    cardGradient: "from-amber-50 via-white to-orange-50/40",
    cardShadow: "shadow-amber-500/12",
    topGradient: "from-amber-500 to-orange-500",
    surface: "bg-white/90",
    icon: "rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/30",
    label: "text-amber-900",
    sectionGradient: "from-amber-500 to-orange-500",
    sectionBadge: "bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25",
    sectionGlow: "bg-amber-400/20",
    panelTint: "from-amber-50/60 via-white/80 to-orange-50/30",
  },
  rose: {
    cardGradient: "from-rose-50 via-white to-pink-50/40",
    cardShadow: "shadow-rose-500/12",
    topGradient: "from-rose-500 to-pink-500",
    surface: "bg-white/90",
    icon: "rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 text-white shadow-md shadow-rose-500/30",
    label: "text-rose-800",
    sectionGradient: "from-rose-500 to-pink-500",
    sectionBadge: "bg-gradient-to-br from-rose-500 to-pink-500 text-white shadow-md shadow-rose-500/25",
    sectionGlow: "bg-rose-400/20",
    panelTint: "from-rose-50/60 via-white/80 to-pink-50/30",
  },
  indigo: {
    cardGradient: "from-slate-100 via-white to-indigo-50/40",
    cardShadow: "shadow-slate-500/10",
    topGradient: "from-slate-600 to-indigo-600",
    surface: "bg-white/90",
    icon: "rounded-xl bg-gradient-to-br from-slate-600 to-indigo-700 text-white shadow-md shadow-slate-500/30",
    label: "text-slate-800",
    sectionGradient: "from-slate-600 to-indigo-700",
    sectionBadge: "bg-gradient-to-br from-slate-600 to-indigo-700 text-white shadow-md shadow-slate-500/25",
    sectionGlow: "bg-slate-400/20",
    panelTint: "from-slate-50/60 via-white/80 to-indigo-50/30",
  },
  cyan: {
    cardGradient: "from-cyan-50 via-white to-teal-50/40",
    cardShadow: "shadow-cyan-500/12",
    topGradient: "from-cyan-500 to-teal-500",
    surface: "bg-white/90",
    icon: "rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 text-white shadow-md shadow-cyan-500/30",
    label: "text-cyan-900",
    sectionGradient: "from-cyan-500 to-teal-600",
    sectionBadge: "bg-gradient-to-br from-cyan-500 to-teal-600 text-white shadow-md shadow-cyan-500/25",
    sectionGlow: "bg-cyan-400/20",
    panelTint: "from-cyan-50/60 via-white/80 to-teal-50/30",
  },
  fuchsia: {
    cardGradient: "from-fuchsia-50 via-white to-violet-50/40",
    cardShadow: "shadow-fuchsia-500/12",
    topGradient: "from-fuchsia-500 to-violet-500",
    surface: "bg-white/90",
    icon: "rounded-xl bg-gradient-to-br from-fuchsia-500 to-violet-600 text-white shadow-md shadow-fuchsia-500/30",
    label: "text-violet-800",
    sectionGradient: "from-fuchsia-500 to-violet-600",
    sectionBadge: "bg-gradient-to-br from-fuchsia-500 to-violet-600 text-white shadow-md shadow-fuchsia-500/25",
    sectionGlow: "bg-fuchsia-400/20",
    panelTint: "from-fuchsia-50/60 via-white/80 to-violet-50/30",
  },
}

export const INSIGHT_TYPE_STYLES = {
  success: {
    surface: "bg-gradient-to-br from-teal-50 to-emerald-50/80 border-teal-200/80 shadow-sm shadow-teal-500/5",
    icon: "text-teal-600",
    label: "text-teal-800/90",
  },
  warning: {
    surface: "bg-gradient-to-br from-amber-50 to-orange-50/80 border-amber-200/80 shadow-sm shadow-amber-500/5",
    icon: "text-amber-700",
    label: "text-amber-900/90",
  },
  info: {
    surface: "bg-gradient-to-br from-sky-50 to-blue-50/80 border-blue-200/80 shadow-sm shadow-blue-500/5",
    icon: "text-blue-600",
    label: "text-blue-900/90",
  },
} as const

export function getSectionPanelClass(accent: DashboardAccent) {
  const tint = DASHBOARD_ACCENT_STYLES[accent].panelTint
  return `dashboard-section-panel bg-gradient-to-br ${tint}`
}
