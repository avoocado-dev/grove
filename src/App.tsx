import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { isInScope, isStocked } from './catalog/availability.ts';
import { singleLocationSkus, topCategoryImbalances, unitsOnHandSplit } from './catalog/imbalance.ts';
import type { CategoryImbalance } from './catalog/imbalance.ts';
import { groupByLevel, groupByProduct, skusUnder } from './catalog/rollup.ts';
import type { DrillPath } from './catalog/rollup.ts';
import { buildSearchIndex } from './catalog/search.ts';
import { LEVELS } from './catalog/types.ts';
import type { Catalog } from './catalog/types.ts';
import { Breadcrumbs } from './components/Breadcrumbs.tsx';
import { BreakdownTable } from './components/BreakdownTable.tsx';
import { DivergingLegend } from './components/DivergingBar.tsx';
import { SkuImbalanceCards, StockImbalanceCards } from './components/ImbalanceCards.tsx';
import { ProductTable } from './components/ProductTable.tsx';
import { SearchBox } from './components/SearchBox.tsx';
import { useCatalog } from './useCatalog.ts';
import { useDrillPath } from './useDrillPath.ts';

export function App() {
  const state = useCatalog();
  return (
    <main>
      {state.status === 'ready' ? (
        <Explorer catalog={state.catalog} />
      ) : (
        <>
          <PageHeader />
          {state.status === 'loading' ? <p className="muted">Loading catalog…</p> : <p role="alert">{state.message}</p>}
        </>
      )}
    </main>
  );
}

function PageHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="page-header">
      <h1 className="page-title">SKU Availability</h1>
      {children}
    </header>
  );
}

/** What's emphasized in a view: a breakdown row or product-view rows. */
interface Highlight {
  /** The view it applies to (a serialized drill path), so it clears when you navigate away. */
  view: string;
  rowLabel?: string;
  skuIds?: string[];
}

function Explorer({ catalog }: { catalog: Catalog }) {
  const [path, navigate] = useDrillPath();
  const inScope = useMemo(() => catalog.skus.filter(isInScope), [catalog]);
  const searchIndex = useMemo(() => buildSearchIndex(inScope, catalog.products), [inScope, catalog]);
  const skus = useMemo(() => skusUnder(inScope, path), [inScope, path]);
  const level = LEVELS[path.length];
  // The product view lists only stocked variants, so its rows match the "Stocked SKUs" count it was opened from.
  const productSkus = level ? [] : skus.filter(isStocked);
  const isEmpty = level ? skus.length === 0 : productSkus.length === 0;
  // "Needs attention" cards rank categories catalog-wide, so they show on All departments only.
  const showHighlights = path.length === 0;
  const skuHighlights = useMemo(
    () => (showHighlights ? topCategoryImbalances(skus, singleLocationSkus) : []),
    [showHighlights, skus],
  );
  const stockHighlights = useMemo(
    () => (showHighlights ? topCategoryImbalances(skus, unitsOnHandSplit) : []),
    [showHighlights, skus],
  );

  const [highlight, setHighlight] = useState<Highlight | null>(null);
  const view = JSON.stringify(path);
  const active = highlight?.view === view ? highlight : null;

  /** Highlights something in the view that lists it, opening that view if it isn't the current one. */
  const showInView = (target: DrillPath, emphasis: Omit<Highlight, 'view'>) => {
    setHighlight({ view: JSON.stringify(target), ...emphasis });
    if (JSON.stringify(target) !== view) navigate(target);
  };

  // The table here lists departments, so a card opens its category's department and highlights it there.
  const openCategory = (item: CategoryImbalance) => showInView([item.department], { rowLabel: item.category });

  return (
    <>
      <PageHeader>
        <SearchBox
          index={searchIndex}
          onSelect={(result) => showInView(result.path, { rowLabel: result.rowLabel, skuIds: result.skuIds })}
        />
      </PageHeader>
      {(skuHighlights.length > 0 || stockHighlights.length > 0) && (
        <section className="insights" aria-labelledby="insights-title">
          <h2 id="insights-title" className="insights__title">
            Needs attention
          </h2>
          {skuHighlights.length > 0 && <SkuImbalanceCards items={skuHighlights} onSelect={openCategory} />}
          {stockHighlights.length > 0 && <StockImbalanceCards items={stockHighlights} onSelect={openCategory} />}
        </section>
      )}
      <div className="toolbar">
        <Breadcrumbs path={path} onNavigate={navigate} />
        {!isEmpty && <DivergingLegend />}
      </div>
      {isEmpty ? (
        <p className="muted">{level ? 'No SKUs here.' : 'No stocked variants here.'}</p>
      ) : level ? (
        <BreakdownTable
          level={level}
          rows={groupByLevel(skus, level)}
          highlightedLabel={active?.rowLabel ?? null}
          onSelect={(label) => navigate([...path, label])}
        />
      ) : (
        <ProductTable groups={groupByProduct(productSkus, catalog.products)} highlightedSkuIds={active?.skuIds} />
      )}
    </>
  );
}
