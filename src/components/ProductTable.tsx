import type { ProductGroup } from '../catalog/rollup.ts';
import type { Sku } from '../catalog/types.ts';
import { DivergingBar, shareOf } from './DivergingBar.tsx';

// Shopify's placeholder titles for single-variant products.
const PLACEHOLDER_TITLES = new Set(['Default', 'Default Title']);

/** "gid://shopify/ProductVariant/50573142393144" -> "50573142393144" */
const shortId = (gid: string) => gid.slice(gid.lastIndexOf('/') + 1);

/** One row per variant, products in title order. */
export function ProductTable({ groups }: { groups: ProductGroup[] }) {
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
        {groups.flatMap(({ product, skus }) =>
          skus.map((sku) => (
            <tr key={sku.id}>
              <td className="product-col">{product.title}</td>
              <td className={PLACEHOLDER_TITLES.has(sku.title) ? 'shrink muted' : 'shrink'}>{sku.title}</td>
              <td className="shrink">{product.vendor}</td>
              <td className="shrink tabular muted">{shortId(sku.id)}</td>
              <td className="diverging-col">
                <UnitsBar sku={sku} />
              </td>
            </tr>
          )),
        )}
      </tbody>
    </table>
  );
}

/** Where this variant's units on hand sit: bar length is each location's share of the total. */
function UnitsBar({ sku }: { sku: Sku }) {
  const { NV, PA } = sku.quantity;
  // Negative quantities count as nothing on hand.
  const total = Math.max(NV, 0) + Math.max(PA, 0);
  return (
    <DivergingBar
      pa={{ value: PA, length: shareOf(Math.max(PA, 0), total) }}
      nv={{ value: NV, length: shareOf(Math.max(NV, 0), total) }}
      title={`${PA} units in PA, ${NV} units in NV`}
    />
  );
}
