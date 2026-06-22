import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { cloudflare } from "@cloudflare/vite-plugin";
import { nitro } from "nitro/vite";

const isVercel = !!process.env.VERCEL || !!process.env.NOW_BUILDER || process.env.NITRO_PRESET === "vercel";
const isLocalDev = !isVercel && !process.env.CF_PAGES;

export default defineConfig({
  plugins: [
    tanstackStart({
      ...(isVercel
        ? { server: { preset: "vercel" } }
        : { server: { entry: "src/server.ts" } }),
    }),
    ...(isVercel ? [nitro()] : []),
    viteReact(),
    tailwindcss(),
    tsConfigPaths(),
    // Skip Cloudflare plugin for local dev — workerd has issues with Bun on Windows
    ...(!isVercel && !isLocalDev ? [cloudflare()] : []),
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
