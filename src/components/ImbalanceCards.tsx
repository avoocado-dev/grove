import type { ReactNode } from 'react';
import { MIN_STOCKED_SKUS, imbalanceKey } from '../catalog/imbalance.ts';
import type { CategoryImbalance } from '../catalog/imbalance.ts';
import type { Location } from '../catalog/types.ts';
import { DivergingBar, shareOf } from './DivergingBar.tsx';
import { SplitBar, compactNumber } from './SplitBar.tsx';

interface ImbalanceCardsProps {
  items: CategoryImbalance[];
  /** Name each card's department; redundant once you're inside one. */
  showDepartment: boolean;
  /** imbalanceKey of the selected card, if any. */
  selectedKey: string | null;
  /** Called with the clicked card; clicking the selected card again calls it with null. */
  onSelect: (item: CategoryImbalance | null) => void;
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
      title="Categories with more SKUs located only in one location than the other"
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
      title="Categories with more stock in one location than the other"
      ranking="ranked by share of units on hand"
      chart={({ summary: { units } }) => <SplitBar pa={units.PA} nv={units.NV} />}
      note={(item) => {
        const [more, fewer] = lean(item);
        return `${compactNumber.format(Math.abs(item.gap))} more units are in ${more} than in ${fewer}`;
      }}
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

/** A titled row of up to five category cards; a card toggles selection when clicked. */
function CardRow({ id, title, ranking, items, showDepartment, selectedKey, onSelect, chart, note }: CardRowProps) {
  return (
    <section className="highlights" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="highlights__title">
        {title}{' '}
        <span className="muted">
          · {ranking}, at least {MIN_STOCKED_SKUS} stocked
        </span>
      </h2>
      <div className="highlights__cards">
        {items.map((item) => {
          const key = imbalanceKey(item);
          const selected = key === selectedKey;
          return (
            <button
              key={key}
              className={selected ? 'card card--selected' : 'card'}
              aria-pressed={selected}
              onClick={() => onSelect(selected ? null : item)}
            >
              {showDepartment && <span className="card__eyebrow">{item.department}</span>}
              <span className="card__name">{item.category}</span>
              {chart(item)}
              <span className="card__note">{note(item)}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
