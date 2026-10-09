import { useMemo, useState } from 'react';
import { isInScope, isStocked } from './catalog/availability.ts';
import { imbalanceKey, singleLocationSkus, topCategoryImbalances, unitsOnHandSplit } from './catalog/imbalance.ts';
import type { CategoryImbalance } from './catalog/imbalance.ts';
import { groupByLevel, groupByProduct, skusUnder } from './catalog/rollup.ts';
import { LEVELS } from './catalog/types.ts';
import type { Catalog } from './catalog/types.ts';
import { Breadcrumbs } from './components/Breadcrumbs.tsx';
import { BreakdownTable } from './components/BreakdownTable.tsx';
import { DivergingLegend } from './components/DivergingBar.tsx';
import { SkuImbalanceCards, StockImbalanceCards } from './components/ImbalanceCards.tsx';
import { ProductTable } from './components/ProductTable.tsx';
import { useCatalog } from './useCatalog.ts';
import { useDrillPath } from './useDrillPath.ts';

export function App() {
  const state = useCatalog();
  return (
    <main>
      {state.status === 'loading' && <p className="muted">Loading catalog…</p>}
      {state.status === 'error' && <p role="alert">{state.message}</p>}
      {state.status === 'ready' && <Explorer catalog={state.catalog} />}
    </main>
  );
}

function Explorer({ catalog }: { catalog: Catalog }) {
  const [path, navigate] = useDrillPath();
  const inScope = useMemo(() => catalog.skus.filter(isInScope), [catalog]);
  const skus = useMemo(() => skusUnder(inScope, path), [inScope, path]);
  const level = LEVELS[path.length];
  // The product view lists only stocked variants, so its rows match the "Stocked SKUs" count it was opened from.
  const productSkus = level ? [] : skus.filter(isStocked);
  const isEmpty = level ? skus.length === 0 : productSkus.length === 0;
  // Category highlights: catalog-wide on All departments, within the department once inside one.
  const showHighlights = path.length < 2;
  const skuHighlights = useMemo(
    () => (showHighlights ? topCategoryImbalances(skus, singleLocationSkus) : []),
    [showHighlights, skus],
  );
  const stockHighlights = useMemo(
    () => (showHighlights ? topCategoryImbalances(skus, unitsOnHandSplit) : []),
    [showHighlights, skus],
  );
  const atTop = path.length === 0;

  // The selected card is remembered with the view it was picked on, so it clears when you navigate.
  const [selection, setSelection] = useState<{ view: string; item: CategoryImbalance } | null>(null);
  const view = JSON.stringify(path);
  const selected = selection?.view === view ? selection.item : null;
  const highlightedLabel = selected?.category ?? null;

  // Both card rows share one selection: a card in either highlights its category's row.
  const cardProps = {
    showDepartment: atTop,
    selectedKey: selected && imbalanceKey(selected),
    onSelect: (item: CategoryImbalance | null) => {
      if (!item) return setSelection(null);
      // On All departments the table rows aren't categories, so open the category's
      // department and highlight its row there; inside a department, highlight in place.
      const target = atTop ? [item.department] : path;
      setSelection({ view: JSON.stringify(target), item });
      if (atTop) navigate(target);
    },
  };

  return (
    <>
      <div className="toolbar">
        <Breadcrumbs path={path} onNavigate={navigate} />
        {!isEmpty && <DivergingLegend />}
      </div>
      {skuHighlights.length > 0 && <SkuImbalanceCards items={skuHighlights} {...cardProps} />}
      {stockHighlights.length > 0 && <StockImbalanceCards items={stockHighlights} {...cardProps} />}
      {isEmpty ? (
        <p className="muted">{level ? 'No SKUs here.' : 'No stocked variants here.'}</p>
      ) : level ? (
        <BreakdownTable
          level={level}
          rows={groupByLevel(skus, level)}
          highlightedLabel={highlightedLabel}
          onSelect={(label) => navigate([...path, label])}
        />
      ) : (
        <ProductTable groups={groupByProduct(productSkus, catalog.products)} />
      )}
    </>
  );
}
