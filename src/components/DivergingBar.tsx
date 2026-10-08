import type { Summary } from '../catalog/rollup.ts';

export function shareOf(count: number, stocked: number): number {
  return stocked > 0 ? count / stocked : 0;
}

interface DivergingBarProps {
  summary: Summary;
  /** The share that fills a whole half; shared across the table so rows are comparable. */
  scaleMax: number;
}

/**
 * PA-only SKUs grow left from the center, NV-only grow right, each with its
 * count at the bar's tip. Length is the share of the row's stocked SKUs, so a
 * lopsided small group stands out as clearly as a lopsided large one.
 */
export function DivergingBar({ summary, scaleMax }: DivergingBarProps) {
  const { stocked, counts } = summary;
  return (
    <div
      className="diverging"
      title={`${counts.PA_ONLY} only in PA, ${counts.NV_ONLY} only in NV, of ${stocked} stocked SKUs`}
    >
      <span className="diverging__half diverging__half--left">
        <Bar count={counts.PA_ONLY} stocked={stocked} scaleMax={scaleMax} fill="fill--pa" />
      </span>
      <span className="diverging__half diverging__half--right">
        <Bar count={counts.NV_ONLY} stocked={stocked} scaleMax={scaleMax} fill="fill--nv" />
      </span>
    </div>
  );
}

interface BarProps {
  count: number;
  stocked: number;
  scaleMax: number;
  fill: string;
}

function Bar({ count, stocked, scaleMax, fill }: BarProps) {
  const width = scaleMax > 0 ? (shareOf(count, stocked) / scaleMax) * 100 : 0;
  return (
    <span
      className={count > 0 ? `diverging__fill diverging__fill--filled ${fill}` : 'diverging__fill'}
      style={{ width: `${width}%` }}
    >
      <span className={count === 0 ? 'diverging__count muted' : 'diverging__count'}>{count.toLocaleString()}</span>
    </span>
  );
}

/** Color key for the bar, in the same left-to-right order. */
export function DivergingLegend() {
  return (
    <div className="legend">
      <span>
        <span className="swatch fill--pa" />
        Only PA
      </span>
      <span>
        <span className="swatch fill--nv" />
        Only NV
      </span>
    </div>
  );
}
