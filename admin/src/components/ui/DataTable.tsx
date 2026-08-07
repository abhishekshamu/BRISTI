import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, Columns3, Download } from 'lucide-react';
import Toolbar from './Toolbar';
import EmptyState from './EmptyState';
import { SkeletonRows } from './Skeleton';

export interface Column<T> {
  key: string;
  header: ReactNode;
  render?: (row: T) => ReactNode;
  sortKey?: string;
  className?: string;
  headerClassName?: string;
  noChooser?: boolean;
  defaultHidden?: boolean;
  defaultVisible?: boolean;
}

export interface CsvExportConfig<T> {
  filename?: string;
  columns?: { key: string; header: string }[];
  rowToString?: (row: T, key: string) => string;
}

interface Pagination {
  page: number;
  pages: number;
  total: number;
  onPageChange: (page: number) => void;
  pageSizeLabel?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  searchable?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: ReactNode;
  toolbarActions?: ReactNode;
  pagination?: Pagination;
  clientPagination?: boolean;
  pageSize?: number;
  emptyTitle?: string;
  emptyBody?: string;
  emptyAction?: ReactNode;
  selected?: Set<string>;
  onToggleRow?: (id: string) => void;
  onToggleAll?: () => void;
  bulkActions?: ReactNode;
  onRowClick?: (row: T) => void;
  storageKey?: string;
  exportFn?: (rows: T[]) => void;
  exportCsv?: CsvExportConfig<T>;
}

function nodeToText(node: ReactNode): string {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (typeof node === 'object' && 'props' in node) {
    const children = (node as { props?: { children?: ReactNode } }).props?.children;
    if (children == null) return '';
    return Array.isArray(children) ? children.map(nodeToText).join('') : nodeToText(children);
  }
  return '';
}

function defaultKeysFor<T>(cols: Column<T>[]): Set<string> {
  const keys = new Set<string>();
  for (const c of cols) {
    if (c.defaultHidden === true || c.defaultVisible === false) continue;
    keys.add(c.key);
  }
  if (keys.size === 0 && cols[0]) keys.add(cols[0].key);
  return keys;
}

function loadStoredKeys<T>(storageKey: string, cols: Column<T>[]): Set<string> | null {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const keys = new Set<string>();
    for (const k of parsed) {
      if (typeof k === 'string' && cols.some((c) => c.key === k)) keys.add(k);
    }
    return keys.size > 0 ? keys : null;
  } catch {
    return null;
  }
}

function escapeCsvCell(value: unknown): string {
  const s = value == null ? '' : String(value);
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function downloadCsv<T>(rows: T[], columns: { key: string; header: string }[], filename: string, rowToString?: (row: T, key: string) => string) {
  const headerLine = columns.map((c) => escapeCsvCell(c.header)).join(',');
  const bodyLines = rows.map((row) =>
    columns
      .map((c) => {
        const v = rowToString ? rowToString(row, c.key) : (row as any)[c.key];
        return escapeCsvCell(v);
      })
      .join(','),
  );
  const csv = [headerLine, ...bodyLines].join('\r\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'export.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export default function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  searchable,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  filters,
  toolbarActions,
  pagination,
  clientPagination = false,
  pageSize = 10,
  emptyTitle = 'Nothing here yet',
  emptyBody,
  emptyAction,
  selected,
  onToggleRow,
  onToggleAll,
  bulkActions,
  onRowClick,
  storageKey,
  exportFn,
  exportCsv,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);
  const [clientPage, setClientPage] = useState(1);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(() => {
    const stored = storageKey ? loadStoredKeys(storageKey, columns) : null;
    return stored ?? defaultKeysFor(columns);
  });
  const [chooserOpen, setChooserOpen] = useState(false);
  const chooserRef = useRef<HTMLDivElement>(null);

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.sortKey === sort.key);
    if (!col?.sortKey || !col.render) return rows;
    const getVal = (row: T) => {
      const v = col.render!(row);
      if (v == null) return '';
      if (typeof v === 'object' && 'props' in (v as any)) {
        const children = (v as any).props?.children;
        return typeof children === 'string' ? children.toLowerCase() : '';
      }
      return typeof v === 'string' ? v.toLowerCase() : String(v).toLowerCase();
    };
    const sorted = [...rows].sort((a, b) => {
      const av = getVal(a);
      const bv = getVal(b);
      if (av < bv) return sort.dir === 'asc' ? -1 : 1;
      if (av > bv) return sort.dir === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [rows, sort, columns]);

  const toggleSort = (key: string) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      return null;
    });
  };

  const allSelected = selected != null && selected.size > 0 && rows.length > 0 && rows.every((r) => selected.has(rowKey(r)));

  useEffect(() => {
    if (clientPagination) setClientPage(1);
  }, [searchValue, clientPagination, rows.length]);

  useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify([...visibleKeys]));
    } catch {
      console.error('Failed to persist column visibility');
    }
  }, [visibleKeys, storageKey]);

  useEffect(() => {
    if (!chooserOpen) return;
    const onDocMouseDown = (e: MouseEvent) => {
      if (chooserRef.current && !chooserRef.current.contains(e.target as Node)) setChooserOpen(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [chooserOpen]);

  const chooserColumns = useMemo(() => columns.filter((c) => !c.noChooser), [columns]);

  const visibleCols = useMemo(() => columns.filter((c) => visibleKeys.has(c.key)), [columns, visibleKeys]);

  const toggleColumn = (key: string) => {
    setVisibleKeys((prev) => {
      if (prev.has(key) && prev.size === 1) return prev;
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const showAllColumns = () => setVisibleKeys(defaultKeysFor(columns));

  const hideAllColumns = () => setVisibleKeys(chooserColumns.length > 0 ? new Set([chooserColumns[0].key]) : new Set<string>());

  const csvColumns = useMemo<{ key: string; header: string }[]>(() => {
    if (exportCsv?.columns) return exportCsv.columns;
    return visibleCols.map((c) => ({ key: c.sortKey ?? c.key, header: nodeToText(c.header) }));
  }, [exportCsv, visibleCols]);

  const handleCsvExport = () => {
    if (!exportCsv) return;
    downloadCsv(visibleRows, csvColumns, exportCsv.filename ?? 'export.csv', exportCsv.rowToString);
  };

  const pagedRows = useMemo(() => {
    if (!clientPagination) return sortedRows;
    const pages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
    const page = Math.min(clientPage, pages);
    const start = (page - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, clientPagination, clientPage, pageSize]);

  const visibleRows = clientPagination ? pagedRows : sortedRows;

  const clientPages = clientPagination ? Math.max(1, Math.ceil(sortedRows.length / pageSize)) : 0;
  const clientTotal = clientPagination ? sortedRows.length : 0;

  const hasToolbarExtras = chooserColumns.length > 0 || !!exportCsv || !!exportFn;

  const toolbarActionsNode = hasToolbarExtras ? (
    <div className="flex items-center gap-2 flex-wrap">
      {chooserColumns.length > 0 && (
        <div className="relative" ref={chooserRef}>
          <button
            type="button"
            onClick={() => setChooserOpen((v) => !v)}
            className="admin-btn-secondary h-8 px-3 text-xs inline-flex items-center gap-1"
            aria-haspopup="true"
            aria-expanded={chooserOpen}
          >
            <Columns3 className="w-3.5 h-3.5" /> Columns
          </button>
          {chooserOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 max-h-80 overflow-y-auto admin-card p-2 shadow-xl z-40">
              <div className="flex items-center justify-between px-2 pt-1 pb-2 border-b border-slate-200 dark:border-slate-700">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Columns</span>
                <div className="flex items-center gap-2 text-[11px]">
                  <button type="button" onClick={showAllColumns} className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 underline underline-offset-2">
                    Show all
                  </button>
                  <span className="text-slate-300 dark:text-slate-600">·</span>
                  <button type="button" onClick={hideAllColumns} className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 underline underline-offset-2">
                    Hide all
                  </button>
                </div>
              </div>
              {chooserColumns.map((col) => {
                const isVisible = visibleKeys.has(col.key);
                const isLast = visibleKeys.size === 1 && isVisible;
                return (
                  <label
                    key={col.key}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 ${isLast ? 'opacity-50' : ''}`}
                  >
                    <input
                      type="checkbox"
                      className="admin-checkbox"
                      checked={isVisible}
                      disabled={isLast}
                      onChange={() => toggleColumn(col.key)}
                      aria-label={`Toggle column ${String(col.header)}`}
                    />
                    <span className="text-slate-700 dark:text-slate-200 truncate">{col.header}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      )}
      {exportCsv && (
        <button type="button" onClick={handleCsvExport} className="admin-btn-secondary h-8 px-3 text-xs inline-flex items-center gap-1">
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      )}
      {exportFn && (
        <button type="button" onClick={() => exportFn(rows)} className="admin-btn-secondary h-8 px-3 text-xs inline-flex items-center gap-1">
          <Download className="w-3.5 h-3.5" /> Export
        </button>
      )}
      {toolbarActions}
    </div>
  ) : toolbarActions;

  return (
    <div>
      {(searchable || filters || toolbarActions || hasToolbarExtras) && (
        <Toolbar
          searchable={searchable}
          searchValue={searchValue}
          onSearchChange={onSearchChange}
          searchPlaceholder={searchPlaceholder}
          filters={filters}
          actions={toolbarActionsNode}
        />
      )}

      {selected && selected.size > 0 && bulkActions && (
        <div className="admin-card p-3 mt-4 flex flex-wrap items-center gap-2 border-slate-900/20 dark:border-slate-600/40">
          <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{selected.size} selected</span>
          {bulkActions}
          {onToggleAll && (
            <button type="button" onClick={onToggleAll} className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline underline-offset-2">
              {allSelected ? 'Deselect all' : 'Select all'}
            </button>
          )}
        </div>
      )}

      <div className="admin-table-wrap mt-4">
        {loading ? (
          <SkeletonRows rows={8} cols={Math.min(visibleCols.length, 7)} />
        ) : visibleRows.length === 0 ? (
          <EmptyState title={emptyTitle} body={emptyBody} action={emptyAction} />
        ) : (
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  {selected && (
                    <th className="admin-th w-10">
                      {onToggleAll && (
                        <input
                          type="checkbox"
                          className="admin-checkbox"
                          checked={allSelected}
                          onChange={onToggleAll}
                          aria-label="Select all rows"
                        />
                      )}
                    </th>
                  )}
                  {visibleCols.map((col) => (
                    <th key={col.key} className={`admin-th ${col.headerClassName ?? ''}`}>
                      {col.sortKey ? (
                        <button type="button" className="admin-th-sort" onClick={() => toggleSort(col.sortKey!)}>
                          {col.header}
                          {sort?.key === col.sortKey ? (
                            sort.dir === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronsUpDown className="w-3.5 h-3.5 opacity-40" />
                          )}
                        </button>
                      ) : (
                        col.header
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => {
                  const id = rowKey(row);
                  const isSelected = selected?.has(id) ?? false;
                  return (
                    <tr
                      key={id}
                      className={`admin-tr ${isSelected ? 'bg-slate-50 dark:bg-slate-800/60' : ''} ${onRowClick ? 'cursor-pointer' : ''}`}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                    >
                      {selected && (
                        <td className="admin-td">
                          {onToggleRow && (
                            <input
                              type="checkbox"
                              className="admin-checkbox"
                              checked={isSelected}
                              onChange={() => onToggleRow(id)}
                              aria-label={`Select row ${id}`}
                            />
                          )}
                        </td>
                      )}
                      {visibleCols.map((col) => (
                        <td key={col.key} className={`admin-td ${col.className ?? ''}`}>
                          {col.render ? col.render(row) : (row as any)[col.key]}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {pagination && !loading && pagination.pages > 1 && (
          <div className="admin-pagination">
            <span>
              Page {pagination.page} of {pagination.pages} · {pagination.total} total
            </span>
            <div className="admin-pagination-actions">
              <button type="button" className="admin-pagination-btn" disabled={pagination.page <= 1} onClick={() => pagination.onPageChange(pagination.page - 1)}>
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>
              <button
                type="button"
                className="admin-pagination-btn"
                disabled={pagination.page >= pagination.pages}
                onClick={() => pagination.onPageChange(pagination.page + 1)}
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {clientPagination && !loading && clientPages > 1 && (
          <div className="admin-pagination">
            <span>
              Page {Math.min(clientPage, clientPages)} of {clientPages} · {clientTotal} total
            </span>
            <div className="admin-pagination-actions">
              <button type="button" className="admin-pagination-btn" disabled={clientPage <= 1} onClick={() => setClientPage((p) => Math.max(1, p - 1))}>
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>
              <button
                type="button"
                className="admin-pagination-btn"
                disabled={clientPage >= clientPages}
                onClick={() => setClientPage((p) => Math.min(clientPages, p + 1))}
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
