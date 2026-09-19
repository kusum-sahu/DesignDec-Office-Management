import { forwardRef, useId } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../utils/cn";

export const Select = forwardRef(
  (
    {
      className,
      label,
      error,
      helperText,
      options = [],
      placeholder = "Select an option...",
      id,
      name,
      required,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const selectId = id || name || generatedId;
    const errorId = `${selectId}-error`;
    const helperId = `${selectId}-helper`;

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-slate-700"
          >
            {label}
            {required && <span className="ml-1 text-rose-500">*</span>}
          </label>
        )}

        <div className="relative rounded-lg shadow-xs">
          <select
            ref={ref}
            id={selectId}
            name={name}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={
              error ? errorId : helperText ? helperId : undefined
            }
            className={cn(
              "block w-full appearance-none rounded-lg border bg-white px-3.5 py-2.5 pr-10 text-sm text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 cursor-pointer",
              error
                ? "border-red-400 focus:border-red-500 focus:ring-red-200"
                : "border-slate-300 hover:border-slate-400 focus:border-rose-500 focus:ring-rose-200",
              className
            )}
            {...props}
          >
            {placeholder && <option value="">{placeholder}</option>}
            {options.length > 0
              ? options.map((opt) => {
                  const val = typeof opt === "object" ? opt.value : opt;
                  const lbl = typeof opt === "object" ? opt.label : opt;
                  return (
                    <option key={val} value={val}>
                      {lbl}
                    </option>
                  );
                })
              : children}
          </select>

          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
            <ChevronDown className="h-4 w-4" />
          </div>
        </div>

        {error && (
          <p id={errorId} className="text-xs font-medium text-red-600">
            {error}
          </p>
        )}

        {!error && helperText && (
          <p id={helperId} className="text-xs text-slate-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";
export default Select;
