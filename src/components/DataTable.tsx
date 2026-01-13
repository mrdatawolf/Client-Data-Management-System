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
}: DataTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
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
      if (!prev || prev.key !== key) {
        return { key, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { key, direction: 'desc' };
      }
      return null;
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
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
            style={{
              flex: 1,
              minWidth: '250px',
              padding: '0.5rem 0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              fontSize: '0.875rem'
            }}
          />
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {onAdd && (
            <button
              onClick={onAdd}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'background-color 0.15s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
            >
              + Add New
            </button>
          )}
          {enableExport && (
            <button
              onClick={handleExport}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'background-color 0.15s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
            >
              Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div style={{ flex: 1, overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: '0.375rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f9fafb', zIndex: 10 }}>
            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
              {visibleColumns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                  style={{
                    padding: '0.75rem 1rem',
                    textAlign: 'left',
                    fontWeight: '600',
                    fontSize: '0.75rem',
                    color: '#374151',
                    cursor: col.sortable !== false ? 'pointer' : 'default',
                    userSelect: 'none',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {col.label}
                    {sortConfig?.key === col.key && (
                      <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
              ))}
              {(onEdit || onDelete) && (
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: '600', fontSize: '0.75rem' }}>
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length > 0 ? (
              paginatedData.map((row, rowIndex) => (
                <tr key={rowIndex} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  {visibleColumns.map((col) => {
                    const value = row[col.key];
                    const isPassword = col.type === 'password';
                    const isMasked = maskedPasswords.has(`${rowIndex}-${col.key}`);

                    return (
                      <td
                        key={col.key}
                        style={{
                          padding: '0.75rem 1rem',
                          fontFamily: col.type === 'ip' ? 'monospace' : undefined,
                          maxWidth: '300px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {isPassword && enablePasswordMasking ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontFamily: 'monospace' }}>
                              {isMasked ? value || '-' : '••••••••'}
                            </span>
                            <button
                              onClick={() => togglePasswordVisibility(rowIndex, col.key)}
                              style={{
                                padding: '0.25rem 0.5rem',
                                fontSize: '0.75rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '0.25rem',
                                backgroundColor: 'white',
                                cursor: 'pointer'
                              }}
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
                            style={{ color: '#3b82f6', textDecoration: 'underline' }}
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
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        {onEdit && (
                          <button
                            onClick={() => onEdit(row)}
                            style={{
                              padding: '0.375rem 0.75rem',
                              fontSize: '0.75rem',
                              backgroundColor: '#3b82f6',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.25rem',
                              cursor: 'pointer'
                            }}
                          >
                            Edit
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => onDelete(row)}
                            style={{
                              padding: '0.375rem 0.75rem',
                              fontSize: '0.75rem',
                              backgroundColor: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.25rem',
                              cursor: 'pointer'
                            }}
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
                  style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af', fontStyle: 'italic' }}
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
        <div style={{ color: '#6b7280' }}>
          Showing {Math.min((currentPage - 1) * rowsPerPage + 1, sortedData.length)} to{' '}
          {Math.min(currentPage * rowsPerPage, sortedData.length)} of {sortedData.length} records
          {searchQuery || Object.keys(columnFilters).length > 0 ? ` (filtered from ${data.length} total)` : ''}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Rows per page:
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              style={{
                padding: '0.25rem 0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.25rem',
                fontSize: '0.875rem'
              }}
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
            style={{
              padding: '0.375rem 0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.25rem',
              backgroundColor: currentPage === 1 ? '#f3f4f6' : 'white',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
            }}
          >
            First
          </button>
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            style={{
              padding: '0.375rem 0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.25rem',
              backgroundColor: currentPage === 1 ? '#f3f4f6' : 'white',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
            }}
          >
            Previous
          </button>
          <span style={{ padding: '0 0.5rem' }}>
            Page {currentPage} of {totalPages || 1}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
            style={{
              padding: '0.375rem 0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.25rem',
              backgroundColor: currentPage === totalPages || totalPages === 0 ? '#f3f4f6' : 'white',
              cursor: currentPage === totalPages || totalPages === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            Next
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages || totalPages === 0}
            style={{
              padding: '0.375rem 0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.25rem',
              backgroundColor: currentPage === totalPages || totalPages === 0 ? '#f3f4f6' : 'white',
              cursor: currentPage === totalPages || totalPages === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            Last
          </button>
        </div>
      </div>
    </div>
  );
}
