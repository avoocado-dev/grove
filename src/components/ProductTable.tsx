import { useEffect, useRef } from 'react';
import { unitsOnHand } from '../catalog/availability.ts';
import { isPlaceholderTitle, shortId } from '../catalog/display.ts';
import type { ProductGroup } from '../catalog/rollup.ts';
import type { Sku } from '../catalog/types.ts';
import { DivergingBar, shareOf } from './DivergingBar.tsx';

interface ProductTableProps {
  groups: ProductGroup[];
  /** Variant rows to emphasize, e.g. a product or SKU picked in search. */
  highlightedSkuIds?: readonly string[];
}

const NONE: readonly string[] = [];

/** One row per variant, products in title order. */
export function ProductTable({ groups, highlightedSkuIds = NONE }: ProductTableProps) {
  const firstHighlighted = useRef<HTMLTableRowElement>(null);
  useEffect(() => {
    firstHighlighted.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [highlightedSkuIds]);

  const rows = groups.flatMap(({ product, skus }) => skus.map((sku) => ({ product, sku })));
  const firstIndex = rows.findIndex(({ sku }) => highlightedSkuIds.includes(sku.id));

  return (
    <table className="products">
      <thead>
        <tr>
          <th className="product-col">Product</th>
          <th className="shrink">Variant</th>
          <th className="shrink">Vendor</th>
          <th className="shrink">ID</th>
          <th className="diverging-col">Stock distribution</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ product, sku }, i) => (
          <tr
            key={sku.id}
            ref={i === firstIndex ? firstHighlighted : undefined}
            className={highlightedSkuIds.includes(sku.id) ? 'highlighted' : undefined}
          >
            <td className="product-col">{product.title}</td>
            <td className={isPlaceholderTitle(sku.title) ? 'shrink muted' : 'shrink'}>{sku.title}</td>
            <td className="shrink">{product.vendor}</td>
            <td className="shrink tabular muted">{shortId(sku.id)}</td>
            <td className="diverging-col">
              <UnitsBar sku={sku} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Where this variant's units on hand sit: bar length is each location's share of the total. */
function UnitsBar({ sku }: { sku: Sku }) {
  const { NV, PA } = sku.quantity;
  const [nv, pa] = [unitsOnHand(sku, 'NV'), unitsOnHand(sku, 'PA')];
  return (
    <DivergingBar
      pa={{ value: PA, length: shareOf(pa, nv + pa) }}
      nv={{ value: NV, length: shareOf(nv, nv + pa) }}
      title={`${PA} units in PA, ${NV} units in NV`}
    />
  );
}
