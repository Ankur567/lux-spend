"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";

export function SuccessBurst({ title, subtitle }: { title: string; subtitle?: string }) {
  const reduce = useReducedMotion();
  return (
    <div className="flex flex-col items-center py-6 text-center">
      <motion.div
        initial={reduce ? false : { scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 380, damping: 18 }}
        className="flex size-20 items-center justify-center rounded-full bg-success text-white shadow-[0_10px_30px_-10px] shadow-success"
      >
        <Check className="size-10" strokeWidth={3} />
      </motion.div>
      <motion.h3
        initial={reduce ? false : { y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.12 }}
        className="mt-5 font-display text-3xl"
      >
        {title}
      </motion.h3>
      {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
    </div>
  );
}
