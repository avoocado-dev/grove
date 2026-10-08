import { MIN_STOCKED_SKUS, imbalanceKey } from '../catalog/imbalance.ts';
import type { CategoryImbalance } from '../catalog/imbalance.ts';
import { DivergingBar, shareOf } from './DivergingBar.tsx';

interface ImbalanceCardsProps {
  items: CategoryImbalance[];
  /** Name each card's department; redundant once you're inside one. */
  showDepartment: boolean;
  /** imbalanceKey of the selected card, if any. */
  selectedKey: string | null;
  /** Called with the clicked card; clicking the selected card again calls it with null. */
  onSelect: (item: CategoryImbalance | null) => void;
}

/** The most imbalanced categories in view, one card each. */
export function ImbalanceCards({ items, showDepartment, selectedKey, onSelect }: ImbalanceCardsProps) {
  // Bars share one scale across the cards, like the table rows do.
  const scaleMax = Math.max(
    ...items.flatMap(({ summary: { counts, stocked } }) => [
      shareOf(counts.NV_ONLY, stocked),
      shareOf(counts.PA_ONLY, stocked),
    ]),
  );
  const scale = (share: number) => (scaleMax > 0 ? share / scaleMax : 0);

  return (
    <section className="highlights" aria-labelledby="highlights-title">
      <h2 id="highlights-title" className="highlights__title">
        Categories with more SKUs located only in one location than the other{' '}
        <span className="muted">
          · ranked by share of stocked SKUs, at least {MIN_STOCKED_SKUS} stocked
        </span>
      </h2>
      <div className="highlights__cards">
        {items.map((item) => {
          const { counts, stocked } = item.summary;
          const key = imbalanceKey(item);
          const selected = key === selectedKey;
          const [more, fewer] = item.gap > 0 ? ['NV', 'PA'] : ['PA', 'NV'];
          return (
            <button
              key={key}
              className={selected ? 'card card--selected' : 'card'}
              aria-pressed={selected}
              onClick={() => onSelect(selected ? null : item)}
            >
              {showDepartment && <span className="card__eyebrow">{item.department}</span>}
              <span className="card__name">{item.category}</span>
              <DivergingBar
                pa={{ value: counts.PA_ONLY, length: scale(shareOf(counts.PA_ONLY, stocked)) }}
                nv={{ value: counts.NV_ONLY, length: scale(shareOf(counts.NV_ONLY, stocked)) }}
                title={`${counts.PA_ONLY} only in PA, ${counts.NV_ONLY} only in NV, of ${stocked} stocked SKUs`}
              />
              <span className="card__note">
                {Math.abs(item.gap)} more SKUs are located only in {more} than only in {fewer}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
