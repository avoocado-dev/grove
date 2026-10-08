import { useEffect, useState } from 'react';
import type { Catalog } from './catalog/types.ts';

export type CatalogState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; catalog: Catalog };

/** Loads the slim catalog produced by `npm run data`. */
export function useCatalog(): CatalogState {
  const [state, setState] = useState<CatalogState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    fetch('/catalog.json')
      .then((res) => {
        // Vite's SPA fallback answers a missing file with index.html, so check the type too.
        if (!res.ok || !res.headers.get('content-type')?.includes('json')) {
          throw new Error('Could not load catalog.json. Did you run `npm run data`?');
        }
        return res.json() as Promise<Catalog>;
      })
      .then(
        (catalog) => !cancelled && setState({ status: 'ready', catalog }),
        (error: Error) => !cancelled && setState({ status: 'error', message: error.message }),
      );
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
