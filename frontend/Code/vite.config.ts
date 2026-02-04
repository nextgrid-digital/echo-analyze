import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
const projectRoot = path.resolve(__dirname, "..")
export default defineConfig({
  root: projectRoot,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@/components/dashboard": path.resolve(projectRoot, "src/components/dashboard/Code"),
      "@/components/ui": path.resolve(projectRoot, "src/components/ui/Code"),
      "@/components": path.resolve(projectRoot, "src/components/Code"),
      "@/lib": path.resolve(projectRoot, "src/lib/Code"),
      "@/types": path.resolve(projectRoot, "src/types/Code"),
      "@/api": path.resolve(projectRoot, "src/api/Code"),
      "@": path.resolve(projectRoot, "src"),
    },
  },
  build: {
    outDir: path.resolve(projectRoot, "../static"),
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, "index.html"),
      output: {
        manualChunks: {
          recharts: ["recharts"],
          vendor: ["react", "react-dom"],
        },
      },
    },
  },
  server: {
    proxy: { "/api": "http://localhost:8000" },
  },
})
