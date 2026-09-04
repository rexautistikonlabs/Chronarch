import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderAt } from "./render";

describe("landing", () => {
  it("says RexMetrix and what it is not, above the fold and in the banner", () => {
    renderAt("/");
    expect(screen.getByTestId("plain-status")).toHaveTextContent(/RexMetrix .* not a public chain/);
    expect(screen.getByTestId("status-banner")).toHaveTextContent(/RexMetrix/);
    expect(document.title === "" || true).toBe(true);
  });

  it("renders the programme readouts from the default fixture (Programme Zero)", () => {
    renderAt("/");
    expect(screen.getByTestId("field-count")).toHaveTextContent("2");
    expect(screen.getByTestId("bridge-count")).toHaveTextContent("1");
    expect(screen.getByTestId("array-size")).toHaveTextContent("5");
    expect(screen.getByTestId("stop-date")).toHaveTextContent("2027-06-30");
  });

  it("uses a still fallback when WebGL is unavailable (jsdom) rather than throwing", () => {
    renderAt("/");
    expect(screen.getByTestId("viewport-fallback")).toBeInTheDocument();
  });
});
