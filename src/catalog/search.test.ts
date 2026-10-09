import { describe, expect, it } from 'vitest';
import { buildSearchIndex, search } from './search.ts';
import { makeSku } from './test-helpers.ts';

const products = {
  p1: { id: 'p1', title: 'Bonding Shampoo', vendor: 'Acure', productType: 'Shampoo' },
  p2: { id: 'p2', title: 'Super Shine Dish Soap', vendor: 'Grove Co.', productType: 'Dish Soap' },
};

const skus = [
  makeSku({ id: 'gid://shopify/ProductVariant/111', productId: 'p1', title: 'Default', path: ['Personal Care', 'Hair Care', 'Shampoo'], nv: 3 }),
  makeSku({ id: 'gid://shopify/ProductVariant/222', productId: 'p2', title: 'Lavender', path: ['Dish Care', 'Dishwashing', 'Dish Soap'], pa: 2 }),
  makeSku({ id: 'gid://shopify/ProductVariant/333', productId: 'p2', title: 'Refill', path: ['Dish Care', 'Dishwashing', 'Dish Soap Refills'], nv: 1 }),
  makeSku({ id: 'gid://shopify/ProductVariant/444', productId: 'p2', title: 'Retired', path: ['Dish Care', 'Dishwashing', 'Dish Soap'] }),
  makeSku({ id: 'gid://shopify/ProductVariant/555', productId: 'p1', path: [null, null, null], nv: 1 }),
];
const index = buildSearchIndex(skus, products);
const find = (query: string) => search(index, query).map((r) => [r.kind, r.label]);

describe('search', () => {
  it('finds hierarchy levels, pointing at the view whose row to highlight', () => {
    expect(search(index, 'hair care')).toEqual([
      { kind: 'category', label: 'Hair Care', context: 'Personal Care', path: ['Personal Care'], rowLabel: 'Hair Care' },
    ]);
    expect(search(index, 'shampoo')[0]).toMatchObject({ kind: 'class', path: ['Personal Care', 'Hair Care'], rowLabel: 'Shampoo' });
  });

  it('orders hierarchy before products before SKUs, prefix matches first', () => {
    expect(find('dish')).toEqual([
      ['department', 'Dish Care'],
      ['category', 'Dishwashing'],
      ['class', 'Dish Soap'],
      ['class', 'Dish Soap Refills'],
      ['product', 'Super Shine Dish Soap'],
      ['product', 'Super Shine Dish Soap'],
    ]);
  });

  it('gives a product spanning classes one result per class, with its stocked SKUs there', () => {
    const results = search(index, 'super shine');
    expect(results.map((r) => [r.path, r.skuIds])).toEqual([
      [['Dish Care', 'Dishwashing', 'Dish Soap'], ['gid://shopify/ProductVariant/222']],
      [['Dish Care', 'Dishwashing', 'Dish Soap Refills'], ['gid://shopify/ProductVariant/333']],
    ]);
  });

  it('finds products by vendor and SKUs by ID or variant name', () => {
    expect(find('acure')).toEqual([['product', 'Bonding Shampoo'], ['product', 'Bonding Shampoo']]);
    expect(find('222')).toEqual([['sku', 'Super Shine Dish Soap – Lavender']]);
    expect(find('lavender')).toEqual([['sku', 'Super Shine Dish Soap – Lavender']]);
  });

  it('matches every word in any order, ignoring case', () => {
    expect(find('SOAP refills')).toContainEqual(['class', 'Dish Soap Refills']);
    expect(find('refills soap')).toContainEqual(['class', 'Dish Soap Refills']);
  });

  it('leaves out unstocked SKUs, unassigned levels, and queries under 2 characters', () => {
    expect(find('444')).toEqual([]);
    expect(find('retired')).toEqual([]);
    expect(find('unassigned')).toEqual([]);
    expect(find('d')).toEqual([]);
  });

  it('caps results per kind', () => {
    expect(search(index, 'dish', 1).map((r) => r.kind)).toEqual(['department', 'category', 'class', 'product']);
  });
});
