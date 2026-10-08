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
        Largest NV / PA imbalances{' '}
        <span className="muted">
          · by share of stocked SKUs, categories with at least {MIN_STOCKED_SKUS} stocked SKUs
        </span>
      </h2>
      <div className="highlights__cards">
        {items.map((item) => {
          const { counts, stocked } = item.summary;
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
              <DivergingBar
                pa={{ value: counts.PA_ONLY, length: scale(shareOf(counts.PA_ONLY, stocked)) }}
                nv={{ value: counts.NV_ONLY, length: scale(shareOf(counts.NV_ONLY, stocked)) }}
                title={`${counts.PA_ONLY} only in PA, ${counts.NV_ONLY} only in NV, of ${stocked} stocked SKUs`}
              />
              <span className="card__note">
                {Math.abs(item.gap)} more only in {item.gap > 0 ? 'NV' : 'PA'}
                <span className="muted">
                  {Math.round(Math.abs(item.share) * 100)}% of {stocked} stocked
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
