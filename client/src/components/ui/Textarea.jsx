import { forwardRef, useId } from "react";
import { cn } from "../../utils/cn";

export const Textarea = forwardRef(
  (
    {
      className,
      label,
      error,
      helperText,
      id,
      name,
      required,
      disabled,
      rows = 3,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || name || generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-slate-700"
          >
            {label}
            {required && <span className="ml-1 text-rose-500">*</span>}
          </label>
        )}

        <textarea
          ref={ref}
          id={inputId}
          name={name}
          rows={rows}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={
            error ? errorId : helperText ? helperId : undefined
          }
          className={cn(
            "block w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 shadow-xs",
            error
              ? "border-red-400 focus:border-red-500 focus:ring-red-200"
              : "border-slate-300 hover:border-slate-400 focus:border-rose-500 focus:ring-rose-200",
            className
          )}
          {...props}
        />

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

Textarea.displayName = "Textarea";
export default Textarea;
