// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  site: "https://wholesalersadvantage.com",
  output: "server",
  integrations: [sitemap()],
  server: {
    port: 4321,
    host: true
  }
});
