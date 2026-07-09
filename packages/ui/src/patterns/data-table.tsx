'use client';

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type Table as TableInstance,
} from '@tanstack/react-table';
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Button } from '../components/button';
import { Input } from '../components/input';
import { Skeleton } from '../components/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/table';
import { cn } from '../lib/cn';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  /** When true, body renders skeleton rows. */
  loading?: boolean;
  /** Number of skeleton rows while loading. */
  skeletonRows?: number;
  /** Column id (matching a column's accessor) used for the search box. */
  searchColumn?: string;
  searchPlaceholder?: string;
  /** Right-aligned toolbar slot (filters, bulk actions). */
  toolbar?: ReactNode;
  /** Rendered when data is empty AND not loading. */
  empty?: ReactNode;
  /** Pagination size. Defaults to 20. */
  pageSize?: number;
  /**
   * Hide the built-in pagination footer and render all provided rows. Use when
   * the parent owns pagination server-side (e.g. fetches one page at a time) so
   * the footer isn't duplicated.
   */
  hidePagination?: boolean;
  /** Optional click handler on a row. */
  onRowClick?: (row: TData) => void;
}

/**
 * Opinionated table built on TanStack Table + @ecom/ui Table.
 *
 *   const columns: ColumnDef<Product>[] = [
 *     { accessorKey: 'name', header: 'Name' },
 *     { accessorKey: 'price', header: 'Price' },
 *   ];
 *   <DataTable columns={columns} data={products} searchColumn="name" />
 */
export function DataTable<TData, TValue>({
  columns,
  data,
  loading = false,
  skeletonRows = 5,
  searchColumn,
  searchPlaceholder = 'Search…',
  toolbar,
  empty,
  pageSize = 20,
  hidePagination = false,
  onRowClick,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    // Omit the pagination row model when the parent paginates so every provided
    // row renders (no client-side slicing/truncation).
    getPaginationRowModel: hidePagination ? undefined : getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  });

  return (
    <div className="space-y-3">
      {(searchColumn || toolbar) && (
        <div className="flex items-center gap-2">
          {searchColumn ? (
            <Input
              placeholder={searchPlaceholder}
              value={(table.getColumn(searchColumn)?.getFilterValue() as string) ?? ''}
              onChange={(e) =>
                table.getColumn(searchColumn)?.setFilterValue(e.target.value)
              }
              className="max-w-xs"
            />
          ) : null}
          {toolbar ? <div className="ml-auto flex items-center gap-2">{toolbar}</div> : null}
        </div>
      )}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sortDir = header.column.getIsSorted();
                  return (
                    <TableHead key={header.id} className="px-3">
                      {header.isPlaceholder ? null : (
                        <button
                          type="button"
                          className={cn(
                            'flex items-center gap-1 font-medium text-muted-foreground',
                            canSort && 'cursor-pointer select-none hover:text-foreground',
                          )}
                          onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                          disabled={!canSort}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {canSort ? (
                            sortDir === 'asc' ? (
                              <ChevronUp className="size-3.5" />
                            ) : sortDir === 'desc' ? (
                              <ChevronDown className="size-3.5" />
                            ) : (
                              <ChevronsUpDown className="size-3.5 opacity-50" />
                            )
                          ) : null}
                        </button>
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: skeletonRows }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((_, j) => (
                    <TableCell key={j} className="px-3 py-3">
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className={cn(onRowClick && 'cursor-pointer')}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-3 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 p-0">
                  {empty ?? (
                    <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                      No results.
                    </div>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {hidePagination ? null : <DataTablePagination table={table} />}
    </div>
  );
}

function DataTablePagination<TData>({ table }: { table: TableInstance<TData> }) {
  const total = table.getFilteredRowModel().rows.length;
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const from = total === 0 ? 0 : pageIndex * pageSize + 1;
  const to = Math.min((pageIndex + 1) * pageSize, total);
  return (
    <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
      <span>
        {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
