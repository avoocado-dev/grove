import { describe, expect, it } from 'vitest';
import { topCategoryImbalances } from './imbalance.ts';
import { makeSkus } from './test-helpers.ts';

/** A category with the given NV-only, PA-only, and both-location SKU counts. */
function category(path: (string | null)[], { nvOnly = 0, paOnly = 0, both = 0 }) {
  return [
    ...makeSkus(nvOnly, { path, nv: 1 }),
    ...makeSkus(paOnly, { path, pa: 1 }),
    ...makeSkus(both, { path, nv: 1, pa: 1 }),
  ];
}

describe('topCategoryImbalances', () => {
  it('ranks by gap as a share of stocked SKUs, in both directions', () => {
    const skus = [
      ...category(['Home', 'Big'], { nvOnly: 30, paOnly: 10, both: 160 }), // +20 of 200 = 10%
      ...category(['Home', 'LeansPA'], { paOnly: 8, both: 32 }), // -8 of 40 = 20%
      ...category(['Pet', 'LeansNV'], { nvOnly: 6, both: 24 }), // +6 of 30 = 20%, smaller gap
    ];
    const ranked = topCategoryImbalances(skus, 5, 10);
    expect(ranked.map((c) => [c.category, c.gap])).toEqual([
      ['LeansPA', -8],
      ['LeansNV', 6],
      ['Big', 20],
    ]);
    expect(ranked[0]!.share).toBeCloseTo(-0.2);
  });

  it('leaves out small, balanced, and unassigned categories', () => {
    const skus = [
      ...category(['Home', 'Tiny'], { nvOnly: 5, both: 4 }), // 9 stocked: under the minimum
      ...category(['Home', 'Even'], { nvOnly: 4, paOnly: 4, both: 30 }),
      ...category(['Home', null], { nvOnly: 20, both: 20 }),
      ...category([null, null], { paOnly: 20, both: 20 }),
      ...category(['Home', 'Kept'], { nvOnly: 3, both: 30 }),
    ];
    expect(topCategoryImbalances(skus, 5, 10).map((c) => c.category)).toEqual(['Kept']);
  });

  it('keeps same-named categories in different departments apart', () => {
    const skus = [
      ...category(['Home', 'Gifts'], { nvOnly: 10, both: 20 }),
      ...category(['Baby', 'Gifts'], { paOnly: 10, both: 20 }),
    ];
    expect(topCategoryImbalances(skus, 5, 10).map((c) => [c.department, c.gap])).toEqual([
      ['Baby', -10],
      ['Home', 10],
    ]);
  });

  it('returns at most `limit` categories', () => {
    const skus = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].flatMap((name, i) =>
      category(['Dept', name], { nvOnly: i + 1, both: 20 }),
    );
    expect(topCategoryImbalances(skus, 5, 10)).toHaveLength(5);
  });
});
