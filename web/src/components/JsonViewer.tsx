/** Read-only Monaco for session JSON. Monaco is bundled (no CDN); its workers
 *  are Vite workers. Loaded lazily by the pages that show it. */
import Editor, { loader } from "@monaco-editor/react";
// The editor API + the JSON language only (not every language monaco ships).
import * as monaco from "monaco-editor/editor/editor.api";
import "monaco-editor/language/json/monaco.contribution";
import editorWorker from "monaco-worker/editor?worker";
import jsonWorker from "monaco-worker/json?worker";

const g = globalThis as typeof globalThis & { MonacoEnvironment?: monaco.Environment };
g.MonacoEnvironment = {
  getWorker(_workerId: string, label: string) {
    return label === "json" ? new jsonWorker() : new editorWorker();
  },
};
loader.config({ monaco });

monaco.editor.defineTheme("chronarch-void", {
  base: "vs-dark",
  inherit: true,
  rules: [
    { token: "string.key.json", foreground: "8a949e" },
    { token: "string.value.json", foreground: "e8e4da" },
    { token: "number", foreground: "c8cfd6" },
    { token: "keyword", foreground: "7fb3a6" },
  ],
  colors: {
    "editor.background": "#0d1117",
    "editor.foreground": "#e8e4da",
    "editorLineNumber.foreground": "#3a4450",
    "editor.lineHighlightBackground": "#10151b",
    "editor.selectionBackground": "#1e2630",
  },
});

export default function JsonViewer({ value, height = 360 }: { value: string; height?: number }) {
  return (
    <div className="border hair" data-testid="json-viewer">
      <Editor
        height={height}
        language="json"
        theme="chronarch-void"
        value={value}
        options={{
          readOnly: true,
          domReadOnly: true,
          minimap: { enabled: false },
          fontFamily: "IBM Plex Mono",
          fontSize: 12,
          lineNumbersMinChars: 3,
          scrollBeyondLastLine: false,
          renderLineHighlight: "none",
          cursorBlinking: "solid", // no blinking cursor: nothing on screen repeats
          wordWrap: "on",
          smoothScrolling: false,
          cursorSmoothCaretAnimation: "off",
        }}
      />
    </div>
  );
}
