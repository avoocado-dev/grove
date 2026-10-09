// Finding anything in the catalog by name or ID, and where in the drill-down it lives.

import { isStocked } from './availability.ts';
import { isPlaceholderTitle, shortId } from './display.ts';
import { UNASSIGNED, labelAt } from './rollup.ts';
import type { DrillPath } from './rollup.ts';
import type { Product, Sku } from './types.ts';

export type SearchKind = 'department' | 'category' | 'class' | 'product' | 'sku';

export interface SearchResult {
  kind: SearchKind;
  label: string;
  /** Where it sits, e.g. "Personal Care › Hair Care". */
  context: string;
  /** The view that lists it. */
  path: DrillPath;
  /** Breakdown-table row to highlight in that view (department, category, and class results). */
  rowLabel?: string;
  /** Product-view rows to highlight in that view (product and SKU results). */
  skuIds?: string[];
}

export interface SearchEntry extends SearchResult {
  /** Normalized text a query is matched against. */
  terms: string;
}

const KIND_ORDER: Record<SearchKind, number> = { department: 0, category: 1, class: 2, product: 3, sku: 4 };

const normalize = (text: string) => text.toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * One entry per department, category, and class, per product within each class
 * it appears in, and per SKU. Products and SKUs come only from stocked SKUs,
 * since those are the rows the product view lists.
 */
export function buildSearchIndex(skus: readonly Sku[], products: Record<string, Product>): SearchEntry[] {
  const entries = new Map<string, SearchEntry>();
  const add = (key: string, entry: SearchResult, terms: string) => {
    if (!entries.has(key)) entries.set(key, { ...entry, terms: normalize(terms) });
  };

  for (const sku of skus) {
    const [department, category, cls] = [labelAt(sku, 'department'), labelAt(sku, 'category'), labelAt(sku, 'class')];
    const assigned = [department, category, cls].map((label) => label !== UNASSIGNED);
    if (assigned[0]) {
      add(JSON.stringify([department]), { kind: 'department', label: department, context: 'Department', path: [], rowLabel: department }, department);
    }
    if (assigned[0] && assigned[1]) {
      add(JSON.stringify([department, category]), { kind: 'category', label: category, context: department, path: [department], rowLabel: category }, category);
    }
    if (assigned.every(Boolean)) {
      add(
        JSON.stringify([department, category, cls]),
        { kind: 'class', label: cls, context: `${department} › ${category}`, path: [department, category], rowLabel: cls },
        cls,
      );
    }

    if (!isStocked(sku)) continue;
    const product = products[sku.productId]!;
    const path = [department, category, cls];
    const where = path.join(' › ');

    // A product whose variants span classes gets an entry per class.
    const productKey = JSON.stringify(['product', product.id, ...path]);
    const existing = entries.get(productKey);
    if (existing) existing.skuIds!.push(sku.id);
    else {
      add(
        productKey,
        { kind: 'product', label: product.title, context: product.vendor ? `${product.vendor} · ${where}` : where, path, skuIds: [sku.id] },
        `${product.title} ${product.vendor}`,
      );
    }

    // SKUs match on ID and variant name; their product title is already searchable above.
    const variant = isPlaceholderTitle(sku.title) ? '' : sku.title;
    add(
      JSON.stringify(['sku', sku.id]),
      { kind: 'sku', label: variant ? `${product.title} – ${variant}` : product.title, context: `SKU ${shortId(sku.id)} · ${where}`, path, skuIds: [sku.id] },
      `${shortId(sku.id)} ${variant}`,
    );
  }
  return [...entries.values()];
}

/**
 * Entries containing every word of `query`, hierarchy before products before SKUs,
 * names starting with the query first, at most `perKind` of each kind.
 */
export function search(index: readonly SearchEntry[], query: string, perKind = 4): SearchResult[] {
  const q = normalize(query);
  if (q.length < 2) return [];
  const words = q.split(' ');
  const startsWithQuery = (entry: SearchEntry) => (normalize(entry.label).startsWith(q) ? 0 : 1);

  const shown: Partial<Record<SearchKind, number>> = {};
  return index
    .filter((entry) => words.every((word) => entry.terms.includes(word)))
    .sort(
      (a, b) =>
        KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
        startsWithQuery(a) - startsWithQuery(b) ||
        a.label.localeCompare(b.label),
    )
    .filter((entry) => (shown[entry.kind] = (shown[entry.kind] ?? 0) + 1) <= perKind)
    .map(({ terms: _terms, ...result }) => result);
}
