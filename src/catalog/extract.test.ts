import { describe, expect, it } from 'vitest';
import { buildCanonicalizer, extractCatalog, parseQuantities } from './extract.ts';
import type { RawProduct } from './extract.ts';

describe('parseQuantities', () => {
  it('reads NV and PA units', () => {
    expect(parseQuantities('{"NV": 14, "PA": 0}')).toEqual({ NV: 14, PA: 0 });
  });

  it('ignores non-warehouse keys and keeps negatives', () => {
    expect(parseQuantities('{"NV": -34, "PA": 5, "Pure Over via Shopify Collective": 99}')).toEqual({ NV: -34, PA: 5 });
  });

  it('treats missing, malformed, or non-numeric values as 0', () => {
    expect(parseQuantities(null)).toEqual({ NV: 0, PA: 0 });
    expect(parseQuantities('not json')).toEqual({ NV: 0, PA: 0 });
    expect(parseQuantities('{"NV": "12"}')).toEqual({ NV: 0, PA: 0 });
  });
});

describe('buildCanonicalizer', () => {
  it('merges case and whitespace variants into the most frequent spelling', () => {
    const canonical = buildCanonicalizer(['Wellness', 'Wellness', 'wellness', 'Wellness ', 'Kitchen  &  Pantry']);
    expect(canonical('wellness')).toBe('Wellness');
    expect(canonical('WELLNESS ')).toBe('Wellness');
    expect(canonical('Kitchen & Pantry')).toBe('Kitchen & Pantry');
  });

  it('maps null and blank labels to null', () => {
    const canonical = buildCanonicalizer(['Beauty', '   ']);
    expect(canonical(null)).toBeNull();
    expect(canonical('   ')).toBeNull();
  });
});

describe('extractCatalog', () => {
  const hierarchy = (department: string, category: string, cls: string) => [
    { namespace: 'hierarchy', key: 'department', value: department },
    { namespace: 'hierarchy', key: 'category', value: category },
    { namespace: 'hierarchy', key: 'class', value: cls },
  ];

  it('flattens variants into SKUs with canonical hierarchy and parsed quantities', () => {
    const raw: RawProduct[] = [
      {
        id: 'p1',
        title: 'Dish Soap',
        vendor: 'Acme',
        productType: 'Soap',
        variants: [
          {
            id: 'v1',
            title: 'Refill',
            price: '6.99',
            metafields: [
              ...hierarchy('Dish Care', 'Dishwashing', 'Dish Soap Refills'),
              { namespace: 'metafield', key: 'item_type', value: '_inventoryItem' },
              { namespace: 'locationInventory', key: 'available_quantities', value: '{"NV": 3, "PA": 0}' },
            ],
          },
          { id: 'v2', title: 'Bottle', price: null, metafields: hierarchy('Dish Care ', 'Dishwashing', 'Dish Soap') },
          { id: 'v3', title: 'Loose', price: '1', metafields: null },
        ],
      },
    ];

    const { products, skus } = extractCatalog(raw);

    expect(products.p1).toEqual({ id: 'p1', title: 'Dish Soap', vendor: 'Acme', productType: 'Soap' });
    expect(skus).toHaveLength(3);
    expect(skus[0]).toEqual({
      id: 'v1',
      productId: 'p1',
      title: 'Refill',
      price: 6.99,
      itemType: '_inventoryItem',
      hierarchy: { department: 'Dish Care', category: 'Dishwashing', class: 'Dish Soap Refills' },
      quantity: { NV: 3, PA: 0 },
    });
    expect(skus[1]!.hierarchy.department).toBe('Dish Care');
    expect(skus[1]!.price).toBeNull();
    expect(skus[2]!.hierarchy).toEqual({ department: null, category: null, class: null });
  });
});
