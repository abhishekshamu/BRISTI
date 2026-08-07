import type { ReactNode } from 'react';
import { Search } from 'lucide-react';

interface ToolbarProps {
  searchable?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: ReactNode;
  actions?: ReactNode;
}

export default function Toolbar({ searchable, searchValue, onSearchChange, searchPlaceholder = 'Search…', filters, actions }: ToolbarProps) {
  return (
    <div className="admin-toolbar">
      {searchable && (
        <div className="admin-search">
          <Search className="admin-search-icon" />
          <input
            type="search"
            value={searchValue ?? ''}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder={searchPlaceholder}
            className="admin-search-input"
            aria-label={searchPlaceholder}
          />
        </div>
      )}
      {filters && <div className="flex items-center gap-2 flex-wrap">{filters}</div>}
      {actions && <div className="flex items-center gap-2 flex-wrap sm:ml-auto">{actions}</div>}
    </div>
  );
}
