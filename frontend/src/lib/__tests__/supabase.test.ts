import { afterEach, describe, expect, it, vi } from "vitest"
import type { User } from "@supabase/supabase-js"
import { getUsernameFromUser, isSupabaseAdminUser } from "@/lib/supabase"

function makeUser(metadata: {
  app_metadata?: Record<string, unknown>
  user_metadata?: Record<string, unknown>
}): User {
  return {
    id: "user_12345678",
    app_metadata: metadata.app_metadata ?? {},
    user_metadata: metadata.user_metadata ?? {},
  } as User
}

describe("isSupabaseAdminUser", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("ignores roles from user-editable metadata", () => {
    vi.stubEnv("APP_SUPABASE_ADMIN_ROLE", "admin")

    const user = makeUser({
      user_metadata: {
        role: "admin",
        roles: ["admin"],
        user_role: "admin",
        user_roles: "admin",
      },
    })

    expect(isSupabaseAdminUser(user)).toBe(false)
  })

  it("accepts roles from trusted app metadata", () => {
    vi.stubEnv("APP_SUPABASE_ADMIN_ROLE", "admin")

    const user = makeUser({
      app_metadata: {
        role: "admin",
      },
    })

    expect(isSupabaseAdminUser(user)).toBe(true)
  })

  it("requires explicit true-like is_admin values from trusted app metadata", () => {
    vi.stubEnv("APP_SUPABASE_ADMIN_ROLE", "admin")

    for (const value of [false, "false", "0", "no", "off", "", 0, 2, 0.0, 2.0]) {
      expect(isSupabaseAdminUser(makeUser({ app_metadata: { is_admin: value } }))).toBe(false)
    }

    for (const value of [true, "true", "1", "yes", 1, 1.0]) {
      expect(isSupabaseAdminUser(makeUser({ app_metadata: { is_admin: value } }))).toBe(true)
    }
  })
})

describe("getUsernameFromUser", () => {
  it("redacts common PII from user metadata display names", () => {
    const user = makeUser({
      user_metadata: {
        username: " Alice ABCDE1234F\nalice@example.com\t+91 98765 43210 ",
      },
    })

    expect(getUsernameFromUser(user)).toBe(
      "Alice [redacted-pan] [redacted-email] [redacted-phone]",
    )
  })
})

describe("isSupabaseConfigured", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  async function loadConfiguredState() {
    const module = await import("@/lib/supabase")
    return module.isSupabaseConfigured()
  }

  it("rejects remote plain HTTP Supabase URLs", async () => {
    vi.stubEnv("APP_SUPABASE_URL", "http://example.com")
    vi.stubEnv("APP_SUPABASE_ANON_KEY", "anon")

    expect(await loadConfiguredState()).toBe(false)
  })

  it("allows Supabase cloud HTTPS and loopback Supabase URLs", async () => {
    vi.stubEnv("APP_SUPABASE_ANON_KEY", "anon")

    vi.stubEnv("APP_SUPABASE_URL", "https://project.supabase.co")
    expect(await loadConfiguredState()).toBe(true)

    vi.resetModules()
    vi.stubEnv("APP_SUPABASE_URL", "http://127.0.0.1:54321")
    expect(await loadConfiguredState()).toBe(true)

    vi.resetModules()
    vi.stubEnv("APP_SUPABASE_URL", "https://localhost:54321")
    expect(await loadConfiguredState()).toBe(true)
  })

  it("rejects arbitrary HTTPS URLs that are not Supabase hosts", async () => {
    vi.stubEnv("APP_SUPABASE_URL", "https://example.com")
    vi.stubEnv("APP_SUPABASE_ANON_KEY", "anon")

    expect(await loadConfiguredState()).toBe(false)

    vi.resetModules()
    vi.stubEnv("APP_SUPABASE_URL", "https://project.supabase.co.evil.com")
    expect(await loadConfiguredState()).toBe(false)
  })
})
