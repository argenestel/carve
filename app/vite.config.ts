import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import wasm from "vite-plugin-wasm";

// The Midnight runtime and ledger are wasm-bindgen modules using top-level
// await; modern browsers support TLA natively, so target esnext and keep them
// out of esbuild pre-bundling.
export default defineConfig({
  base: process.env.BASE_PATH ?? "/",
  plugins: [react(), wasm()],
  resolve: {
    alias: {
      "isomorphic-ws": path.resolve(__dirname, "src/shims/isomorphic-ws.ts"),
      assert: path.resolve(__dirname, "src/shims/assert.ts"),
    },
  },
  define: { "process.env.NODE_DEBUG": "false", global: "globalThis" },
  optimizeDeps: {
    exclude: ["@midnight-ntwrk/onchain-runtime-v3", "@midnight-ntwrk/ledger-v8"],
    esbuildOptions: { target: "esnext" },
  },
  build: { target: "esnext", chunkSizeWarningLimit: 4000 },
  worker: { format: "es", plugins: () => [wasm()] },
});
