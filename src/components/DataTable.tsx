"use client";

import { useState, useMemo } from "react";

interface Column {
  key: string;
  label: string;
  type?: 'text' | 'password' | 'number' | 'date' | 'ip' | 'email' | 'url';
  sortable?: boolean;
  filterable?: boolean;
  hidden?: boolean;
}

export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

interface DataTableProps {
  data: any[];
  columns: Column[];
  onEdit?: (row: any) => void;
  onDelete?: (row: any) => void;
  onAdd?: () => void;
  rowsPerPageOptions?: number[];
  enablePasswordMasking?: boolean;
  enableSearch?: boolean;
  enableFilters?: boolean;
  enableExport?: boolean;
  // Sort persistence props
  tableId?: string;
  defaultSort?: SortConfig;
  onSortChange?: (tableId: string, sortConfig: SortConfig | null) => void;
}

export function DataTable({
  data,
  columns,
  onEdit,
  onDelete,
  onAdd,
  rowsPerPageOptions = [50, 100, 200],
  enablePasswordMasking = true,
  enableSearch = true,
  enableFilters = true,
  enableExport = true,
  tableId,
  defaultSort,
  onSortChange,
}: DataTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(defaultSort || null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(rowsPerPageOptions[0]);
  const [maskedPasswords, setMaskedPasswords] = useState<Set<string>>(new Set());
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});

  // Toggle password visibility for a specific row
  const togglePasswordVisibility = (rowIndex: number, columnKey: string) => {
    const key = `${rowIndex}-${columnKey}`;
    setMaskedPasswords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  // Filter data based on search and column filters
  const filteredData = useMemo(() => {
    let filtered = [...data];

    // Apply search
    if (searchQuery && enableSearch) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(row =>
        columns.some(col => {
          const value = row[col.key];
          return value != null && String(value).toLowerCase().includes(lowerQuery);
        })
      );
    }

    // Apply column filters
    if (enableFilters) {
      Object.entries(columnFilters).forEach(([key, filterValue]) => {
        if (filterValue) {
          filtered = filtered.filter(row => {
            const value = row[key];
            return value != null && String(value).toLowerCase().includes(filterValue.toLowerCase());
          });
        }
      });
    }

    return filtered;
  }, [data, searchQuery, columnFilters, columns, enableSearch, enableFilters]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (aVal == null) return 1;
      if (bVal == null) return -1;

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();

      if (sortConfig.direction === 'asc') {
        return aStr.localeCompare(bStr);
      } else {
        return bStr.localeCompare(aStr);
      }
    });
  }, [filteredData, sortConfig]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(sortedData.length / rowsPerPage);

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      let newConfig: SortConfig | null;
      if (!prev || prev.key !== key) {
        newConfig = { key, direction: 'asc' };
      } else if (prev.direction === 'asc') {
        newConfig = { key, direction: 'desc' };
      } else {
        newConfig = null;
      }
      // Notify parent of sort change for persistence
      if (onSortChange && tableId) {
        onSortChange(tableId, newConfig);
      }
      return newConfig;
    });
  };

  const handleExport = () => {
    // Simple CSV export
    const headers = columns.filter(c => !c.hidden).map(c => c.label).join(',');
    const rows = sortedData.map(row =>
      columns.filter(c => !c.hidden).map(c => {
        const value = row[c.key];
        // Mask passwords in export
        if (c.type === 'password' && enablePasswordMasking) {
          return '••••••••';
        }
        return `"${value || ''}"`;
      }).join(',')
    ).join('\n');

    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `data-export-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const visibleColumns = columns.filter(c => !c.hidden);

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Toolbar */}
      <div className="flex gap-3 flex-wrap items-center">
        {/* Search */}
        {enableSearch && (
          <input
            type="text"
            placeholder="Search all fields..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="flex-1 min-w-[250px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          />
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {onAdd && (
            <button
              onClick={onAdd}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white border-none rounded-md text-sm font-medium cursor-pointer transition-colors"
            >
              + Add New
            </button>
          )}
          {enableExport && (
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white border-none rounded-md text-sm font-medium cursor-pointer transition-colors"
            >
              Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-auto border border-gray-200 dark:border-gray-700 rounded-md">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 bg-gray-50 dark:bg-gray-900 z-10">
            <tr className="border-b-2 border-gray-200 dark:border-gray-700">
              {visibleColumns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                  className={`px-4 py-3 text-left font-semibold text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap select-none ${col.sortable !== false ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    {col.label}
                    {sortConfig?.key === col.key && (
                      <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
              ))}
              {(onEdit || onDelete) && (
                <th className="px-4 py-3 text-right font-semibold text-xs text-gray-700 dark:text-gray-300">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800">
            {paginatedData.length > 0 ? (
              paginatedData.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                  {visibleColumns.map((col) => {
                    const value = row[col.key];
                    const isPassword = col.type === 'password';
                    const isMasked = maskedPasswords.has(`${rowIndex}-${col.key}`);

                    return (
                      <td
                        key={col.key}
                        className={`px-4 py-3 max-w-[300px] overflow-hidden text-ellipsis whitespace-nowrap text-gray-900 dark:text-gray-100 ${col.type === 'ip' ? 'font-mono' : ''}`}
                      >
                        {isPassword && enablePasswordMasking ? (
                          <div className="flex items-center gap-2">
                            <span className="font-mono">
                              {isMasked ? value || '-' : '••••••••'}
                            </span>
                            <button
                              onClick={() => togglePasswordVisibility(rowIndex, col.key)}
                              className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
                              title={isMasked ? 'Hide' : 'Show'}
                            >
                              {isMasked ? '👁️' : '👁️‍🗨️'}
                            </button>
                          </div>
                        ) : col.type === 'url' && value ? (
                          <a
                            href={value}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 dark:text-blue-400 underline hover:text-blue-600 dark:hover:text-blue-300"
                          >
                            {value}
                          </a>
                        ) : (
                          <span title={String(value || '')}>{value || '-'}</span>
                        )}
                      </td>
                    );
                  })}
                  {(onEdit || onDelete) && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        {onEdit && (
                          <button
                            onClick={() => onEdit(row)}
                            className="px-3 py-1.5 text-xs bg-blue-500 hover:bg-blue-600 text-white border-none rounded cursor-pointer transition-colors"
                          >
                            Edit
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => onDelete(row)}
                            className="px-3 py-1.5 text-xs bg-red-500 hover:bg-red-600 text-white border-none rounded cursor-pointer transition-colors"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={visibleColumns.length + (onEdit || onDelete ? 1 : 0)}
                  className="p-12 text-center text-gray-400 dark:text-gray-500 italic"
                >
                  {searchQuery || Object.keys(columnFilters).length > 0
                    ? 'No results found'
                    : 'No data available'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center text-sm">
        <div className="text-gray-500 dark:text-gray-400">
          Showing {Math.min((currentPage - 1) * rowsPerPage + 1, sortedData.length)} to{' '}
          {Math.min(currentPage * rowsPerPage, sortedData.length)} of {sortedData.length} records
          {searchQuery || Object.keys(columnFilters).length > 0 ? ` (filtered from ${data.length} total)` : ''}
        </div>

        <div className="flex gap-2 items-center">
          <label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
            Rows per page:
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              {rowsPerPageOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className={`px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm transition-colors ${
              currentPage === 1
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600'
            }`}
          >
            First
          </button>
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className={`px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm transition-colors ${
              currentPage === 1
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600'
            }`}
          >
            Previous
          </button>
          <span className="px-2 text-gray-700 dark:text-gray-300">
            Page {currentPage} of {totalPages || 1}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
            className={`px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm transition-colors ${
              currentPage === totalPages || totalPages === 0
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600'
            }`}
          >
            Next
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages || totalPages === 0}
            className={`px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm transition-colors ${
              currentPage === totalPages || totalPages === 0
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600'
            }`}
          >
            Last
          </button>
        </div>
      </div>
    </div>
  );
}
