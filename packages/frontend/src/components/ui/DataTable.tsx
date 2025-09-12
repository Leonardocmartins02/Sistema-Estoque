import React from 'react';

type Align = 'left' | 'center' | 'right';

export type Column<T> = {
  key: keyof T | string;
  header: string;
  width?: string; // ex.: 'w-1/3' ou classes tailwind
  align?: Align;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
};

export type Sort = { by: string; dir: 'asc' | 'desc' };

export type DataTableProps<T> = {
  columns: Column<T>[];
  items: T[];
  sort?: Sort;
  onSortChange?: (next: Sort) => void;
  isLoading?: boolean;
  error?: string | null;
  empty?: React.ReactNode;
  getRowId: (row: T) => string;
  className?: string;
  footer?: React.ReactNode;
};

export function DataTable<T>({
  columns,
  items,
  sort,
  onSortChange,
  isLoading,
  error,
  empty,
  getRowId,
  className = '',
  footer,
}: DataTableProps<T>) {
  const handleSort = (col: Column<T>) => {
    if (!col.sortable || !onSortChange) return;
    const nextDir = sort?.by === String(col.key) && sort?.dir === 'asc' ? 'desc' : 'asc';
    onSortChange({ by: String(col.key), dir: nextDir });
  };

  const alignClass = (align?: Align) =>
    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';

  return (
    <div className={`overflow-hidden rounded-lg border bg-white shadow-sm ${className}`}>
      {error && (
        <div className="border-b border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
      {isLoading && (
        <div className="border-b border-gray-100 p-3 text-sm text-gray-600">Carregando...</div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0" role="table">
          <thead className="bg-gray-50" role="rowgroup">
            <tr role="row">
              {columns.map((col) => {
                const isSorted = sort?.by === String(col.key);
                const dir = isSorted ? sort?.dir : undefined;
                return (
                  <th
                    key={String(col.key)}
                    scope="col"
                    role="columnheader"
                    aria-sort={isSorted ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                    className={`px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-600 ${
                      alignClass(col.align)
                    } ${col.width || ''}`}
                  >
                    {col.sortable ? (
                      <button
                        type="button"
                        onClick={() => handleSort(col)}
                        className="group inline-flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white rounded"
                        aria-label={`Ordenar por ${col.header}`}
                        title={`Ordenar por ${col.header}`}
                      >
                        <span>{col.header}</span>
                        <span
                          aria-hidden="true"
                          className={`transition-transform text-gray-400 group-hover:text-gray-600 ${
                            isSorted && dir === 'desc' ? 'rotate-180' : ''
                          }`}
                        >
                          ▲
                        </span>
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody role="rowgroup">
            {items.length === 0 && !isLoading ? (
              <tr role="row">
                <td role="cell" colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">
                  {empty ?? 'Nenhum item encontrado.'}
                </td>
              </tr>
            ) : (
              items.map((row) => {
                const id = getRowId(row);
                return (
                  <tr
                    key={id}
                    role="row"
                    tabIndex={0}
                    className="hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  >
                    {columns.map((col) => (
                      <td
                        key={String(col.key)}
                        role="cell"
                        className={`border-t border-gray-100 px-4 py-3 text-sm text-gray-800 ${alignClass(
                          col.align
                        )}`}
                      >
                        {col.render ? col.render(row) : String((row as any)[col.key])}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {footer ? <div className="border-t border-gray-100 px-4 py-3">{footer}</div> : null}
    </div>
  );
}

export default DataTable;
