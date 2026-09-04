import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderAt } from "./render";

describe("landing", () => {
  it('says "not a public blockchain" above the fold and in the banner', () => {
    renderAt("/");
    expect(screen.getByTestId("honesty")).toHaveTextContent(/not a public blockchain/i);
    expect(screen.getByTestId("status-banner")).toHaveTextContent(/not a public blockchain/i);
  });

  it("renders the instrument's readouts from the default fixture", () => {
    renderAt("/");
    expect(screen.getByTestId("ring-count")).toHaveTextContent("4");
    expect(screen.getByTestId("scar-count")).toHaveTextContent("0");
    expect(screen.getByTestId("head-hash")).toHaveTextContent(/^bde78f7d64/);
  });

  it("uses a still fallback when WebGL is unavailable (jsdom) rather than throwing", () => {
    renderAt("/");
    expect(screen.getByTestId("viewport-fallback")).toBeInTheDocument();
  });
});
