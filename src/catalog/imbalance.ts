// Ranking categories by how lopsided they are between PA and NV, on a chosen measure.

import { UNASSIGNED, labelAt, summarize } from './rollup.ts';
import type { Summary } from './rollup.ts';
import type { Sku } from './types.ts';

/** Below this many stocked SKUs, a category's share swings too much on one or two SKUs to rank. */
export const MIN_STOCKED_SKUS = 10;

/** What is being compared between the locations, and the total a gap is a share of. */
export type ImbalanceMeasure = (summary: Summary) => { nv: number; pa: number; total: number };

/** SKUs stocked only in NV vs only in PA, as a share of all stocked SKUs. */
export const singleLocationSkus: ImbalanceMeasure = ({ counts, stocked }) => ({
  nv: counts.NV_ONLY,
  pa: counts.PA_ONLY,
  total: stocked,
});

/** Units on hand in NV vs PA, as a share of all units on hand. */
export const unitsOnHandSplit: ImbalanceMeasure = ({ units }) => ({
  nv: units.NV,
  pa: units.PA,
  total: units.NV + units.PA,
});

export interface CategoryImbalance {
  department: string;
  category: string;
  summary: Summary;
  /** NV minus PA on the measure: positive leans NV, negative leans PA. */
  gap: number;
  /** `gap` as a share of the measure's total. */
  share: number;
}

/**
 * The categories among `skus` that differ most between NV and PA on `measure`,
 * as a share of its total, in either direction. Unassigned categories, categories
 * under `minStocked` stocked SKUs, and balanced ones are left out.
 */
export function topCategoryImbalances(
  skus: readonly Sku[],
  measure: ImbalanceMeasure = singleLocationSkus,
  limit = 5,
  minStocked = MIN_STOCKED_SKUS,
): CategoryImbalance[] {
  // Keyed by department and category: the same category name can appear under two departments.
  const groups = new Map<string, { department: string; category: string; skus: Sku[] }>();
  for (const sku of skus) {
    const department = labelAt(sku, 'department');
    const category = labelAt(sku, 'category');
    if (department === UNASSIGNED || category === UNASSIGNED) continue;
    const key = JSON.stringify([department, category]);
    const group = groups.get(key) ?? { department, category, skus: [] };
    group.skus.push(sku);
    groups.set(key, group);
  }

  return [...groups.values()]
    .map(({ department, category, skus: group }) => {
      const summary = summarize(group);
      const { nv, pa, total } = measure(summary);
      const gap = nv - pa;
      return { department, category, summary, gap, share: total > 0 ? gap / total : 0 };
    })
    .filter((c) => c.summary.stocked >= minStocked && c.gap !== 0)
    .sort(
      (a, b) =>
        Math.abs(b.share) - Math.abs(a.share) ||
        Math.abs(b.gap) - Math.abs(a.gap) ||
        a.category.localeCompare(b.category) ||
        a.department.localeCompare(b.department),
    )
    .slice(0, limit);
}

/** Identifies a category across departments (same-named categories can repeat). */
export const imbalanceKey = ({ department, category }: Pick<CategoryImbalance, 'department' | 'category'>) =>
  JSON.stringify([department, category]);
