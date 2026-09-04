/** /lab cannot go black because of its viewer. A viewer that throws (the
 *  Monaco-worker failure that blanked the route in `vite dev`) is caught by
 *  an error boundary; the STATUS banner, nav, fixture buttons, readouts and
 *  viewport stay in the DOM. */
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ErrorBoundary } from "../src/components/ErrorBoundary";
import { renderAt } from "./render";

vi.mock("../src/components/JsonViewer", () => ({
  default: () => {
    throw new Error("mocked Monaco worker failure");
  },
}));

describe("lab resilience", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders /lab without throwing even when the JSON viewer crashes", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderAt("/tech")).not.toThrow();
    // the viewer failed closed …
    expect(screen.getByTestId("viewer-error")).toHaveTextContent(/mocked Monaco worker failure/);
    // … and the chrome, controls, readouts and viewport are all still there
    expect(screen.getByTestId("status-banner")).toHaveTextContent(/not a public chain/i);
    expect(screen.getByRole("navigation", { name: "Rooms" })).toBeInTheDocument();
    expect(screen.getByTestId("load-session-opa.json")).toBeInTheDocument();
    expect(screen.getByTestId("load-session-solo.json")).toBeInTheDocument();
    expect(screen.getByTestId("json-input")).toBeInTheDocument();
    expect(screen.getByTestId("statbar")).toBeInTheDocument();
    expect(screen.getByTestId("ring-count")).toHaveTextContent("4");
    expect(screen.getByTestId("tech-bench")).toBeInTheDocument(); // the operator bench is flat HTML: no well on this route
    expect(document.getElementById("root") ?? document.body).not.toBeEmptyDOMElement();
  });

  it("the boundary is a still ivory panel, never amber, and only wraps what failed", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    const Boom = () => {
      throw new Error("scene exploded");
    };
    render(
      <div>
        <p data-testid="sibling">still here</p>
        <ErrorBoundary name="scene">
          <Boom />
        </ErrorBoundary>
      </div>,
    );
    expect(screen.getByTestId("sibling")).toBeInTheDocument();
    const panel = screen.getByTestId("scene-error");
    expect(panel).toHaveTextContent(/scene exploded/);
    expect(panel).toHaveTextContent(/failed closed/);
    expect(panel.className).not.toMatch(/amber/);
  });
});
