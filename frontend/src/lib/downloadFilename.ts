const DOWNLOAD_FILENAME_PART_MAX_CHARS = 80
const UNSAFE_FILENAME_CHARS = /[<>:"/\\|?*]+/g
const NON_ASCII_SAFE_FILENAME_CHARS = /[^A-Za-z0-9._ -]+/g
const EDGE_FILENAME_FILLER = /^[ ._-]+|[ ._-]+$/g
const WHITESPACE = /\s+/g

function replaceControlChars(value: string) {
  let cleaned = ""
  for (const char of value) {
    const charCode = char.charCodeAt(0)
    cleaned += charCode <= 31 || charCode === 127 ? " " : char
  }
  return cleaned
}

export function buildDashboardPdfFilename(statementDate?: string | null) {
  const cleaned = replaceControlChars((statementDate ?? "").trim())
    .replace(UNSAFE_FILENAME_CHARS, " ")
    .replace(NON_ASCII_SAFE_FILENAME_CHARS, "_")
    .replace(WHITESPACE, " ")
    .replace(EDGE_FILENAME_FILLER, "")
    .slice(0, DOWNLOAD_FILENAME_PART_MAX_CHARS)

  return `ECHO_Analysis_${cleaned || "Report"}.pdf`
}
