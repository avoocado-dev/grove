/** 152,934 -> "152.9K" */
export const compactNumber = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

interface SplitBarProps {
  pa: number;
  nv: number;
}

/**
 * A 100% bar of units on hand: PA's part on the left, NV's on the right, with
 * each location's units at its end. Every row's bar is the same length, so the
 * split stays comparable however much stock a row holds; the labels carry the amount.
 */
export function SplitBar({ pa, nv }: SplitBarProps) {
  return (
    <span className="split" title={`${pa.toLocaleString()} units in PA, ${nv.toLocaleString()} units in NV`}>
      <span className={pa > 0 ? 'split__value' : 'split__value muted'}>{compactNumber.format(pa)}</span>
      <span className="split__track">
        {pa > 0 && <span className="split__part fill--pa" style={{ flexGrow: pa }} />}
        {nv > 0 && <span className="split__part fill--nv" style={{ flexGrow: nv }} />}
      </span>
      <span className={nv > 0 ? 'split__value' : 'split__value muted'}>{compactNumber.format(nv)}</span>
    </span>
  );
}
