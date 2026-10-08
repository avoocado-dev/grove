// The slim catalog contract: written by scripts/prepare-data.ts, read by the app.
// It mirrors the source faithfully (nulls stay null, quantities stay raw);
// interpretation — what counts as "available", which SKUs are in scope —
// lives in the domain modules, not here.

export const LOCATIONS = ['NV', 'PA'] as const;
export type Location = (typeof LOCATIONS)[number];

// Drill-down order. Hierarchy is set per variant, so a product's variants can
// sit in different classes.
export const LEVELS = ['department', 'category', 'class'] as const;
export type Level = (typeof LEVELS)[number];

export type Hierarchy = Record<Level, string | null>;

export interface Product {
  id: string;
  title: string;
  vendor: string;
  productType: string;
}

export interface Sku {
  id: string;
  productId: string;
  title: string;
  price: number | null;
  /** metafield.item_type, e.g. "_inventoryItem", "_kit", "_service". */
  itemType: string | null;
  hierarchy: Hierarchy;
  /** Units on hand per location (locationInventory.available_quantities). Can be negative. */
  quantity: Record<Location, number>;
}

export interface Catalog {
  products: Record<string, Product>;
  skus: Sku[];
}
