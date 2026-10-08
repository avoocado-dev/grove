import { describe, expect, it } from 'vitest';
import { availabilityOf, isInScope, isStocked } from './availability.ts';
import { UNASSIGNED, groupByLevel, groupByProduct, skusUnder, summarize } from './rollup.ts';
import { makeSku as sku } from './test-helpers.ts';

describe('availabilityOf', () => {
  it('classifies by units on hand', () => {
    expect(availabilityOf(sku({ nv: 5, pa: 2 }))).toBe('BOTH');
    expect(availabilityOf(sku({ nv: 5, pa: 0 }))).toBe('NV_ONLY');
    expect(availabilityOf(sku({ nv: 0, pa: 1 }))).toBe('PA_ONLY');
    expect(availabilityOf(sku({ nv: 0, pa: 0 }))).toBe('NONE');
  });

  it('treats negative units as not stocked', () => {
    expect(availabilityOf(sku({ nv: -34, pa: 5 }))).toBe('PA_ONLY');
  });
});

describe('isStocked', () => {
  it('is true when any location has units', () => {
    expect(isStocked(sku({ nv: 3 }))).toBe(true);
    expect(isStocked(sku({ pa: 1 }))).toBe(true);
    expect(isStocked(sku({ nv: 0, pa: 0 }))).toBe(false);
    expect(isStocked(sku({ nv: -5, pa: 0 }))).toBe(false);
  });
});

describe('isInScope', () => {
  it('excludes kits and virtual goods, keeps physical and untyped SKUs', () => {
    expect(isInScope(sku({ itemType: '_inventoryItem' }))).toBe(true);
    expect(isInScope(sku({ itemType: '_assembly' }))).toBe(true);
    expect(isInScope(sku({ itemType: null }))).toBe(true);
    expect(isInScope(sku({ itemType: '_kit' }))).toBe(false);
    expect(isInScope(sku({ itemType: '_service' }))).toBe(false);
    expect(isInScope(sku({ itemType: '_otherCharge' }))).toBe(false);
  });
});

describe('summarize', () => {
  it('counts each availability bucket and derives stocked', () => {
    const summary = summarize([sku({ nv: 1, pa: 1 }), sku({ nv: 1 }), sku({ nv: 1 }), sku({ pa: 1 }), sku()]);
    expect(summary).toEqual({
      counts: { BOTH: 1, NV_ONLY: 2, PA_ONLY: 1, NONE: 1 },
      stocked: 4,
      total: 5,
      units: { NV: 3, PA: 2 },
    });
  });

  it('sums units on hand per location, ignoring negative quantities', () => {
    const summary = summarize([sku({ nv: 40, pa: 10 }), sku({ nv: -34, pa: 5 }), sku({ nv: 2 })]);
    expect(summary.units).toEqual({ NV: 42, PA: 15 });
  });
});

describe('hierarchy rollup', () => {
  const skus = [
    sku({ id: 'a', nv: 1, path: ['Pet', 'Dog', 'Treats'] }),
    sku({ id: 'b', pa: 1, path: ['Pet', 'Dog', 'Toys'] }),
    sku({ id: 'c', nv: 1, pa: 1, path: ['Pet', 'Cat', 'Litter'] }),
    sku({ id: 'd', nv: 1, path: ['Baby', null, null] }),
    sku({ id: 'e', path: [null, null, null] }),
  ];

  it('groups by level with missing values bucketed as unassigned', () => {
    const rows = groupByLevel(skus, 'department');
    expect(rows.map((r) => [r.label, r.summary.total])).toEqual([
      ['Pet', 3],
      ['Baby', 1],
      [UNASSIGNED, 1],
    ]);
  });

  it('filters to SKUs under a drill path, including through unassigned levels', () => {
    expect(skusUnder(skus, []).map((s) => s.id)).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(skusUnder(skus, ['Pet', 'Dog']).map((s) => s.id)).toEqual(['a', 'b']);
    expect(skusUnder(skus, ['Baby', UNASSIGNED]).map((s) => s.id)).toEqual(['d']);
  });

  it('group totals reconcile with the parent summary', () => {
    const pet = skusUnder(skus, ['Pet']);
    const rows = groupByLevel(pet, 'category');
    const sumStocked = rows.reduce((n, r) => n + r.summary.stocked, 0);
    expect(sumStocked).toBe(summarize(pet).stocked);
  });

  it('groups SKUs by product, sorted by title', () => {
    const products = {
      p1: { id: 'p1', title: 'Zebra Shampoo', vendor: '', productType: '' },
      p2: { id: 'p2', title: 'Apple Soap', vendor: '', productType: '' },
    };
    const groups = groupByProduct(
      [sku({ id: 'a', productId: 'p1' }), sku({ id: 'b', productId: 'p2' }), sku({ id: 'c', productId: 'p1' })],
      products,
    );
    expect(groups.map((g) => [g.product.title, g.skus.map((s) => s.id)])).toEqual([
      ['Apple Soap', ['b']],
      ['Zebra Shampoo', ['a', 'c']],
    ]);
  });
});
