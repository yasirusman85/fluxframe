import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vitejs.dev/config/
export default defineConfig({
  base: "/",
  plugins: [react(), tailwindcss()],
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: "./src/test-setup.ts",
  },
});
