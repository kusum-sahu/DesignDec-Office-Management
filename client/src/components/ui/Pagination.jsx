import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../utils/cn";
import Button from "./Button";

export function Pagination({
  currentPage = 1,
  totalPages = 1,
  totalRecords = 0,
  limit = 10,
  onPageChange,
  onLimitChange,
  limitOptions = [10, 25, 50],
  className,
}) {
  if (totalPages <= 1 && totalRecords <= limit) return null;

  const startRecord = Math.min((currentPage - 1) * limit + 1, totalRecords);
  const endRecord = Math.min(currentPage * limit, totalRecords);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) pages.push(i);

      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-2 text-sm text-slate-600",
        className
      )}
    >
      {/* Records count & limit selector */}
      <div className="flex items-center gap-3 text-xs sm:text-sm">
        <span>
          Showing <span className="font-semibold text-slate-900">{startRecord}</span> to{" "}
          <span className="font-semibold text-slate-900">{endRecord}</span> of{" "}
          <span className="font-semibold text-slate-900">{totalRecords}</span> results
        </span>

        {onLimitChange && (
          <div className="flex items-center gap-1.5 ml-2">
            <span className="text-xs text-slate-400">Rows:</span>
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              aria-label="Rows per page"
              className="rounded-md border border-slate-300 bg-white py-1 px-2 text-xs text-slate-700 focus:border-rose-500 focus:outline-none"
            >
              {limitOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Pagination buttons */}
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange?.(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Previous page"
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {getPageNumbers().map((page, index) => {
          if (page === "...") {
            return (
              <span
                key={`ellipsis-${index}`}
                className="px-2 text-xs text-slate-400"
              >
                ...
              </span>
            );
          }

          const isCurrent = page === currentPage;
          return (
            <button
              key={page}
              type="button"
              onClick={() => onPageChange?.(page)}
              className={cn(
                "h-8 min-w-8 rounded-lg px-2 text-xs font-medium transition-colors cursor-pointer",
                isCurrent
                  ? "bg-rose-600 text-white shadow-xs font-semibold"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              {page}
            </button>
          );
        })}

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange?.(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Next page"
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default Pagination;
