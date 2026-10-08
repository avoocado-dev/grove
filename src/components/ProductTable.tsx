import { availabilityOf } from '../catalog/availability.ts';
import type { Availability } from '../catalog/availability.ts';
import type { ProductGroup } from '../catalog/rollup.ts';

const price = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

// Shopify's placeholder titles for single-variant products.
const PLACEHOLDER_TITLES = new Set(['Default', 'Default Title']);

export function ProductTable({ groups }: { groups: ProductGroup[] }) {
  return (
    <table className="products">
      <thead>
        <tr>
          <th>Product / variant</th>
          <th className="num">NV units</th>
          <th className="num">PA units</th>
          <th>Stocked in</th>
          <th className="num">Price</th>
        </tr>
      </thead>
      {groups.map(({ product, skus }) => (
        <tbody key={product.id}>
          <tr className="product-row">
            <th colSpan={5} scope="rowgroup">
              {product.title}
              <span className="muted">
                {' '}
                · {product.vendor || 'Unknown vendor'} · {skus.length} {skus.length === 1 ? 'variant' : 'variants'}
              </span>
            </th>
          </tr>
          {skus.map((sku) => (
            <tr key={sku.id} className="variant-row">
              <td className={PLACEHOLDER_TITLES.has(sku.title) ? 'muted' : undefined}>{sku.title}</td>
              <Units value={sku.quantity.NV} />
              <Units value={sku.quantity.PA} />
              <td>
                <AvailabilityTag availability={availabilityOf(sku)} />
              </td>
              <td className="num">{sku.price === null ? '—' : price.format(sku.price)}</td>
            </tr>
          ))}
        </tbody>
      ))}
    </table>
  );
}

function Units({ value }: { value: number }) {
  return <td className={value > 0 ? 'num' : 'num muted'}>{value.toLocaleString()}</td>;
}

const TAGS: Record<Availability, { label: string; dots: ('nv' | 'pa')[] }> = {
  BOTH: { label: 'Both', dots: ['nv', 'pa'] },
  NV_ONLY: { label: 'NV only', dots: ['nv'] },
  PA_ONLY: { label: 'PA only', dots: ['pa'] },
  NONE: { label: 'Neither', dots: [] },
};

function AvailabilityTag({ availability }: { availability: Availability }) {
  const { label, dots } = TAGS[availability];
  return (
    <span className={availability === 'NONE' ? 'tag muted' : 'tag'}>
      {dots.map((dot) => (
        <span key={dot} className={`swatch swatch--dot fill--${dot}`} />
      ))}
      {label}
    </span>
  );
}
