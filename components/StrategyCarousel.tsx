"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

export type CarouselStep = {
  id: string;
  label: string;
  subtitle?: string;
};

type StrategyCarouselProps = {
  steps: CarouselStep[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  children: ReactNode;
};

export function StrategyCarousel({ steps, activeIndex, onActiveIndexChange, children }: StrategyCarouselProps) {
  const step = steps[activeIndex];
  const isFirst = activeIndex === 0;
  const isLast = activeIndex >= steps.length - 1;
  const useSelectNav = steps.length > 8;

  return (
    <div className="pf-carousel">
      <div className="pf-carousel-header">
        <div className="pf-carousel-progress">
          <span className="pf-carousel-step-count">
            Step {activeIndex + 1} of {steps.length}
          </span>
          <div className="pf-carousel-progress-bar" aria-hidden="true">
            <span style={{ width: `${((activeIndex + 1) / steps.length) * 100}%` }} />
          </div>
        </div>

        {useSelectNav ? (
          <label className="pf-carousel-jump">
            <span className="sr-only">Jump to step</span>
            <select value={activeIndex} onChange={(e) => onActiveIndexChange(Number(e.target.value))}>
              {steps.map((entry, index) => (
                <option key={entry.id} value={index}>
                  {entry.label}
                  {entry.subtitle ? ` — ${entry.subtitle}` : ""}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="pf-carousel-dots" role="tablist" aria-label="Steps">
            {steps.map((entry, index) => (
              <button
                key={entry.id}
                type="button"
                role="tab"
                aria-selected={index === activeIndex}
                aria-label={entry.label}
                title={entry.subtitle ? `${entry.label}: ${entry.subtitle}` : entry.label}
                className={`pf-carousel-dot ${index === activeIndex ? "is-active" : ""} ${index < activeIndex ? "is-done" : ""}`}
                onClick={() => onActiveIndexChange(index)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="pf-carousel-title-row">
        <div>
          <h3 className="pf-carousel-title">{step?.label}</h3>
          {step?.subtitle ? <p className="pf-carousel-subtitle">{step.subtitle}</p> : null}
        </div>
        <div className="pf-carousel-nav">
          <button
            type="button"
            className="pf-carousel-nav-btn"
            onClick={() => onActiveIndexChange(activeIndex - 1)}
            disabled={isFirst}
            aria-label="Previous step"
          >
            <ChevronLeft aria-hidden="true" />
          </button>
          <button
            type="button"
            className="pf-carousel-nav-btn"
            onClick={() => onActiveIndexChange(activeIndex + 1)}
            disabled={isLast}
            aria-label="Next step"
          >
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="pf-carousel-panel">{children}</div>

      <div className="pf-carousel-footer">
        <button
          type="button"
          className="secondary-action compact-action"
          onClick={() => onActiveIndexChange(activeIndex - 1)}
          disabled={isFirst}
        >
          Previous
        </button>
        <button
          type="button"
          className="secondary-action compact-action"
          onClick={() => onActiveIndexChange(activeIndex + 1)}
          disabled={isLast}
        >
          {isLast ? "Last step" : "Next step"}
        </button>
      </div>
    </div>
  );
}
