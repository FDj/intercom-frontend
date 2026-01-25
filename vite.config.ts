import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import svgr from "vite-plugin-svgr";
import { resolve } from "path";
import fs from "fs";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    svgr(),
    {
      name: "copy-embed-bundle",
      closeBundle: async () => {
        const distDir = resolve(__dirname, "dist");
        const files = fs.readdirSync(distDir);
        const embedFile = files.find(
          (f) => f.startsWith("embed-") && f.endsWith(".js")
        );
        if (embedFile) {
          fs.copyFileSync(
            resolve(distDir, embedFile),
            resolve(distDir, "embed.js")
          );
          console.log(`Copied ${embedFile} to embed.js`);
        }
      },
    },
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        embed: resolve(__dirname, "src/embed.tsx"),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          return chunkInfo.name === "embed"
            ? "embed-[hash].js"
            : "assets/[name]-[hash].js";
        },
        manualChunks: (id) => {
          if (id.includes("node_modules")) {
            return "vendor";
          }
        },
      },
    },
  }
});
