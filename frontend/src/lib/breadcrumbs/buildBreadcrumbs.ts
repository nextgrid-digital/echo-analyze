export interface BreadcrumbItem {
  title: string
  link: string
}

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Home",
  clients: "Clients",
  report: "Reports",
  upload: "Upload",
  admin: "Admin",
  holdings: "Holdings",
}

const TAB_LABELS: Record<string, string> = {
  holdings: "Holdings",
  performance: "Performance",
  risk: "Risk & Allocation",
  notes: "Notes",
}

function truncateTitle(title: string, maxLength = 40): string {
  if (title.length <= maxLength) return title
  return `${title.slice(0, maxLength - 1)}…`
}

function buildClientWorkspacePath(pan: string | undefined, tab?: string): string {
  if (!pan) return "/clients"
  return tab ? `/clients/${encodeURIComponent(pan)}?tab=${tab}` : `/clients/${encodeURIComponent(pan)}`
}

export function buildBreadcrumbs(input: {
  pathname: string
  search: string
  clientName?: string
  clientPan?: string
  fundName?: string
}): BreadcrumbItem[] {
  const { pathname, search, clientName, clientPan, fundName } = input
  const segments = pathname.split("/").filter(Boolean)
  const params = new URLSearchParams(search)
  const tab = params.get("tab") ?? undefined

  if (segments.length === 0) {
    return [{ title: "Home", link: "/" }]
  }

  if (segments[0] === "dashboard" && segments[1] === "holdings" && segments[2]) {
    const name = clientName?.trim() || "Client"
    const pan = clientPan ?? ""
    const fund = fundName ? truncateTitle(fundName) : "Fund detail"
    const fundPath = `/dashboard/holdings/${segments[2]}`

    return [
      { title: "Clients", link: "/clients" },
      {
        title: name,
        link: buildClientWorkspacePath(pan),
      },
      {
        title: "Holdings",
        link: buildClientWorkspacePath(pan, "holdings"),
      },
      { title: fund, link: fundPath },
    ]
  }

  if (segments[0] === "clients" && segments[1]) {
    const pan = segments[1]
    const name = clientName?.trim() || "Client"
    const items: BreadcrumbItem[] = [
      { title: "Clients", link: "/clients" },
      { title: name, link: buildClientWorkspacePath(pan) },
    ]
    if (tab && tab !== "overview" && TAB_LABELS[tab]) {
      items.push({
        title: TAB_LABELS[tab],
        link: buildClientWorkspacePath(pan, tab),
      })
    }
    return items
  }

  return segments.map((segment, index) => {
    const link = `/${segments.slice(0, index + 1).join("/")}`
    const title = SEGMENT_LABELS[segment] ?? segment.replace(/-/g, " ")
    return {
      title,
      link: segments.length === index + 1 ? pathname : link,
    }
  })
}
