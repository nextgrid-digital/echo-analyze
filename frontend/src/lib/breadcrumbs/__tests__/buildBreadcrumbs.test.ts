import { describe, expect, it } from "vitest"
import { buildBreadcrumbs } from "../buildBreadcrumbs"

describe("buildBreadcrumbs", () => {
  it("returns Home for dashboard", () => {
    const items = buildBreadcrumbs({ pathname: "/dashboard", search: "" })
    expect(items).toEqual([{ title: "Home", link: "/dashboard" }])
  })

  it("returns Clients for clients list", () => {
    const items = buildBreadcrumbs({ pathname: "/clients", search: "" })
    expect(items).toEqual([{ title: "Clients", link: "/clients" }])
  })

  it("returns client name for client workspace", () => {
    const items = buildBreadcrumbs({
      pathname: "/clients/ABCDE1234F",
      search: "",
      clientName: "Rahul Sharma",
      clientPan: "ABCDE1234F",
    })
    expect(items).toEqual([
      { title: "Clients", link: "/clients" },
      { title: "Rahul Sharma", link: "/clients/ABCDE1234F" },
    ])
  })

  it("includes tab segment for holdings", () => {
    const items = buildBreadcrumbs({
      pathname: "/clients/ABCDE1234F",
      search: "?tab=holdings",
      clientName: "Rahul Sharma",
      clientPan: "ABCDE1234F",
    })
    expect(items).toEqual([
      { title: "Clients", link: "/clients" },
      { title: "Rahul Sharma", link: "/clients/ABCDE1234F" },
      { title: "Holdings", link: "/clients/ABCDE1234F?tab=holdings" },
    ])
  })

  it("omits overview tab from trail", () => {
    const items = buildBreadcrumbs({
      pathname: "/clients/ABCDE1234F",
      search: "?tab=overview",
      clientName: "Rahul Sharma",
      clientPan: "ABCDE1234F",
    })
    expect(items).toHaveLength(2)
  })

  it("builds fund detail trail", () => {
    const items = buildBreadcrumbs({
      pathname: "/dashboard/holdings/100033",
      search: "",
      clientName: "Rahul Sharma",
      clientPan: "ABCDE1234F",
      fundName: "HDFC Flexi Cap Fund - Direct Growth",
    })
    expect(items.map((item) => item.title)).toEqual([
      "Clients",
      "Rahul Sharma",
      "Holdings",
      "HDFC Flexi Cap Fund - Direct Growth",
    ])
    expect(items[2]?.link).toBe("/clients/ABCDE1234F?tab=holdings")
  })

})
