/** In the UI, the example corpus arrives only when its chip is pressed. */
import { fireEvent, screen } from "@testing-library/react";

/** Press the Autistikon chip, wait for the pack's rows, then return to All. */
export async function loadExamplePackUI(): Promise<void> {
  fireEvent.click(screen.getByTestId("filter-autistikon"));
  await screen.findByTestId("select-work-pz-ledger-structure", {}, { timeout: 4000 });
  fireEvent.click(screen.getByTestId("filter-all"));
}

/** Select the Classics starter pack (its chip lives in the closed substrate details; jsdom clicks it fine). */
export function loadClassicsUI(): void {
  fireEvent.click(screen.getByTestId("tech-programme-classics.json"));
}
