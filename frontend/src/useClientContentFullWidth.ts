import { useLayoutEffect, useState, type RefObject } from "react";

const MOBILE_BREAKPOINT = 900;

export function useClientContentFullWidth(
  mainRef: RefObject<HTMLElement | null>,
  sidebarTopRef: RefObject<HTMLElement | null>,
  sidebarRef: RefObject<HTMLElement | null>,
  clientRef: RefObject<HTMLElement | null>,
  enabled: boolean,
) {
  const [expanded, setExpanded] = useState(false);

  useLayoutEffect(() => {
    if (!enabled) {
      setExpanded(false);
      return;
    }

    const main = mainRef.current;
    const sidebarTop = sidebarTopRef.current;
    const sidebar = sidebarRef.current;
    const client = clientRef.current;
    if (!main || !sidebarTop || !sidebar || !client) {
      return;
    }

    function update() {
      if (window.innerWidth <= MOBILE_BREAKPOINT) {
        setExpanded(false);
        return;
      }

      const mainRect = main.getBoundingClientRect();
      const sidebarTopRect = sidebarTop.getBoundingClientRect();
      const sidebarStyles = window.getComputedStyle(sidebar);
      const gapValue = sidebarStyles.rowGap || sidebarStyles.gap || "0";
      const gap = Number.parseFloat(gapValue) || 0;
      const projectedClientTop = sidebarTopRect.bottom + gap;

      setExpanded(projectedClientTop >= mainRect.bottom - 1);
    }

    update();

    const observer = new ResizeObserver(update);
    observer.observe(main);
    observer.observe(sidebarTop);
    observer.observe(client);
    window.addEventListener("resize", update);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [mainRef, sidebarTopRef, sidebarRef, clientRef, enabled]);

  return expanded;
}
