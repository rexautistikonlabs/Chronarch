/** The first screen's legal notice is dismissible, never deletable.
 *
 *  The strip carries the law on the first screen; a visitor who has read it
 *  may hide it so the lab is full-bleed, and this browser remembers that in
 *  one flag. Hiding changes what is *shown first*, never what is *available*:
 *  the footer's "Legal" and the lab's spec board expand the same sentences in
 *  place, the footer keeps the LLC and both attribution links at all times,
 *  and the header's "Legal" control brings the strip back (which clears the
 *  flag, so the stored preference always mirrors what the visitor chose).
 *  Nothing here blocks the page: there is no checkbox and no wall.
 *
 *  The flag is one string in this browser. No storage (a private window, a
 *  browser that refuses it) means the notice simply shows every visit. */
export const NOTICE_KEY = "rexmetrix.strip.v1";

function storage(): Storage | null {
  try {
    return typeof window !== "undefined" && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** Has this browser asked for the notice to start hidden? */
export function noticeHidden(): boolean {
  try {
    return storage()?.getItem(NOTICE_KEY) === "1";
  } catch {
    return false;
  }
}

/** Remember the choice: hidden writes the flag, shown clears it. */
export function setNoticeHidden(hidden: boolean): void {
  try {
    const s = storage();
    if (!s) return;
    if (hidden) s.setItem(NOTICE_KEY, "1");
    else s.removeItem(NOTICE_KEY);
  } catch {
    // no storage: the choice holds for this mount and the notice returns next visit
  }
}
