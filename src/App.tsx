import { useMemo } from 'react';
import { EXCLUDED_ITEM_TYPES, isInScope } from './catalog/availability.ts';
import { groupByLevel, groupByProduct, skusUnder } from './catalog/rollup.ts';
import { LEVELS } from './catalog/types.ts';
import type { Catalog } from './catalog/types.ts';
import { Breadcrumbs } from './components/Breadcrumbs.tsx';
import { BreakdownTable } from './components/BreakdownTable.tsx';
import { DivergingLegend } from './components/DivergingBar.tsx';
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

  return (
    <>
      <div className="toolbar">
        <Breadcrumbs path={path} onNavigate={navigate} />
        {level && skus.length > 0 && <DivergingLegend />}
      </div>
      {skus.length === 0 ? (
        <p className="muted">No SKUs here.</p>
      ) : level ? (
        <BreakdownTable
          level={level}
          rows={groupByLevel(skus, level)}
          onSelect={(label) => navigate([...path, label])}
        />
      ) : (
        <ProductTable groups={groupByProduct(skus, catalog.products)} />
      )}
      <p className="footnote muted">
        Stocked = more than 0 units on hand. Bar length = share of the row's stocked SKUs. Excludes {catalog.skus.length - inScope.length} kit and virtual SKUs (
        {[...EXCLUDED_ITEM_TYPES].join(', ')}).
      </p>
    </>
  );
}
