import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// monaco-editor's package exports expose only its root, so its worker entry
// files are aliased by filesystem path (the `?worker` query rides along in $1).
const monacoEsm = fileURLToPath(new URL("./node_modules/monaco-editor/esm/vs/", import.meta.url));

// Static Vite app. No proxy, no backend: the UI never spawns a chronarch node
// and never reads a local filesystem — sessions arrive as pasted JSON or the
// checked-in fixtures.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      { find: /^monaco-worker\/editor(\?.*)?$/, replacement: `${monacoEsm}editor/editor.worker.js$1` },
      { find: /^monaco-worker\/json(\?.*)?$/, replacement: `${monacoEsm}language/json/json.worker.js$1` },
    ],
  },
  build: {
    chunkSizeWarningLimit: 4000, // three + monaco are large by nature
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
  },
});
