"use client";

import { motion, useInView, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useRef } from "react";

export function Reveal({
  children,
  delay = 0,
  y = 28,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedNumber({
  value,
  duration,
  className,
}: {
  value: number;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const mv = useMotionValue(0);
  const spring = useSpring(mv, {
    duration: duration ?? 1600,
    bounce: 0,
  });

  useEffect(() => {
    if (inView) mv.set(value);
  }, [inView, value, mv]);

  useEffect(() => {
    const unsub = spring.on("change", (v) => {
      if (ref.current) ref.current.textContent = Math.round(v).toLocaleString("en-IN");
    });
    return unsub;
  }, [spring]);

  // Reserve the final rendered width up-front (tabular digits + full glyph
  // count of the formatted value) so counting from 0 → N never reflows the
  // surrounding layout — a key anti layout-shift measure for the stats strip.
  const finalGlyphs = Math.max(
    1,
    Math.round(value).toLocaleString("en-IN").length
  );

  return (
    <span
      ref={ref}
      className={`inline-block tabular-nums text-center ${className ?? ""}`}
      style={{ minWidth: `${finalGlyphs}ch` }}
    >
      0
    </span>
  );
}
