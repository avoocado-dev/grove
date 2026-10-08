# PA / NV Availability

A drill-down table for finding where stock diverges between the Pennsylvania and Nevada warehouses:
**Department → Category → Class → Products (with variants)**. The product level lists one row per variant
(product, variant, vendor, ID) with a bar showing how its units split between the two warehouses.

Each hierarchy level shows **Stocked SKUs**, **Stocked in Both**, and **Stocked only in NV or PA**. The last
column is a diverging bar: PA-only grows left from the centre and NV-only grows right, each with its count at the tip.
Bar length is the share of the row's stocked SKUs, so a lopsided small category stands out as clearly as a
lopsided large one. Because the counts are printed in the table, it also works as the accessible text version
of the chart.

Cards above the table surface the **5 most imbalanced categories**: across the whole catalog on All departments,
and within the department once you're inside one. They're ranked by |NV-only − PA-only| ÷ stocked SKUs, counting
only categories with at least 10 stocked SKUs so a one- or two-SKU difference can't top the list. Clicking a card
highlights the category's row: on All departments it first opens the category's department; inside a department it
highlights in place (click again to clear).

## Running it

Requires Node ≥ 23.6 (runs the TypeScript data script natively).

```sh
npm install
# put the catalog export (*.jsonl) in data/, then:
npm run data      # data/*.jsonl (~80MB) -> public/catalog.json (~3.7MB, ~430KB gzipped)
npm run dev
npm test
```

Neither the raw export nor the generated `public/catalog.json` is committed, because the data is confidential.

## How it's put together

```
data/*.jsonl ──► scripts/prepare-data.ts ──► public/catalog.json ──► app (fetch once, aggregate in memory)
                 (IO only; logic in                (slim, faithful
                  src/catalog/extract.ts)           to source)
```

| Module | Responsibility |
|---|---|
| `src/catalog/types.ts` | The slim catalog contract shared by the script and the app |
| `src/catalog/extract.ts` | Raw Shopify JSON → slim catalog: pulls the metafields we need and normalizes hierarchy labels |
| `src/catalog/availability.ts` | **Business rules**: what "available" means and which SKUs are in scope |
| `src/catalog/rollup.ts` | Pure aggregation: filter by drill path, group by level or product, summarize |
| `src/catalog/imbalance.ts` | Ranks categories by NV-only vs PA-only imbalance for the highlight cards |
| `src/useDrillPath.ts` | Drill path ↔ URL (`?department=…&category=…&class=…`), so back, refresh, and deep links work |
| `src/components/*` | Presentation only: breakdown table, diverging bar, product table, breadcrumbs |

There are two boundaries:
- **The ETL boundary.** The slim file stays faithful to the source: nulls stay null, quantities stay raw
  (including negatives), and kits are still present. The only transformation is label normalization.
- **The interpretation boundary.** Every judgment call about meaning lives in `availability.ts`, so each one is
  a single, tested line to change.

The app keeps one flat SKU list (with a product lookup) and aggregates it on every navigation. At about
9k SKUs this takes milliseconds, and new questions (filter by vendor or product type, a different level) become new
pure functions instead of a new data pipeline.

Tests cover the domain layer (extraction, normalization, availability, rollups), because those decide
the numbers. The UI has no tests.

## Decisions and assumptions

- **Units on hand (`locationInventory.available_quantities`) are the source of truth for availability,
  as confirmed with the hiring manager.** `locationInventory.locations` disagrees with it on about 1,200
  variant-location pairs, and it is ignored. A location counts as stocked when it has **> 0 units**. Negative
  values (9 in the file) count as not stocked. Keys other than NV/PA (marketplace channels on 2 SKUs) are ignored.
- **The unit of analysis is the SKU (variant), not the product.** Department/category/class are set per
  variant, and 49 products have variants in different classes (e.g. a dish soap and its refill). A product
  appears under every class it has variants in, showing only the variants in that class.
- **Out of scope: kits (`_kit`), services (`_service`), and other charges (`_otherCharge`),** 218 SKUs in total.
  Services are virtual goods such as "Protect the Brazilian Rainforest – 10 acres". Kit stock is derived from the
  component SKUs, so counting kits double-counts. Assemblies are kept because they're real sellable SKUs.
- **Hierarchy labels are normalized for case and whitespace**: 20 raw department labels collapse to 13
  (`Wellness`/`wellness`, `Household Care `, …). The canonical spelling is the most frequent one.
  `npm run data` prints what was merged.
- **SKUs missing hierarchy values appear as `(Unassigned)`** at whichever level is missing, so totals
  reconcile and the data gap stays visible rather than being dropped.
- **"Stocked SKUs" = SKUs with units in at least one location** (Only NV + Only PA + Both). SKUs stocked in
  neither location are counted in the data but not shown as a column.

## Deliberately not built

Search, filters (vendor, division), charts outside the table, a "neither" column, and everything else in
the file (prices, ratings, plastic data, ingredients). The aim was one view that answers one question well. Each of these
is a small addition to the existing structure.

## Weakest parts / what I'd change next

- **Small-n noise.** Share-based bars make 3-of-11 look more alarming than 30-of-300. The highlight cards guard
  against this with a 10-SKU minimum, but the table bars don't. Fixes: de-emphasize low-n rows, or a toggle to
  size bars by absolute count.
- **Sort state isn't in the URL.** It survives drilling between hierarchy levels but resets after visiting
  a product view. It belongs next to the drill path in the URL.
- **`locations` is ignored entirely.** If "eligible to sell here but zero units" matters to ops (e.g. a
  replenishment gap versus a deliberate assortment choice), that would be a second dimension worth surfacing.
- **Normalization only handles case and whitespace.** Typos such as `Deoderizers` and genuinely different names
  for the same thing pass through unchanged.
- **The whole catalog is loaded up front.** That's fine at this size. At 100× the size I'd pre-aggregate per node
  in the ETL step and load products lazily.
