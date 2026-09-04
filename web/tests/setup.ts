import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => cleanup());

// jsdom has no WebGL. Make getContext return null quietly (instead of logging
// "not implemented") so the viewport takes its still fallback in tests.
Object.defineProperty(HTMLCanvasElement.prototype, "getContext", { value: () => null, configurable: true });
