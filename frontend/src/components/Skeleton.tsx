import type { CSSProperties } from "react";

/** Single shimmering placeholder block. Building block for the composites below. */
export function Skeleton({
  width = "100%",
  height = "1rem",
  radius = "6px",
  style,
}: {
  width?: string | number;
  height?: string | number;
  radius?: string | number;
  style?: CSSProperties;
}) {
  return (
    <span
      className="skeleton"
      aria-hidden="true"
      style={{ width, height, borderRadius: radius, ...style }}
    />
  );
}

/** A few lines of placeholder text, last line shorter for a natural look. */
export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="skeleton-text" aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} height="0.9rem" width={i === lines - 1 ? "60%" : "100%"} />
      ))}
    </div>
  );
}

/** Placeholder rows for a data-table while it loads. */
export function SkeletonTable({ rows = 4, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="skeleton-table" aria-hidden="true">
      {Array.from({ length: rows }).map((_, r) => (
        <div className="skeleton-table-row" key={r}>
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} height="1rem" />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Placeholder for a card-shaped block (icon/title + a couple of text lines). */
export function SkeletonCard() {
  return (
    <div className="card skeleton-card" aria-hidden="true">
      <Skeleton width="40%" height="1.1rem" />
      <SkeletonText lines={2} />
    </div>
  );
}
