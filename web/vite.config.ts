import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { articlesFeed } from "./feed";

// articles.json נכתב בכל בנייה מתוך public/data.json, כדי שהמגזין "חוט" יקרא את הכתבות מכאן ולא יחזיק עותק.
const feed = (): Plugin => ({
  name: "articles-feed",
  generateBundle() {
    this.emitFile({ type: "asset", fileName: "articles.json", source: JSON.stringify(articlesFeed(), null, 2) + "\n" });
  },
});

export default defineConfig({ plugins: [react(), feed()], base: "./" });
