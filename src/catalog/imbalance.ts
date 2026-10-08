// Ranking categories by how lopsided their single-location stock is.

import { UNASSIGNED, labelAt, summarize } from './rollup.ts';
import type { Summary } from './rollup.ts';
import type { Sku } from './types.ts';

/** Below this many stocked SKUs, a category's share swings too much on one or two SKUs to rank. */
export const MIN_STOCKED_SKUS = 10;

export interface CategoryImbalance {
  department: string;
  category: string;
  summary: Summary;
  /** NV-only minus PA-only SKUs: positive leans NV, negative leans PA. */
  gap: number;
  /** `gap` as a share of the category's stocked SKUs. */
  share: number;
}

/**
 * The categories among `skus` whose NV-only and PA-only counts differ most as a
 * share of stocked SKUs, in either direction. Unassigned categories, categories
 * under `minStocked`, and balanced ones are left out.
 */
export function topCategoryImbalances(
  skus: readonly Sku[],
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
      const gap = summary.counts.NV_ONLY - summary.counts.PA_ONLY;
      return { department, category, summary, gap, share: summary.stocked > 0 ? gap / summary.stocked : 0 };
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

/** Identifies a category across departments, e.g. for tracking the selected card. */
export const imbalanceKey = ({ department, category }: CategoryImbalance) => JSON.stringify([department, category]);
