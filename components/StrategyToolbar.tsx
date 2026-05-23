"use client";

import type { ReactNode } from "react";

type StrategyToolbarProps = {
  eyebrow: string;
  title: string;
  actions: ReactNode;
};

export function StrategyToolbar({ eyebrow, title, actions }: StrategyToolbarProps) {
  return (
    <div className="pf-strategy-toolbar">
      <div className="pf-strategy-toolbar-copy">
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      <div className="pf-strategy-toolbar-actions toolbar-actions">{actions}</div>
    </div>
  );
}
