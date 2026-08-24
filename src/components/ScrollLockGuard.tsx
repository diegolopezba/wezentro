import { useEffect } from "react";

/**
 * Safety net for leaked Radix/vaul scroll locks.
 *
 * When a sheet unmounts while another one is opening, the body can be left
 * with `data-scroll-locked`, `overflow: hidden` and `pointer-events: none`,
 * which freezes the whole app until a manual refresh. This observer clears
 * the lock whenever no dialog is actually open.
 */
export const ScrollLockGuard = () => {
  useEffect(() => {
    const body = document.body;

    const anyOverlayOpen = () =>
      document.querySelector(
        '[role="dialog"][data-state="open"],[role="alertdialog"][data-state="open"],[data-vaul-drawer][data-state="open"]',
      ) !== null;

    const release = () => {
      if (anyOverlayOpen()) return;
      if (!body.hasAttribute("data-scroll-locked") && body.style.pointerEvents !== "none") {
        return;
      }
      body.removeAttribute("data-scroll-locked");
      body.style.removeProperty("pointer-events");
      body.style.removeProperty("overflow");
      body.style.removeProperty("padding-right");
      body.style.removeProperty("margin-right");
    };

    // Re-check shortly after any DOM mutation that could have closed a sheet.
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      if (timer !== null) return;
      timer = setTimeout(() => {
        timer = null;
        release();
      }, 250);
    };

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-scroll-locked", "style", "data-state"],
      childList: true,
      subtree: true,
    });

    release();

    return () => {
      observer.disconnect();
      if (timer !== null) clearTimeout(timer);
    };
  }, []);

  return null;
};
