import { escapeCsvCell, sanitizeSpreadsheetCell } from "@/lib/csv"

describe("csv helpers", () => {
  it("prefixes spreadsheet formula characters with an apostrophe", () => {
    expect(sanitizeSpreadsheetCell("=SUM(1,1)")).toBe("'=SUM(1,1)")
    expect(sanitizeSpreadsheetCell("@cmd")).toBe("'@cmd")
    expect(sanitizeSpreadsheetCell("  -danger")).toBe("'  -danger")
  })

  it("escapes quotes after spreadsheet sanitization", () => {
    expect(escapeCsvCell('=1+"two"')).toBe("\"'=1+\"\"two\"\"\"")
  })
})
