import type { ReactNode } from 'react';
import { MIN_STOCKED_SKUS, imbalanceKey } from '../catalog/imbalance.ts';
import type { CategoryImbalance } from '../catalog/imbalance.ts';
import type { Location } from '../catalog/types.ts';
import { DivergingBar, shareOf } from './DivergingBar.tsx';
import { SplitBar, compactNumber } from './SplitBar.tsx';

interface ImbalanceCardsProps {
  items: CategoryImbalance[];
  onSelect: (item: CategoryImbalance) => void;
}

/** [the location the category leans toward, the other one] */
const lean = (item: CategoryImbalance): [Location, Location] => (item.gap > 0 ? ['NV', 'PA'] : ['PA', 'NV']);

/** Categories with the most lopsided single-location SKU counts. */
export function SkuImbalanceCards(props: ImbalanceCardsProps) {
  // Bars share one scale across the cards, like the table rows do.
  const scaleMax = Math.max(
    ...props.items.flatMap(({ summary: { counts, stocked } }) => [
      shareOf(counts.NV_ONLY, stocked),
      shareOf(counts.PA_ONLY, stocked),
    ]),
  );
  const scale = (share: number) => (scaleMax > 0 ? share / scaleMax : 0);

  return (
    <CardRow
      {...props}
      id="sku-imbalance"
      title="Categories with SKUs location imbalances"
      ranking="ranked by share of stocked SKUs"
      chart={({ summary: { counts, stocked } }) => (
        <DivergingBar
          pa={{ value: counts.PA_ONLY, length: scale(shareOf(counts.PA_ONLY, stocked)) }}
          nv={{ value: counts.NV_ONLY, length: scale(shareOf(counts.NV_ONLY, stocked)) }}
          title={`${counts.PA_ONLY} only in PA, ${counts.NV_ONLY} only in NV, of ${stocked} stocked SKUs`}
        />
      )}
      note={(item) => {
        // e.g. "4 SKUs in PA, 0 in NV", leaning location first.
        const only = { NV: item.summary.counts.NV_ONLY, PA: item.summary.counts.PA_ONLY };
        const [more, fewer] = lean(item);
        return `${only[more]} ${only[more] === 1 ? 'SKU' : 'SKUs'} in ${more}, ${only[fewer]} in ${fewer}`;
      }}
    />
  );
}

/** Categories whose units on hand sit most heavily in one location. */
export function StockImbalanceCards(props: ImbalanceCardsProps) {
  return (
    <CardRow
      {...props}
      id="stock-imbalance"
      title="Categories with SKU stock location imbalances"
      ranking="ranked by share of units on hand"
      chart={({ summary: { units } }) => <SplitBar pa={units.PA} nv={units.NV} />}
      note={(item) => `${compactNumber.format(Math.abs(item.gap))} more units are in ${lean(item)[0]}`}
    />
  );
}

interface CardRowProps extends ImbalanceCardsProps {
  id: string;
  title: string;
  /** How the cards are ordered, shown after the title. */
  ranking: string;
  chart: (item: CategoryImbalance) => ReactNode;
  note: (item: CategoryImbalance) => ReactNode;
}

/** A titled row of up to five category cards. */
function CardRow({ id, title, ranking, items, onSelect, chart, note }: CardRowProps) {
  return (
    <section className="highlights" aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`} className="highlights__title">
        {title}{' '}
        <span className="muted">
          · {ranking}, at least {MIN_STOCKED_SKUS} stocked
        </span>
      </h3>
      <div className="highlights__cards">
        {items.map((item) => (
          <button key={imbalanceKey(item)} className="card" onClick={() => onSelect(item)}>
            <span className="card__eyebrow">{item.department}</span>
            <span className="card__name">{item.category}</span>
            {chart(item)}
            <span className="card__note">{note(item)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
