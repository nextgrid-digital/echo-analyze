export type NavIcon = "home" | "clients" | "opportunities" | "logo"

export interface NavItem {
  title: string
  url: string
  icon: NavIcon
  items?: NavItem[]
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export const navGroups: NavGroup[] = [
  {
    label: "Advisor",
    items: [
      {
        title: "Home",
        url: "/dashboard",
        icon: "home",
      },
      {
        title: "Clients",
        url: "/clients",
        icon: "clients",
      },
      {
        title: "Opportunities",
        url: "/opportunities",
        icon: "opportunities",
      },
    ],
  },
]
