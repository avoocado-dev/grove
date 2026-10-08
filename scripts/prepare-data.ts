// Reduces the raw catalog export (~80MB JSONL) to the slim catalog the app loads.
//
//   npm run data                      # reads the first *.jsonl in data/
//   npm run data -- path/to/file.jsonl

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { extractCatalog } from '../src/catalog/extract.ts';
import type { RawProduct } from '../src/catalog/extract.ts';
import { LEVELS } from '../src/catalog/types.ts';

const OUTPUT = 'public/catalog.json';

function resolveInput(): string {
  const arg = process.argv[2];
  if (arg) return arg;
  const jsonl = readdirSync('data').find((f) => f.endsWith('.jsonl'));
  if (!jsonl) throw new Error('No .jsonl file found in data/. Pass a path: npm run data -- <file>');
  return join('data', jsonl);
}

const input = resolveInput();
const rawProducts: RawProduct[] = readFileSync(input, 'utf8')
  .split('\n')
  .filter((line) => line.trim())
  .map((line) => JSON.parse(line));

const catalog = extractCatalog(rawProducts);
const json = JSON.stringify(catalog);
writeFileSync(OUTPUT, json);

// Report what normalization merged, so the cleanup is reviewable rather than silent.
console.log(`Read ${rawProducts.length} products from ${input}`);
console.log(`Wrote ${catalog.skus.length} SKUs to ${OUTPUT} (${(json.length / 1e6).toFixed(2)} MB)`);
for (const level of LEVELS) {
  const rawLabels = new Set<string>();
  for (const product of rawProducts) {
    for (const variant of product.variants ?? []) {
      const value = variant.metafields?.find((m) => m.namespace === 'hierarchy' && m.key === level)?.value;
      if (value) rawLabels.add(value);
    }
  }
  const canonical = new Set(catalog.skus.map((s) => s.hierarchy[level]).filter((l) => l !== null));
  const missing = catalog.skus.filter((s) => s.hierarchy[level] === null).length;
  console.log(`  ${level}: ${rawLabels.size} raw labels -> ${canonical.size} canonical; ${missing} SKUs unassigned`);
}
