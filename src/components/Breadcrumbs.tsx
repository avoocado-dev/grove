import type { DrillPath } from '../catalog/rollup.ts';

interface BreadcrumbsProps {
  path: DrillPath;
  onNavigate: (path: DrillPath) => void;
}

export function Breadcrumbs({ path, onNavigate }: BreadcrumbsProps) {
  const crumbs = ['All departments', ...path];
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol>
        {crumbs.map((label, i) => (
          <li key={i}>
            {i < crumbs.length - 1 ? (
              <button className="row-link" onClick={() => onNavigate(path.slice(0, i))}>
                {label}
              </button>
            ) : (
              <span aria-current="page">{label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
