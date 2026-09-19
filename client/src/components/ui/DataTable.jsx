import { useState } from "react";
import { flexRender } from "@tanstack/react-table";
import {
  useLegacyTable as useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
} from "@tanstack/react-table/legacy";
import { ArrowUpDown, ArrowUp, ArrowDown, Search } from "lucide-react";
import {
  TableContainer,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "./Table";
import Input from "./Input";
import Pagination from "./Pagination";
import { TableSkeleton } from "./Skeleton";
import EmptyState from "./EmptyState";

export function DataTable({
  columns,
  data = [],
  isLoading = false,
  searchPlaceholder = "Search records...",
  emptyTitle = "No records found",
  emptyDescription = "There are no matching entries in this view.",
  showSearch = true,
  pageSize = 10,
}) {
  const [sorting, setSorting] = useState([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: {
      pagination: {
        pageSize,
      },
    },
  });

  return (
    <div className="w-full space-y-4">
      {/* Search Header */}
      {showSearch && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="w-full sm:max-w-xs">
            <Input
              type="search"
              placeholder={searchPlaceholder}
              value={globalFilter ?? ""}
              onChange={(e) => setGlobalFilter(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
            />
          </div>
        </div>
      )}

      {/* Table Content */}
      <TableContainer>
        {isLoading ? (
          <TableSkeleton rows={5} columns={columns.length} />
        ) : (
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} isHoverable={false}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : (
                        <div
                          className={`flex items-center gap-1.5 ${
                            header.column.getCanSort()
                              ? "cursor-pointer select-none hover:text-slate-900"
                              : ""
                          }`}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {header.column.getCanSort() && (
                            <span className="shrink-0 text-slate-400">
                              {header.column.getIsSorted() === "asc" ? (
                                <ArrowUp className="h-3.5 w-3.5 text-rose-600" />
                              ) : header.column.getIsSorted() === "desc" ? (
                                <ArrowDown className="h-3.5 w-3.5 text-rose-600" />
                              ) : (
                                <ArrowUpDown className="h-3.5 w-3.5" />
                              )}
                            </span>
                          )}
                        </div>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>

            <TableBody>
              {table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow isHoverable={false}>
                  <TableCell
                    colSpan={columns.length}
                    className="h-48 text-center"
                  >
                    <EmptyState
                      title={emptyTitle}
                      description={emptyDescription}
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      {/* Pagination Controls */}
      {!isLoading && data.length > 0 && (
        <Pagination
          currentPage={table.getState().pagination.pageIndex + 1}
          totalPages={table.getPageCount()}
          totalRecords={table.getFilteredRowModel().rows.length}
          limit={table.getState().pagination.pageSize}
          onPageChange={(page) => table.setPageIndex(page - 1)}
          onLimitChange={(newSize) => table.setPageSize(newSize)}
        />
      )}
    </div>
  );
}

export default DataTable;
