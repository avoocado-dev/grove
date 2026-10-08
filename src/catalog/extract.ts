// Raw Shopify export -> slim Catalog. Pure functions; file IO lives in scripts/prepare-data.ts.

import { LEVELS, LOCATIONS } from './types.ts';
import type { Catalog, Hierarchy, Level, Location, Product, Sku } from './types.ts';

interface RawMetafield {
  namespace: string;
  key: string;
  value: string | null;
}

interface RawVariant {
  id: string;
  title: string;
  metafields: RawMetafield[] | null;
}

export interface RawProduct {
  id: string;
  title: string;
  vendor: string | null;
  productType: string | null;
  variants: RawVariant[] | null;
}

function metafield(fields: RawMetafield[] | null, namespace: string, key: string): string | null {
  return fields?.find((m) => m.namespace === namespace && m.key === key)?.value ?? null;
}

/**
 * Parses locationInventory.available_quantities, e.g. '{"NV": 14, "PA": 0}'.
 * Keys other than NV/PA (marketplace channels) are ignored; missing or
 * malformed values become 0. Negative values are kept as-is.
 */
export function parseQuantities(value: string | null): Record<Location, number> {
  const quantity: Record<Location, number> = { NV: 0, PA: 0 };
  if (!value) return quantity;
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return quantity;
  }
  if (typeof parsed !== 'object' || parsed === null) return quantity;
  for (const location of LOCATIONS) {
    const n = (parsed as Record<string, unknown>)[location];
    if (typeof n === 'number' && Number.isFinite(n)) quantity[location] = n;
  }
  return quantity;
}

const normalizeKey = (label: string) => label.trim().replace(/\s+/g, ' ').toLowerCase();

/**
 * Hierarchy labels in the source vary by case and stray whitespace
 * ("Wellness" / "wellness", "Household Care "). Given every raw occurrence,
 * returns a function mapping each raw label to one canonical spelling: the
 * most frequent trimmed form among its case/whitespace-insensitive matches.
 */
export function buildCanonicalizer(occurrences: string[]): (raw: string | null) => string | null {
  const formCounts = new Map<string, Map<string, number>>();
  for (const raw of occurrences) {
    const key = normalizeKey(raw);
    if (!key) continue;
    const form = raw.trim().replace(/\s+/g, ' ');
    const forms = formCounts.get(key) ?? new Map<string, number>();
    forms.set(form, (forms.get(form) ?? 0) + 1);
    formCounts.set(key, forms);
  }

  const canonical = new Map<string, string>();
  for (const [key, forms] of formCounts) {
    // Most frequent wins; ties broken alphabetically so output is deterministic.
    const [best] = [...forms].sort(([a, n], [b, m]) => m - n || a.localeCompare(b));
    canonical.set(key, best![0]);
  }

  return (raw) => (raw === null ? null : (canonical.get(normalizeKey(raw)) ?? null));
}

function rawHierarchy(variant: RawVariant): Hierarchy {
  return {
    department: metafield(variant.metafields, 'hierarchy', 'department'),
    category: metafield(variant.metafields, 'hierarchy', 'category'),
    class: metafield(variant.metafields, 'hierarchy', 'class'),
  };
}

export function extractCatalog(rawProducts: RawProduct[]): Catalog {
  // Pass 1: collect every raw label per level so canonical spellings reflect the whole file.
  const occurrences: Record<Level, string[]> = { department: [], category: [], class: [] };
  for (const product of rawProducts) {
    for (const variant of product.variants ?? []) {
      const hierarchy = rawHierarchy(variant);
      for (const level of LEVELS) {
        const label = hierarchy[level];
        if (label !== null) occurrences[level].push(label);
      }
    }
  }
  const canonicalize = {
    department: buildCanonicalizer(occurrences.department),
    category: buildCanonicalizer(occurrences.category),
    class: buildCanonicalizer(occurrences.class),
  } satisfies Record<Level, unknown>;

  // Pass 2: emit products and SKUs.
  const products: Record<string, Product> = {};
  const skus: Sku[] = [];
  for (const product of rawProducts) {
    products[product.id] = {
      id: product.id,
      title: product.title,
      vendor: product.vendor ?? '',
      productType: product.productType ?? '',
    };
    for (const variant of product.variants ?? []) {
      const raw = rawHierarchy(variant);
      skus.push({
        id: variant.id,
        productId: product.id,
        title: variant.title,
        itemType: metafield(variant.metafields, 'metafield', 'item_type'),
        hierarchy: {
          department: canonicalize.department(raw.department),
          category: canonicalize.category(raw.category),
          class: canonicalize.class(raw.class),
        },
        quantity: parseQuantities(metafield(variant.metafields, 'locationInventory', 'available_quantities')),
      });
    }
  }
  return { products, skus };
}
