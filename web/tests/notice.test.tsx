/** The first screen's notice is dismissible, never deletable: one click hides
 *  the strip and the room is full-bleed; the flag remembers it for the next
 *  visit; and every sentence is still one control away — the header's Legal,
 *  the footer's Legal, the lab's spec board — with the LLC line and both
 *  attribution links standing in the footer whatever is hidden. No checkbox,
 *  no wall, nothing to agree to. The Canvas is stubbed (jsdom has no WebGL). */
import { fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ATTRIBUTIONS, LEGAL, LEGAL_LINES, LLC } from "../src/lib/legal";
import { NOTICE_KEY, noticeHidden, setNoticeHidden } from "../src/lib/notice";
import { renderAt } from "./render";

vi.mock("../src/lab/Lab", () => import("./labMock"));

const reduceStub = (matches: boolean) => (q: string) => ({ matches: matches && q.includes("reduce"), media: q, onchange: null, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false });

/** Every sentence the law owes a visitor, wherever it is being read. */
function expectEveryLine(el: HTMLElement) {
  for (const line of LEGAL_LINES) expect(el).toHaveTextContent(line);
}

describe("the notice can be hidden", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("cold load, empty storage: the strip is in the document with every line and a real Hide notice button; nothing is written yet", () => {
    expect(window.localStorage.length).toBe(0);
    renderAt("/");
    expect(screen.getByTestId("landing-body")).toHaveAttribute("data-notice", "open");
    const strip = screen.getByTestId("legal-strip");
    expectEveryLine(strip);
    const hide = within(strip).getByTestId("strip-hide");
    expect(hide.tagName).toBe("BUTTON");
    expect(hide).toHaveTextContent(/hide notice/i);
    expect(hide).not.toBeDisabled(); // in the tab order, not a decoration
    expect(screen.getByTestId("header-legal")).toHaveAttribute("aria-expanded", "true");
    expect(window.localStorage.getItem(NOTICE_KEY)).toBeNull();
    expect(noticeHidden()).toBe(false);
    // never a gate
    expect(document.querySelectorAll('input[type="checkbox"]')).toHaveLength(0);
    expect(screen.queryByTestId("gate")).not.toBeInTheDocument();
  });

  it("Hide notice: the strip leaves the layout, the flag is written, the lab keeps its canvas, and the footer still carries the LLC, both attribution links and the Legal control", () => {
    renderAt("/");
    expect(document.querySelectorAll("canvas")).toHaveLength(1);
    fireEvent.click(screen.getByTestId("strip-hide"));
    expect(screen.queryByTestId("legal-strip")).not.toBeInTheDocument();
    expect(screen.getByTestId("landing-body")).toHaveAttribute("data-notice", "hidden");
    expect(window.localStorage.getItem(NOTICE_KEY)).toBe("1");
    expect(noticeHidden()).toBe(true);
    // the room is untouched and still clickable
    expect(document.querySelectorAll("canvas")).toHaveLength(1);
    expect(screen.getByTestId("lab-viewport")).toBeInTheDocument();
    expect(screen.getByTestId("sign-chronarch")).toBeInTheDocument();
    // the footer never loses the law
    const footer = screen.getByTestId("landing-footer");
    expect(within(footer).getByTestId("footer-llc")).toHaveTextContent(LLC);
    for (const a of ATTRIBUTIONS) expect(within(footer).getByTestId(`footer-attribution-${a.label}`)).toHaveAttribute("href", a.href);
    expect(within(footer).getByTestId("footer-legal")).toBeInTheDocument();
    expect(document.querySelectorAll('input[type="checkbox"]')).toHaveLength(0);
  });

  it("with the flag, a fresh visit starts closed; the header's Legal brings the whole notice back and clears the flag; hiding again rewrites it", () => {
    setNoticeHidden(true);
    renderAt("/");
    expect(screen.queryByTestId("legal-strip")).not.toBeInTheDocument();
    expect(screen.getByTestId("landing-body")).toHaveAttribute("data-notice", "hidden");
    const header = screen.getByTestId("header-legal");
    expect(header.tagName).toBe("BUTTON");
    expect(header).toHaveAttribute("aria-expanded", "false");
    expect(header).toHaveAttribute("aria-controls", "legal-strip");
    fireEvent.click(header);
    const strip = screen.getByTestId("legal-strip");
    expect(strip).toHaveAttribute("id", "legal-strip");
    expectEveryLine(strip);
    for (const a of ATTRIBUTIONS) expect(within(strip).getByTestId(`strip-attribution-${a.label}`)).toHaveAttribute("href", a.href);
    expect(screen.getByTestId("header-legal")).toHaveAttribute("aria-expanded", "true");
    expect(window.localStorage.getItem(NOTICE_KEY)).toBeNull(); // the flag mirrors what the visitor chose
    fireEvent.click(screen.getByTestId("header-legal"));
    expect(screen.queryByTestId("legal-strip")).not.toBeInTheDocument();
    expect(window.localStorage.getItem(NOTICE_KEY)).toBe("1");
  });

  it("clearing the flag shows the strip again on the next visit", () => {
    setNoticeHidden(true);
    const hidden = renderAt("/");
    expect(screen.queryByTestId("legal-strip")).not.toBeInTheDocument();
    hidden.unmount();
    window.localStorage.removeItem(NOTICE_KEY);
    renderAt("/");
    expectEveryLine(screen.getByTestId("legal-strip"));
  });

  it("an unreadable flag is not a hidden notice: junk in the key shows the strip", () => {
    window.localStorage.setItem(NOTICE_KEY, "{not-a-flag");
    renderAt("/");
    expect(screen.getByTestId("legal-strip")).toBeInTheDocument();
  });

  it("with the strip hidden, the footer's Legal still expands every sentence in place — the page stays, nothing is blocked", () => {
    setNoticeHidden(true);
    renderAt("/");
    expect(screen.queryByTestId("legal-panel")).not.toBeInTheDocument();
    const legal = within(screen.getByTestId("landing-footer")).getByTestId("footer-legal");
    expect(legal).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(legal);
    const panel = screen.getByTestId("legal-panel");
    expectEveryLine(panel);
    expect(panel.getAttribute("role")).not.toBe("dialog"); // expanded in place, never a full-screen wall
    expect(screen.getByTestId("landing-body")).toBeInTheDocument();
    expect(screen.getByTestId("lab-viewport")).toBeInTheDocument();
    fireEvent.click(legal);
    expect(screen.queryByTestId("legal-panel")).not.toBeInTheDocument();
  });

  it("with the strip hidden, the lab's spec board still opens the same text", () => {
    setNoticeHidden(true);
    renderAt("/");
    fireEvent.click(screen.getByTestId("sign-specboard"));
    const drawer = screen.getByTestId("spec-drawer");
    expectEveryLine(drawer);
    expect(within(drawer).getByTestId("board-llc")).toHaveTextContent(LLC);
    expect(within(drawer).getByTestId("board-data")).toHaveTextContent(LEGAL.data);
    for (const a of ATTRIBUTIONS) expect(within(drawer).getByTestId(`board-attribution-${a.label}`)).toHaveAttribute("href", a.href);
  });

  it("under reduced motion the notice hides and returns the same way, with no canvas and the station list intact", () => {
    vi.stubGlobal("matchMedia", reduceStub(true));
    renderAt("/");
    expect(screen.getByTestId("landing-body")).toHaveAttribute("data-mode", "reduced-motion");
    expectEveryLine(screen.getByTestId("legal-strip"));
    fireEvent.click(screen.getByTestId("strip-hide"));
    expect(screen.queryByTestId("legal-strip")).not.toBeInTheDocument();
    expect(window.localStorage.getItem(NOTICE_KEY)).toBe("1");
    expect(document.querySelectorAll("canvas")).toHaveLength(0);
    expect(screen.getByTestId("station-list")).toBeInTheDocument();
    expect(within(screen.getByTestId("landing-footer")).getByTestId("footer-llc")).toHaveTextContent(LLC);
    fireEvent.click(screen.getByTestId("header-legal"));
    expectEveryLine(screen.getByTestId("legal-strip"));
  });

  it("the flag is one key in this browser, and no storage at all is simply a notice that always shows", () => {
    expect(NOTICE_KEY).toBe("rexmetrix.strip.v1");
    const real = Object.getOwnPropertyDescriptor(window, "localStorage");
    Object.defineProperty(window, "localStorage", { configurable: true, get() { throw new Error("no storage here"); } });
    try {
      expect(noticeHidden()).toBe(false);
      expect(() => setNoticeHidden(true)).not.toThrow();
      renderAt("/");
      expect(screen.getByTestId("legal-strip")).toBeInTheDocument();
      fireEvent.click(screen.getByTestId("strip-hide")); // still hides for this mount
      expect(screen.queryByTestId("legal-strip")).not.toBeInTheDocument();
    } finally {
      if (real) Object.defineProperty(window, "localStorage", real);
    }
  });
});
