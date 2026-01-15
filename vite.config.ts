import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import svgr from "vite-plugin-svgr";
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), svgr()],
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
      },
    },
  },
  base: "intercom_assets"
});
