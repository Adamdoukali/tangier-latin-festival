import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { cloudflare } from "@cloudflare/vite-plugin";

const isVercel = !!process.env.VERCEL || !!process.env.NOW_BUILDER || process.env.NITRO_PRESET === "vercel";

export default defineConfig({
  plugins: [
    tanstackStart({
      server: { entry: "src/server.ts" },
    }),
    viteReact(),
    tailwindcss(),
    tsConfigPaths(),
    ...(!isVercel ? [cloudflare()] : []),
  ],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  server: {
    host: true,
    port: 8080,
    strictPort: true,
  },
});
