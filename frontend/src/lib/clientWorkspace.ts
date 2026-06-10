export function buildClientWorkspacePath(pan: string): string {
  return `/clients/${encodeURIComponent(pan)}`
}
