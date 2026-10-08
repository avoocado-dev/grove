export function shareOf(part: number, total: number): number {
  return total > 0 ? part / total : 0;
}

interface Side {
  /** Shown at the bar's tip. */
  value: number;
  /** Fraction (0–1) of the half the bar fills. */
  length: number;
}

interface DivergingBarProps {
  pa: Side;
  nv: Side;
  title: string;
}

/**
 * PA grows left from the center, NV grows right, each with its value at the
 * bar's tip. Callers decide what length means (a share of stocked SKUs, a share
 * of units on hand), so the same mark reads the same way across views.
 */
export function DivergingBar({ pa, nv, title }: DivergingBarProps) {
  return (
    <div className="diverging" title={title}>
      <span className="diverging__half diverging__half--left">
        <Bar {...pa} fill="fill--pa" />
      </span>
      <span className="diverging__half diverging__half--right">
        <Bar {...nv} fill="fill--nv" />
      </span>
    </div>
  );
}

function Bar({ value, length, fill }: Side & { fill: string }) {
  const filled = value > 0 && length > 0;
  return (
    <span
      className={filled ? `diverging__fill diverging__fill--filled ${fill}` : 'diverging__fill'}
      style={{ width: `${filled ? Math.min(length, 1) * 100 : 0}%` }}
    >
      <span className={value > 0 ? 'diverging__count' : 'diverging__count muted'}>{value.toLocaleString()}</span>
    </span>
  );
}

/** Color key for the bar, in the same left-to-right order. */
export function DivergingLegend() {
  return (
    <div className="legend">
      <span>
        <span className="swatch fill--pa" />
        PA
      </span>
      <span>
        <span className="swatch fill--nv" />
        NV
      </span>
    </div>
  );
}
