import { afterEach, describe, expect, it, vi } from "vitest"
import { apiFetch } from "@/api/client"
import { getSupabaseAccessToken } from "@/lib/supabase"

vi.mock("@/lib/supabase", () => ({
  getSupabaseAccessToken: vi.fn(),
}))

describe("apiFetch", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it("attaches the bearer token to same-origin API calls", async () => {
    vi.mocked(getSupabaseAccessToken).mockResolvedValue("access-token")
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}"))
    vi.stubGlobal("fetch", fetchMock)

    await apiFetch("/api/analyze", { method: "POST" })

    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Headers
    expect(headers.get("Authorization")).toBe("Bearer access-token")
  })

  it("does not attach the bearer token to cross-origin calls", async () => {
    vi.mocked(getSupabaseAccessToken).mockResolvedValue("access-token")
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}"))
    vi.stubGlobal("fetch", fetchMock)

    await apiFetch("https://example.com/api/analyze", { method: "POST" })

    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Headers
    expect(headers.has("Authorization")).toBe(false)
  })

  it("strips caller-supplied authorization from cross-origin calls", async () => {
    vi.mocked(getSupabaseAccessToken).mockResolvedValue("access-token")
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}"))
    vi.stubGlobal("fetch", fetchMock)

    await apiFetch("https://example.com/api/analyze", {
      method: "POST",
      headers: { Authorization: "Bearer accidental-token" },
    })

    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Headers
    expect(headers.has("Authorization")).toBe(false)
  })
})
