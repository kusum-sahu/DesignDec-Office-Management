import { forwardRef } from "react";
import { cn } from "../../utils/cn";

export const TableContainer = forwardRef(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "w-full overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs scrollbar-thin",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
TableContainer.displayName = "TableContainer";

export const Table = forwardRef(
  ({ className, children, ...props }, ref) => {
    return (
      <table
        ref={ref}
        className={cn("w-full text-left text-sm text-slate-700", className)}
        {...props}
      >
        {children}
      </table>
    );
  }
);
Table.displayName = "Table";

export const TableHeader = forwardRef(
  ({ className, children, ...props }, ref) => {
    return (
      <thead
        ref={ref}
        className={cn(
          "border-b border-slate-200 bg-slate-50/75 text-xs font-semibold tracking-wider text-slate-500 uppercase",
          className
        )}
        {...props}
      >
        {children}
      </thead>
    );
  }
);
TableHeader.displayName = "TableHeader";

export const TableBody = forwardRef(
  ({ className, children, ...props }, ref) => {
    return (
      <tbody
        ref={ref}
        className={cn("divide-y divide-slate-100 bg-white", className)}
        {...props}
      >
        {children}
      </tbody>
    );
  }
);
TableBody.displayName = "TableBody";

export const TableRow = forwardRef(
  ({ className, children, isHoverable = true, ...props }, ref) => {
    return (
      <tr
        ref={ref}
        className={cn(
          "transition-colors",
          isHoverable && "hover:bg-slate-50/80",
          className
        )}
        {...props}
      >
        {children}
      </tr>
    );
  }
);
TableRow.displayName = "TableRow";

export const TableHead = forwardRef(
  ({ className, children, ...props }, ref) => {
    return (
      <th
        ref={ref}
        className={cn("px-4 py-3.5 font-semibold text-slate-600 whitespace-nowrap", className)}
        {...props}
      >
        {children}
      </th>
    );
  }
);
TableHead.displayName = "TableHead";

export const TableCell = forwardRef(
  ({ className, children, ...props }, ref) => {
    return (
      <td
        ref={ref}
        className={cn("px-4 py-3.5 text-slate-700 align-middle", className)}
        {...props}
      >
        {children}
      </td>
    );
  }
);
TableCell.displayName = "TableCell";

export default Table;
