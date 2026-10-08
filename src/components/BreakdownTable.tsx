import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { GroupRow, Summary } from '../catalog/rollup.ts';
import type { Level } from '../catalog/types.ts';
import { DivergingBar, shareOf } from './DivergingBar.tsx';
import { SplitBar } from './SplitBar.tsx';

type SortKey = 'label' | 'stocked' | 'BOTH';

interface Sort {
  key: SortKey;
  descending: boolean;
}

const sortValue: Record<SortKey, (row: GroupRow) => string | number> = {
  label: (row) => row.label,
  stocked: (row) => row.summary.stocked,
  BOTH: (row) => row.summary.counts.BOTH,
};

function sortRows(rows: GroupRow[], { key, descending }: Sort): GroupRow[] {
  const value = sortValue[key];
  return [...rows].sort((a, b) => {
    const [x, y] = [value(a), value(b)];
    const order = typeof x === 'string' ? x.localeCompare(y as string) : x - (y as number);
    // Ties fall back to stocked count so the order is stable and meaningful.
    return (descending ? -order : order) || b.summary.stocked - a.summary.stocked;
  });
}

const LEVEL_NAMES: Record<Level, string> = { department: 'Department', category: 'Category', class: 'Class' };

interface BreakdownTableProps {
  level: Level;
  rows: GroupRow[];
  /** Row to emphasize, e.g. the one holding a selected highlight card. */
  highlightedLabel?: string | null;
  onSelect: (label: string) => void;
}

export function BreakdownTable({ level, rows, highlightedLabel, onSelect }: BreakdownTableProps) {
  const [sort, setSort] = useState<Sort>({ key: 'stocked', descending: true });
  const highlightedRow = useRef<HTMLTableRowElement>(null);
  useEffect(() => {
    highlightedRow.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [highlightedLabel]);
  // Bars scale to the largest single-location share in view so differences are visible.
  const scaleMax = Math.max(
    ...rows.flatMap(({ summary: { counts, stocked } }) => [
      shareOf(counts.NV_ONLY, stocked),
      shareOf(counts.PA_ONLY, stocked),
    ]),
  );

  const ariaSort = (key: SortKey) => (sort.key === key ? (sort.descending ? 'descending' : 'ascending') : undefined);

  const sortButton = (key: SortKey, label: ReactNode) => {
    const active = sort.key === key;
    return (
      <button
        className="sort-button"
        onClick={() => setSort({ key, descending: active ? !sort.descending : key !== 'label' })}
      >
        {label}
        <span className="sort-indicator" aria-hidden>
          {active ? (sort.descending ? '▼' : '▲') : ''}
        </span>
      </button>
    );
  };

  return (
    <table className="breakdown">
      <thead>
        <tr>
          <th className="shrink" aria-sort={ariaSort('label')}>
            {sortButton('label', LEVEL_NAMES[level])}
          </th>
          <th className="shrink" aria-sort={ariaSort('stocked')}>
            {sortButton('stocked', 'Stocked SKUs')}
          </th>
          <th className="split-col">PA/NV stock split</th>
          <th className="num shrink" aria-sort={ariaSort('BOTH')}>
            {sortButton('BOTH', 'Stocked in Both')}
          </th>
          <th className="diverging-col">Stock only in PA/NV split</th>
        </tr>
      </thead>
      <tbody>
        {sortRows(rows, sort).map((row) => {
          const highlighted = row.label === highlightedLabel;
          return (
            // The button gives keyboard access; its click bubbles to the row handler.
            <tr
              key={row.label}
              ref={highlighted ? highlightedRow : undefined}
              className={highlighted ? 'clickable highlighted' : 'clickable'}
              onClick={() => onSelect(row.label)}
            >
              <td className="shrink">
                <button className="row-label">{row.label}</button>
              </td>
              <SummaryCells summary={row.summary} scaleMax={scaleMax} />
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function SummaryCells({ summary, scaleMax }: { summary: Summary; scaleMax: number }) {
  const { counts, stocked } = summary;
  const scale = (share: number) => (scaleMax > 0 ? share / scaleMax : 0);
  return (
    <>
      <td className="tabular shrink">{stocked.toLocaleString()}</td>
      <td className="split-col">
        <SplitBar pa={summary.units.PA} nv={summary.units.NV} />
      </td>
      <td className="num shrink">{counts.BOTH.toLocaleString()}</td>
      <td className="diverging-col">
        <DivergingBar
          pa={{ value: counts.PA_ONLY, length: scale(shareOf(counts.PA_ONLY, stocked)) }}
          nv={{ value: counts.NV_ONLY, length: scale(shareOf(counts.NV_ONLY, stocked)) }}
          title={`${counts.PA_ONLY} only in PA, ${counts.NV_ONLY} only in NV, of ${stocked} stocked SKUs`}
        />
      </td>
    </>
  );
}
