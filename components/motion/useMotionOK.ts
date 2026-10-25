"use client";

import { useEffect, useState } from "react";

/** Keep motion off until the browser preference is known. */
export function useMotionOK() {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setOk(!query.matches);
    query.addEventListener("change", update);
    update();
    return () => query.removeEventListener("change", update);
  }, []);
  return ok;
}
