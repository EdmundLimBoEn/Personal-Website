"use client";

import { createContext, useContext, useEffect, useState } from "react";

const MotionModeContext = createContext<{ full: boolean; toggle: () => void }>({
  full: false,
  toggle: () => {},
});

export function useMotionMode() {
  return useContext(MotionModeContext);
}

/** Site-wide FX switch. Calm by default; "full" unlocks the showpiece motion. */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  const [full, setFull] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      setFull(localStorage.getItem("motion-fx") === "1");
    } catch {
      // Persistence may be disabled; keep the in-memory default.
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem("motion-fx", full ? "1" : "0");
    } catch {
      // The FX switch still works when storage is unavailable.
    }
  }, [full, loaded]);

  const toggle = () => setFull((f) => !f);

  return (
    <MotionModeContext.Provider value={{ full, toggle }}>
      {children}
    </MotionModeContext.Provider>
  );
}

/** Nav switch for the full-motion experience. */
export function FxToggle() {
  const { full, toggle } = useMotionMode();
  return (
    <button
      onClick={toggle}
      aria-pressed={full}
      title="Toggle motion effects"
      className="inline-flex min-h-[48px] cursor-pointer items-center font-mono text-[11px] uppercase tracking-[0.2em] text-ink transition-colors hover:text-accent"
    >
      FX{" "}
      <span className={full ? "text-accent" : "text-dim"}>{full ? "●" : "○"}</span>
    </button>
  );
}
