// @ts-check
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  output: "server",
  adapter: cloudflare(),
  site: "https://wholesalers-advantage.pages.dev",
  integrations: [],
  server: {
    port: 4321,
    host: true
  }
});
