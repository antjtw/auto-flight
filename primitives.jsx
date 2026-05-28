// =============================================================
//  Small reusable UI primitives.
// =============================================================

import React from "react";

// A coloured tag for counts or status. Tones map to the semantic palette.
export function Pill({ children, tone = "neutral" }) {
  const styles = {
    neutral: "bg-[var(--bg-subtle)] text-[var(--text-default)]",
    accent:  "bg-[var(--accent)] text-[var(--text-on-accent)]",
    brand:   "bg-[var(--brand)] text-[var(--text-on-dark)]",
    warning: "bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-border)]",
    danger:  "bg-[var(--danger-bg)] text-[var(--danger-text)] border border-[var(--danger-border)]",
    success: "bg-[var(--success-bg)] text-[var(--success-text)] border border-[var(--success-border)]",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium tabular-nums ${styles[tone] ?? styles.neutral}`}>
      {children}
    </span>
  );
}

// A toggle row with label, optional hint, and a switch control.
export function Toggle({ label, hint, checked, onChange }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer py-1.5">
      <span className="relative inline-flex flex-shrink-0 mt-0.5">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="w-10 h-6 bg-[var(--border-strong)] rounded-full peer-checked:bg-[var(--accent)] transition" />
        <span className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition peer-checked:translate-x-4 shadow-sm" />
      </span>
      <span className="flex-1 min-w-0">
        <div className="text-sm text-[var(--text-default)] leading-tight">{label}</div>
        {hint && <div className="text-xs text-[var(--text-subdued)] mt-0.5 leading-snug">{hint}</div>}
      </span>
    </label>
  );
}
