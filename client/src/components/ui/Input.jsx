import { forwardRef, useId } from "react";
import { cn } from "../../utils/cn";

export const Input = forwardRef(
  (
    {
      className,
      type = "text",
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      id,
      name,
      required,
      disabled,
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

        <div className="relative rounded-lg shadow-xs">
          {leftIcon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            name={name}
            type={type}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={
              error ? errorId : helperText ? helperId : undefined
            }
            className={cn(
              "block w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500",
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              error
                ? "border-red-400 focus:border-red-500 focus:ring-red-200"
                : "border-slate-300 hover:border-slate-400 focus:border-rose-500 focus:ring-rose-200",
              className
            )}
            {...props}
          />

          {rightIcon && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
              {rightIcon}
            </div>
          )}
        </div>

        {error && (
          <p id={errorId} className="text-xs font-medium text-red-600 animate-in fade-in-50">
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

Input.displayName = "Input";
export default Input;
