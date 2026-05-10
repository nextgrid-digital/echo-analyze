const DANGEROUS_SPREADSHEET_PREFIX = /^[\t\r]|^\s*[=+\-@]/

export function sanitizeSpreadsheetCell(value: string): string {
  if (!value) {
    return ""
  }

  return DANGEROUS_SPREADSHEET_PREFIX.test(value) ? `'${value}` : value
}

export function escapeCsvCell(value: string): string {
  const sanitized = sanitizeSpreadsheetCell(value)
  return `"${sanitized.replace(/"/g, '""')}"`
}
