import { useEffect, useRef, useState } from "react";

/** Smoothly counts a number toward its new value (instant with reduced motion). */
export function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(0);
  const current = useRef(0);
  useEffect(() => {
    const reduce =
      typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      current.current = target;
      setValue(target);
      return;
    }
    const from = current.current;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const v = from + (target - from) * (1 - Math.pow(1 - t, 3));
      current.current = v;
      setValue(v);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}
