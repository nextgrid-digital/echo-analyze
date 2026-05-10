import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { UploadPage } from "../UploadPage"
import { analyzePortfolio } from "@/api/analyze"

vi.mock("@/api/analyze", () => ({
  analyzePortfolio: vi.fn(),
}))

describe("UploadPage", () => {
  it("allows PDF analysis attempts without forcing a password first", async () => {
    vi.mocked(analyzePortfolio).mockResolvedValue({
      success: false,
      holdings: [],
      error: "This PDF is password-protected.",
    })

    const { container } = render(
      <MemoryRouter>
        <UploadPage />
      </MemoryRouter>
    )

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    const pdfFile = new File(["%PDF-1.4"], "statement.pdf", { type: "application/pdf" })

    fireEvent.change(fileInput, { target: { files: [pdfFile] } })
    fireEvent.click(screen.getByRole("button", { name: /analyze portfolio/i }))

    await waitFor(() => {
      expect(analyzePortfolio).toHaveBeenCalledWith(pdfFile, "", expect.any(Function))
    })
  })
})
