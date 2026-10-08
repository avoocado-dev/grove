import type { Sku } from './types.ts';

type SkuOverrides = Partial<Sku> & { nv?: number; pa?: number; path?: (string | null)[] };

/** A SKU for tests: units via `nv`/`pa`, hierarchy via `path` ([department, category, class]). */
export function makeSku(overrides: SkuOverrides = {}): Sku {
  const { nv = 0, pa = 0, path = ['Dept', 'Cat', 'Class'], ...rest } = overrides;
  return {
    id: 'v',
    productId: 'p',
    title: 'Default',
    itemType: '_inventoryItem',
    hierarchy: { department: path[0] ?? null, category: path[1] ?? null, class: path[2] ?? null },
    quantity: { NV: nv, PA: pa },
    ...rest,
  };
}

/** `n` copies of a SKU, for building categories of a given size. */
export function makeSkus(n: number, overrides: SkuOverrides = {}): Sku[] {
  return Array.from({ length: n }, (_, i) => makeSku({ id: `${overrides.id ?? 'v'}-${i}`, ...overrides }));
}
