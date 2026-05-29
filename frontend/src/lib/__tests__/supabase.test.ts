import { afterEach, describe, expect, it, vi } from "vitest"
import type { User } from "@supabase/supabase-js"
import { isSupabaseAdminUser } from "@/lib/supabase"

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
})
