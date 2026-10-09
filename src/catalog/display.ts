// Presentation helpers for Shopify values, shared by the product view and search.

const PLACEHOLDER_TITLES = new Set(['Default', 'Default Title']);

/** Shopify's placeholder title for a single-variant product's only variant. */
export const isPlaceholderTitle = (title: string) => PLACEHOLDER_TITLES.has(title);

/** "gid://shopify/ProductVariant/50573142393144" -> "50573142393144" */
export const shortId = (gid: string) => gid.slice(gid.lastIndexOf('/') + 1);
