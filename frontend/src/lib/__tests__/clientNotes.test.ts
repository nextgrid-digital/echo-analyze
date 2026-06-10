import { afterEach, describe, expect, it } from "vitest"
import { deleteClientNotes, getClientNotes, setClientNotes } from "../clientNotes"

describe("clientNotes", () => {
  afterEach(() => {
    localStorage.clear()
  })

  it("stores and retrieves notes keyed by PAN", () => {
    setClientNotes("ABCDE1234F", "Follow up on SIP review")
    expect(getClientNotes("ABCDE1234F")).toBe("Follow up on SIP review")
  })

  it("normalizes PAN casing in storage key", () => {
    setClientNotes("abcde1234f", "Notes for client")
    expect(getClientNotes("ABCDE1234F")).toBe("Notes for client")
  })

  it("returns empty string for missing PAN", () => {
    expect(getClientNotes("UNKNOWN1234Z")).toBe("")
  })

  it("deletes stored notes for a client", () => {
    setClientNotes("ABCDE1234F", "Temporary note")
    deleteClientNotes("ABCDE1234F")
    expect(getClientNotes("ABCDE1234F")).toBe("")
  })
})
