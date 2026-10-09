# SKU Availability

A drill-down table for finding where stock diverges between the Pennsylvania and Nevada warehouses:
**Department → Category → Class → Products (with variants)**. The product level lists one row per variant
(product, variant, vendor, ID) with a bar showing how its units split between the two warehouses.

Each hierarchy level shows, in order: **Stocked SKUs**, the **PA/NV stock split** chart, **Stocked in Both**, and the
**Stock only in PA/NV split** chart.

- **PA/NV stock split**: a 100% bar of the row's units on hand, split between PA and NV, with each location's units
  at its end. Every row's bar is the same length, so the split stays comparable however much stock the row holds.
- **Stock only in PA/NV split**: a diverging bar. PA-only SKUs grow left from the centre and NV-only grow right, each
  with its count at the tip. Bar length is the share of the row's stocked SKUs, so a lopsided small category stands
  out as clearly as a lopsided large one.

Because the values are printed beside the bars, the table also works as the accessible text version of the charts.

On All departments, a **Needs attention** panel above the table surfaces the **5 most imbalanced categories**
catalog-wide on two measures:

- **More SKUs located only in one location**: ranked by |NV-only − PA-only| ÷ stocked SKUs.
- **More stock in one location**: ranked by |NV units − PA units| ÷ units on hand.

Both count only categories with at least 10 stocked SKUs, so a one- or two-SKU category can't top the list. Both
rankings are one function (`topCategoryImbalances`) with a pluggable measure.

Clicking a card opens the category's department with the category's row highlighted. The panel is only on All
departments; once you drill in, the table has the page to itself.

**Search** (top right) finds departments, categories, and classes by name, products by title or vendor, and SKUs by
variant ID or variant name. Picking a result works like a card: it opens the view that lists it and highlights the
row (a product or SKU opens its class's product view). Products and SKUs are searched among stocked variants only,
since those are the rows the product view shows.

## Running it

Requires Node ≥ 23.6 (runs the TypeScript data script natively).

```sh
npm install
# put the catalog export (*.jsonl) in data/, then:
npm run data      # data/*.jsonl (~80MB) -> public/catalog.json (~3.6MB, ~410KB gzipped)
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
| `src/catalog/imbalance.ts` | Ranks categories by PA/NV imbalance on a pluggable measure, for the highlight cards |
| `src/catalog/search.ts` | Builds the search index and ranks matches; each result knows the view and rows to highlight |
| `src/useDrillPath.ts` | Drill path ↔ URL (`?department=…&category=…&class=…`), so back, refresh, and deep links work |
| `src/components/*` | Presentation only: breakdown and product tables, the two bar charts, highlight cards, search box, breadcrumbs |

There are two boundaries:
- **The ETL boundary.** The slim file stays faithful to the source: nulls stay null, quantities stay raw
  (including negatives), and kits are still present. The only transformation is label normalization.
- **The interpretation boundary.** Every judgment call about meaning lives in `availability.ts`, so each one is
  a single, tested line to change.

The app keeps one flat SKU list (with a product lookup) and aggregates it on every navigation. At about
9k SKUs this takes milliseconds, and new questions (filter by vendor or product type, a different level) become new
pure functions instead of a new data pipeline.

Tests cover the domain layer (extraction, normalization, availability, rollups, imbalance ranking, search),
because those decide the numbers and what gets surfaced. The UI has no tests.

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
- **The product view lists only stocked variants**, so a class's product rows match the "Stocked SKUs" count you
  clicked through from (about 20% of in-scope SKUs have no units in either location).

## Deliberately not built

Filters (vendor, division), sorting by the chart columns, a "neither" column, and everything else in the file
(prices, ratings, plastic data, ingredients). The aim was one view that answers one question well. Each of these is
a small addition to the existing structure.

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
- **Search only covers stocked variants.** It mirrors what the product view shows, so an out-of-stock SKU's ID
  finds nothing. Showing those results with a "not stocked anywhere" state would be more honest.
- **No UI tests.** Card clicks, search selection, and highlighting were checked by driving a browser by hand. A few
  component tests around the highlight flow would protect it.
- **Narrow screens.** The table is wider than a phone screen; it needs a horizontal scroll container or a
  stacked layout.
- **The whole catalog is loaded up front.** That's fine at this size. At 100× the size I'd pre-aggregate per node
  in the ETL step and load products lazily.