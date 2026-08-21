import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    // Bind to all network interfaces so devices on the same LAN can reach
    // the dev server via this machine's local IP, not just localhost.
    host: true,
    port: 5173,
    strictPort: true,
    proxy: {
      // Forward API calls to the Express backend during development so the
      // frontend can call same-origin "/api/..." paths.
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
