"use client";

import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2 } from "lucide-react";

type CopyToastProps = {
  message: string | null;
  onDismiss?: () => void;
};

export function CopyToast({ message, onDismiss }: CopyToastProps) {
  return (
    <AnimatePresence>
      {message ? (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          className="pf-copy-toast"
          onClick={onDismiss}
          role="status"
        >
          <CheckCircle2 aria-hidden="true" />
          <span>{message}</span>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
