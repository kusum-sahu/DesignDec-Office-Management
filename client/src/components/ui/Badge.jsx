import { cva } from "class-variance-authority";
import { cn } from "../../utils/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors select-none",
  {
    variants: {
      variant: {
        brand:
          "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100/80",
        success:
          "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100/80",
        warning:
          "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100/80",
        destructive:
          "border-red-200 bg-red-50 text-red-700 hover:bg-red-100/80",
        info: "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100/80",
        secondary:
          "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200/80",
        outline: "border-slate-300 bg-transparent text-slate-700",
      },
      size: {
        sm: "px-2 py-0.2 text-[11px]",
        md: "px-2.5 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "md",
    },
  }
);

export function Badge({
  className,
  variant,
  size,
  withDot = false,
  children,
  ...props
}) {
  return (
    <span
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    >
      {withDot && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            variant === "brand" && "bg-rose-600",
            variant === "success" && "bg-emerald-500",
            variant === "warning" && "bg-amber-500",
            variant === "destructive" && "bg-red-500",
            variant === "info" && "bg-blue-500",
            (!variant || variant === "secondary" || variant === "outline") &&
              "bg-slate-400"
          )}
        />
      )}
      {children}
    </span>
  );
}

export default Badge;
