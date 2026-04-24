'use client';

import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';

interface Column<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (value: unknown, row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchPlaceholder?: string;
  searchKey?: keyof T;
  pageSize?: number;
  loading?: boolean;
  onRowClick?: (row: T) => void;
  filterContent?: React.ReactNode;
}

export default function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  searchPlaceholder = 'Search...',
  searchKey,
  pageSize = 10,
  loading = false,
  onRowClick,
  filterContent,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  // 0 = "All"
  const [selectedPageSize, setSelectedPageSize] = useState<number>(pageSize);

  const getValue = (row: T, key: string): unknown => {
    return key.split('.').reduce((obj: unknown, k) => {
      if (obj && typeof obj === 'object') return (obj as Record<string, unknown>)[k];
      return undefined;
    }, row);
  };

  // Flatten any value (including nested objects) into a searchable string
  const stringify = (val: unknown): string => {
    if (val == null) return '';
    if (typeof val === 'object') {
      return Object.values(val as Record<string, unknown>).map(stringify).join(' ');
    }
    return String(val);
  };

  const filtered = useMemo(() => {
    let result = [...data];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((row) => {
        if (searchKey) {
          return stringify(getValue(row, String(searchKey))).toLowerCase().includes(q);
        }
        // No searchKey — search across all column values (flattens nested objects)
        return columns.some((col) =>
          stringify(getValue(row, String(col.key))).toLowerCase().includes(q)
        );
      });
    }
    if (sortKey) {
      result.sort((a, b) => {
        const aRaw = getValue(a, sortKey);
        const bRaw = getValue(b, sortKey);
        // Numeric compare when both are numbers (or numeric strings)
        const aNum = typeof aRaw === 'number' ? aRaw : parseFloat(String(aRaw ?? ''));
        const bNum = typeof bRaw === 'number' ? bRaw : parseFloat(String(bRaw ?? ''));
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return sortDir === 'asc' ? aNum - bNum : bNum - aNum;
        }
        const aStr = String(aRaw ?? '');
        const bStr = String(bRaw ?? '');
        return sortDir === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
      });
    }
    return result;
  }, [data, search, searchKey, sortKey, sortDir, columns]);

  const effectivePageSize = selectedPageSize === 0 ? Math.max(filtered.length, 1) : selectedPageSize;
  const totalPages = Math.max(1, Math.ceil(filtered.length / effectivePageSize));
  const paginated = selectedPageSize === 0
    ? filtered
    : filtered.slice((page - 1) * effectivePageSize, page * effectivePageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 animate-pulse rounded" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        {filterContent}
        <Select
          value={String(selectedPageSize)}
          onValueChange={(v) => { setSelectedPageSize(parseInt(v, 10)); setPage(1); }}
        >
          <SelectTrigger className="w-28 h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10 / page</SelectItem>
            <SelectItem value="25">25 / page</SelectItem>
            <SelectItem value="50">50 / page</SelectItem>
            <SelectItem value="100">100 / page</SelectItem>
            <SelectItem value="0">Show all</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              {columns.map((col) => (
                <TableHead
                  key={String(col.key)}
                  className="font-semibold text-gray-700 py-3"
                  onClick={() => col.sortable && handleSort(String(col.key))}
                  style={{ cursor: col.sortable ? 'pointer' : 'default' }}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-12 text-gray-400">
                  No records found
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((row, idx) => (
                <TableRow
                  key={idx}
                  onClick={() => onRowClick?.(row)}
                  className={onRowClick ? 'cursor-pointer hover:bg-blue-50/50 transition-colors' : ''}
                >
                  {columns.map((col) => (
                    <TableCell key={String(col.key)} className="py-3.5">
                      {col.render
                        ? col.render(getValue(row, String(col.key)), row)
                        : String(getValue(row, String(col.key)) ?? '—')}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>
          {selectedPageSize === 0
            ? `Showing all ${filtered.length}`
            : `Showing ${Math.min((page - 1) * effectivePageSize + 1, filtered.length)}–${Math.min(page * effectivePageSize, filtered.length)} of ${filtered.length}`}
        </span>
        {totalPages > 1 && selectedPageSize !== 0 && (
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="px-3 py-1 rounded text-sm font-medium">
              {page} / {totalPages}
            </span>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
