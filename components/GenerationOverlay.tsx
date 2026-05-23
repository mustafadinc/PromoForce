"use client";

import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, RefreshCw, Sparkles } from "lucide-react";

type GenerationOverlayProps = {
  open: boolean;
  title?: string;
  steps: string[];
  activeStep: number;
};

export function GenerationOverlay({ open, title = "Compositing Strategy Canvas", steps, activeStep }: GenerationOverlayProps) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pf-generation-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <div className="pf-generation-overlay-inner">
            <div className="pf-generation-spinner-wrap">
              <div className="pf-generation-spinner">
                <Sparkles className="pf-generation-spinner-icon" aria-hidden="true" />
              </div>
            </div>

            <div className="pf-generation-steps">
              <h3>{title}</h3>
              <p>{steps[activeStep] || "Finalizing layout adjustments..."}</p>

              <div className="pf-generation-checklist">
                {steps.map((step, index) => {
                  const isDone = index < activeStep;
                  const isActive = index === activeStep;
                  return (
                    <div key={step} className="pf-generation-checklist-row">
                      {isDone ? (
                        <CheckCircle2 className="pf-generation-icon is-done" aria-hidden="true" />
                      ) : isActive ? (
                        <RefreshCw className="pf-generation-icon is-active" aria-hidden="true" />
                      ) : (
                        <span className="pf-generation-icon is-pending" aria-hidden="true" />
                      )}
                      <span className={isDone ? "is-done" : isActive ? "is-active" : "is-pending"}>{step}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
