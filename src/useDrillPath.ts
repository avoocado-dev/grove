// The drill path lives in the URL (?department=…&category=…&class=…) so the back
// button, refresh, and shared links all work without a router.

import { useCallback, useEffect, useState } from 'react';
import { LEVELS } from './catalog/types.ts';
import type { DrillPath } from './catalog/rollup.ts';

function readPath(): DrillPath {
  const params = new URLSearchParams(window.location.search);
  const path: string[] = [];
  for (const level of LEVELS) {
    const label = params.get(level);
    if (label === null) break;
    path.push(label);
  }
  return path;
}

function toUrl(path: DrillPath): string {
  const params = new URLSearchParams();
  path.forEach((label, i) => params.set(LEVELS[i]!, label));
  const query = params.toString();
  return window.location.pathname + (query ? `?${query}` : '');
}

export function useDrillPath(): [DrillPath, (path: DrillPath) => void] {
  const [path, setPath] = useState(readPath);

  useEffect(() => {
    const onPopState = () => setPath(readPath());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((next: DrillPath) => {
    window.history.pushState(null, '', toUrl(next));
    setPath(next);
    window.scrollTo(0, 0);
  }, []);

  return [path, navigate];
}
