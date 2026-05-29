import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      // Forward /openai-api/* → https://api.openai.com/* server-side.
      // Avoids browser CORS preflight and forbidden-header restrictions.
      "/openai-api": {
        target: "https://api.openai.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/openai-api/, ""),
        secure: true,
      },
      // Forward /biosim-api/* → http://localhost:8009/* server-side.
      // BioSim server does not send CORS headers, so all calls go through here.
      "/biosim-api": {
        target: "http://localhost:8009",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/biosim-api/, ""),
      },
    },
  },
  build: {
    target: "es2020",
    sourcemap: true,
  },
});
