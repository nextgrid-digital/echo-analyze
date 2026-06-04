import { afterEach, describe, expect, it, vi } from "vitest"
import { analyzePortfolio } from "@/api/analyze"
import { apiFetch } from "@/api/client"

vi.mock("@/api/client", () => ({
  apiFetch: vi.fn(),
}))

describe("analyzePortfolio", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("sends the PDF password only for PDF uploads", async () => {
    vi.mocked(apiFetch).mockResolvedValue(new Response(JSON.stringify({ success: true, holdings: [] })))
    const file = new File(["{}"], "statement.json", { type: "application/json" })

    await analyzePortfolio(file, "ABCDE1234F")

    const body = vi.mocked(apiFetch).mock.calls[0]?.[1]?.body as FormData
    const formFile = body.get("file")
    expect(formFile).toBeInstanceOf(File)
    expect((formFile as File).name).toBe(file.name)
    expect((formFile as File).size).toBe(file.size)
    expect((formFile as File).type).toBe(file.type)
    expect(body.has("password")).toBe(false)
  })

  it("includes the password for PDF uploads", async () => {
    vi.mocked(apiFetch).mockResolvedValue(new Response(JSON.stringify({ success: true, holdings: [] })))
    const file = new File(["%PDF-1.7"], "statement.pdf", { type: "application/pdf" })

    await analyzePortfolio(file, "ABCDE1234F")

    const body = vi.mocked(apiFetch).mock.calls[0]?.[1]?.body as FormData
    const formFile = body.get("file")
    expect(formFile).toBeInstanceOf(File)
    expect((formFile as File).name).toBe(file.name)
    expect((formFile as File).size).toBe(file.size)
    expect((formFile as File).type).toBe(file.type)
    expect(body.get("password")).toBe("ABCDE1234F")
  })
})
