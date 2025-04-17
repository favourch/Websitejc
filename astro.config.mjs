// @ts-check
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  output: "hybrid",
  adapter: cloudflare(),
  site: "https://wholesalersadvantage.com",
  integrations: [sitemap()],
  image: {
    service: {
      entrypoint: "astro/assets/services/sharp",
      config: {
        // Disable Sharp for Cloudflare compatibility
        sharp: false
      }
    }
  }
});
