import React from "react"
import "@testing-library/jest-dom/vitest"
import { vi } from "vitest"

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Recharts expects ResizeObserver in JSDOM tests.
if (!globalThis.ResizeObserver) {
  ;(globalThis as unknown as { ResizeObserver: typeof ResizeObserverMock }).ResizeObserver = ResizeObserverMock
}

vi.mock("@clerk/react", () => ({
  ClerkProvider: ({ children }: { children: React.ReactNode }) => children,
  SignedIn: ({ children }: { children: React.ReactNode }) => children,
  SignedOut: () => null,
  SignInButton: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("button", { type: "button" }, children ?? "Sign in"),
  SignUpButton: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("button", { type: "button" }, children ?? "Sign up"),
  SignIn: () => React.createElement("div", null, "Sign in"),
  SignUp: () => React.createElement("div", null, "Sign up"),
  UserButton: () => React.createElement("div", { "data-testid": "user-button" }, "User"),
  useAuth: () => ({
    isLoaded: true,
    isSignedIn: true,
    userId: "user_test",
    getToken: vi.fn().mockResolvedValue("test-token"),
  }),
}))
