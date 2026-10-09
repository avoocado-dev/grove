import { useId, useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { search } from '../catalog/search.ts';
import type { SearchEntry, SearchKind, SearchResult } from '../catalog/search.ts';

const KIND_LABELS: Record<SearchKind, string> = {
  department: 'Department',
  category: 'Category',
  class: 'Class',
  product: 'Product',
  sku: 'SKU',
};

interface SearchBoxProps {
  index: readonly SearchEntry[];
  onSelect: (result: SearchResult) => void;
}

/** Type-ahead search over the whole catalog (a combobox: arrows move, Enter picks, Escape closes). */
export function SearchBox({ index, onSelect }: SearchBoxProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const results = useMemo(() => search(index, query), [index, query]);
  const showResults = open && query.trim().length >= 2;

  const choose = (result: SearchResult) => {
    onSelect(result);
    setQuery('');
    setOpen(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && results.length > 0) {
      event.preventDefault();
      setOpen(true);
      const step = event.key === 'ArrowDown' ? 1 : results.length - 1;
      setActive((i) => (i + step) % results.length);
    } else if (event.key === 'Enter' && showResults && results[active]) {
      event.preventDefault();
      choose(results[active]);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="search">
      <input
        type="search"
        className="search__input"
        placeholder="Search departments, categories, products, SKUs…"
        aria-label="Search the catalog"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showResults}
        aria-controls={listId}
        aria-activedescendant={showResults && results[active] ? `${listId}-${active}` : undefined}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
      />
      {showResults && (
        <div className="search__results">
          {results.length === 0 ? (
            <p className="search__empty">No matches</p>
          ) : (
            <ul id={listId} role="listbox" aria-label="Search results">
              {results.map((result, i) => (
                <li
                  key={JSON.stringify([result.kind, result.path, result.rowLabel, result.skuIds?.[0]])}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  className={i === active ? 'search__option search__option--active' : 'search__option'}
                  // Keep focus in the input, so its blur doesn't close the list before the click lands.
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(result)}
                >
                  <span className="search__kind">{KIND_LABELS[result.kind]}</span>
                  <span className="search__label">{result.label}</span>
                  <span className="search__context">{result.context}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
