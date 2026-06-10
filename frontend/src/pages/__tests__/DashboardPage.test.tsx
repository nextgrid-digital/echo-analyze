import { renderWithProviders as render, screen } from "@/test/render"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { DashboardPage } from "../DashboardPage"
import { buildDashboardPdfFilename } from "@/lib/downloadFilename"
import { clearAdvisorBook, upsertClientAnalysis } from "@/lib/opportunities/advisorBookStore"
import { SAMPLE_ANALYSIS } from "@/test/fixtures/analysis"

describe("DashboardPage", () => {
  afterEach(() => {
    clearAdvisorBook()
  })

  it("renders CAS upload and uploaded reports list on the dashboard", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <DashboardPage />
      </MemoryRouter>
    )

    expect(screen.getByRole("heading", { name: /upload cas/i })).toBeInTheDocument()
    expect(screen.getByText(/enter a password for each file if needed/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /analyze cas/i })).toBeInTheDocument()
    expect(screen.getByText("Uploaded CAS reports")).toBeInTheDocument()
    expect(screen.queryByRole("tab", { name: /overview/i })).not.toBeInTheDocument()
  })

  it("lists all clients from uploaded CAS reports", () => {
    upsertClientAnalysis(SAMPLE_ANALYSIS)

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <DashboardPage />
      </MemoryRouter>
    )

    expect(screen.getByText("Priya Sharma")).toBeInTheDocument()
    expect(screen.getByText("ABCDE1234F")).toBeInTheDocument()
  })

  it("redirects legacy dashboard pan links to the client workspace", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard?pan=ABCDE1234F"]}>
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/clients/:pan" element={<div>Client workspace</div>} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText("Client workspace")).toBeInTheDocument()
  })

  it("sanitizes statement dates before using them in PDF filenames", () => {
    expect(buildDashboardPdfFilename("../../31-Mar-2026:\u0000PAN")).toBe(
      "ECHO_Analysis_31-Mar-2026 PAN.pdf"
    )
    expect(buildDashboardPdfFilename("")).toBe("ECHO_Analysis_Report.pdf")
  })
})
