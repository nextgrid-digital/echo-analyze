import { afterEach, describe, expect, it, vi } from "vitest"
import { analyzePortfolio } from "@/api/analyze"
import { apiFetch } from "@/api/client"

vi.mock("@/api/client", () => ({
  apiFetch: vi.fn(),
}))

describe("analyzePortfolio", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("sends the PDF password only for PDF uploads", async () => {
    vi.mocked(apiFetch).mockResolvedValue(new Response(JSON.stringify({ success: true, holdings: [] })))
    const file = new File(["{}"], "statement.json", { type: "application/json" })

    await analyzePortfolio(file, "ABCDE1234F")

    const body = vi.mocked(apiFetch).mock.calls[0]?.[1]?.body as FormData
    expect(body.get("file")).toBe(file)
    expect(body.has("password")).toBe(false)
  })

  it("includes the password for PDF uploads", async () => {
    vi.mocked(apiFetch).mockResolvedValue(new Response(JSON.stringify({ success: true, holdings: [] })))
    const file = new File(["%PDF-1.7"], "statement.pdf", { type: "application/pdf" })

    await analyzePortfolio(file, "ABCDE1234F")

    const body = vi.mocked(apiFetch).mock.calls[0]?.[1]?.body as FormData
    expect(body.get("file")).toBe(file)
    expect(body.get("password")).toBe("ABCDE1234F")
  })
})
