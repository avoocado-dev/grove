// How a SKU's raw data is interpreted. Each business rule is a single decision here.

import type { Location, Sku } from './types.ts';

export type Availability = 'BOTH' | 'NV_ONLY' | 'PA_ONLY' | 'NONE';

/**
 * Units on hand are the source of truth for availability (confirmed with the
 * hiring manager); locationInventory.locations is ignored. Zero or negative
 * units means not stocked at that location.
 */
export function availabilityOf(sku: Sku): Availability {
  const nv = sku.quantity.NV > 0;
  const pa = sku.quantity.PA > 0;
  if (nv && pa) return 'BOTH';
  if (nv) return 'NV_ONLY';
  if (pa) return 'PA_ONLY';
  return 'NONE';
}

/** Units on hand at a location; negative quantities count as nothing on hand. */
export function unitsOnHand(sku: Sku, location: Location): number {
  return Math.max(sku.quantity[location], 0);
}

/** Has units on hand in at least one location. */
export function isStocked(sku: Sku): boolean {
  return availabilityOf(sku) !== 'NONE';
}

/**
 * Item types left out of every count:
 * - _service / _otherCharge: virtual goods (e.g. "Protect the Rainforest – 10 acres"), never in a warehouse.
 * - _kit: bundles whose stock is derived from component SKUs, so counting them double-counts.
 */
const EXCLUDED_ITEM_TYPES: ReadonlySet<string> = new Set(['_kit', '_service', '_otherCharge']);

export function isInScope(sku: Sku): boolean {
  return sku.itemType === null || !EXCLUDED_ITEM_TYPES.has(sku.itemType);
}
