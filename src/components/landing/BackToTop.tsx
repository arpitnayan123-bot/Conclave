"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useScroll, useSpring, useTransform } from "framer-motion";
import { ArrowUp } from "lucide-react";

/**
 * Floating back-to-top button — a rotated diamond crest (echoing the club
 * logo) with the scroll progress traced as a gold→emerald line around its
 * edge. Appears after the first viewport.
 */

// pathLength-normalized perimeter, so dash math stays resolution-independent
const PROGRESS_LEN = 100;
// diamond face in the 52×52 viewBox (vertices at the mid-edges)
const DIAMOND_PATH = "M26 4.5 L47.5 26 L26 47.5 L4.5 26 Z";

export default function BackToTop() {
  const [show, setShow] = useState(false);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 28, mass: 0.4 });
  const dashOffset = useTransform(progress, (v) => PROGRESS_LEN * (1 - Math.min(1, Math.max(0, v))));
  const pctLabel = useTransform(progress, (v) => `${Math.round(Math.min(1, Math.max(0, v)) * 100)}%`);
  const [ariaLabel, setAriaLabel] = useState("Back to top");

  useEffect(() => {
    const unsub = pctLabel.on("change", (v) => setAriaLabel(`Back to top — ${v} of page scrolled`));
    return () => unsub();
  }, [pctLabel]);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > window.innerHeight * 0.9);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {show ? (
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 16, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.9 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label={ariaLabel}
          title="Back to top"
          className="fixed bottom-5 right-5 z-50 h-[52px] w-[52px] rotate-45 rounded-[12px] glass ring-1 ring-gold/35 text-primary shadow-xl shadow-black/40 transition-all duration-300 hover:scale-105 hover:ring-gold/70 hover:shadow-[0_0_28px_-6px_oklch(0.84_0.13_85/55%)]"
        >
          {/* counter-rotated face keeps ring + arrow upright inside the diamond */}
          <span className="absolute inset-0 -rotate-45" aria-hidden="true">
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 52 52" aria-hidden="true">
              {/* engraved track — the diamond's permanent gold frame */}
              <path
                d={DIAMOND_PATH}
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.28"
                strokeWidth="1.5"
                strokeLinejoin="miter"
              />
              {/* progress line traced around the crest */}
              <motion.path
                d={DIAMOND_PATH}
                fill="none"
                stroke="url(#btt-grad)"
                strokeWidth="2"
                strokeLinecap="round"
                pathLength={PROGRESS_LEN}
                strokeDasharray={PROGRESS_LEN}
                style={{ strokeDashoffset: dashOffset }}
              />
              <defs>
                <linearGradient id="btt-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#e5b84b" />
                  <stop offset="100%" stopColor="#34d399" />
                </linearGradient>
              </defs>
            </svg>
            <ArrowUp className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2" />
          </span>
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}
