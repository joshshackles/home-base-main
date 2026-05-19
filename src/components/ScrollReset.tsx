"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function ScrollReset() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    const scrollingRoots = document.querySelectorAll<HTMLElement>("[data-dashboard-scroll-root]");
    scrollingRoots.forEach((node) => { node.scrollTop = 0; node.scrollLeft = 0; });
  }, [pathname, searchParams]);

  return null;
}
