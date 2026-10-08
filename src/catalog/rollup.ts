// Aggregating SKUs up the department > category > class hierarchy.

import { availabilityOf } from './availability.ts';
import type { Availability } from './availability.ts';
import { LEVELS } from './types.ts';
import type { Level, Product, Sku } from './types.ts';

/** Label for SKUs missing a hierarchy value, so they stay visible and totals reconcile. */
export const UNASSIGNED = '(Unassigned)';

/** Labels selected so far, outermost first: [] = all, [dept], [dept, category], [dept, category, class]. */
export type DrillPath = readonly string[];

export interface Summary {
  counts: Record<Availability, number>;
  /** SKUs with units in at least one location. */
  stocked: number;
  total: number;
}

export interface GroupRow {
  label: string;
  summary: Summary;
}

export interface ProductGroup {
  product: Product;
  skus: Sku[];
}

export function labelAt(sku: Sku, level: Level): string {
  return sku.hierarchy[level] ?? UNASSIGNED;
}

export function skusUnder(skus: readonly Sku[], path: DrillPath): Sku[] {
  return skus.filter((sku) => path.every((label, i) => labelAt(sku, LEVELS[i]!) === label));
}

export function summarize(skus: readonly Sku[]): Summary {
  const counts: Record<Availability, number> = { BOTH: 0, NV_ONLY: 0, PA_ONLY: 0, NONE: 0 };
  for (const sku of skus) counts[availabilityOf(sku)]++;
  return { counts, stocked: skus.length - counts.NONE, total: skus.length };
}

/** One row per distinct label at `level`, in first-seen order (sorting is a view concern). */
export function groupByLevel(skus: readonly Sku[], level: Level): GroupRow[] {
  const groups = new Map<string, Sku[]>();
  for (const sku of skus) {
    const label = labelAt(sku, level);
    const group = groups.get(label);
    if (group) group.push(sku);
    else groups.set(label, [sku]);
  }
  return [...groups].map(([label, group]) => ({ label, summary: summarize(group) }));
}

/** Groups SKUs by product, sorted by product title. Only the given SKUs are included. */
export function groupByProduct(skus: readonly Sku[], products: Record<string, Product>): ProductGroup[] {
  const groups = new Map<string, Sku[]>();
  for (const sku of skus) {
    const group = groups.get(sku.productId);
    if (group) group.push(sku);
    else groups.set(sku.productId, [sku]);
  }
  return [...groups]
    .map(([id, group]) => ({ product: products[id]!, skus: group }))
    .sort((a, b) => a.product.title.localeCompare(b.product.title));
}
