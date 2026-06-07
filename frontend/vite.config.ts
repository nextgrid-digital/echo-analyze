import { fileURLToPath } from "url"
import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Vercel can expose SUPABASE_* only; map them for the client bundle at build time.
if (!process.env.APP_SUPABASE_URL && process.env.SUPABASE_URL) {
  process.env.APP_SUPABASE_URL = process.env.SUPABASE_URL
}
if (!process.env.APP_SUPABASE_ANON_KEY && process.env.SUPABASE_ANON_KEY) {
  process.env.APP_SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY
}
if (!process.env.APP_SUPABASE_ADMIN_ROLE && process.env.SUPABASE_ADMIN_ROLE) {
  process.env.APP_SUPABASE_ADMIN_ROLE = process.env.SUPABASE_ADMIN_ROLE
}

// https://vite.dev/config/
export default defineConfig({
  root: __dirname,
  envPrefix: "APP_SUPABASE_",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    outDir: "../static",
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, "index.html"),
    },
  },
  server: {
    proxy: { "/api": "http://localhost:8000" },
  },
})
