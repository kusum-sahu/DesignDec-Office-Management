import { forwardRef } from "react";
import { cva } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "../../utils/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary:
          "bg-rose-600 text-white shadow-sm hover:bg-rose-700 focus-visible:ring-rose-500 border border-transparent",
        secondary:
          "bg-slate-100 text-slate-800 hover:bg-slate-200 focus-visible:ring-slate-400 border border-transparent",
        outline:
          "border border-slate-300 bg-white text-slate-700 shadow-xs hover:bg-slate-50 hover:text-slate-900 focus-visible:ring-rose-500",
        ghost:
          "text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-slate-400",
        destructive:
          "bg-red-600 text-white shadow-sm hover:bg-red-700 focus-visible:ring-red-500 border border-transparent",
        brandSoft:
          "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 focus-visible:ring-rose-500",
        link: "text-rose-600 underline-offset-4 hover:underline p-0 h-auto font-medium",
      },
      size: {
        sm: "h-8 px-3 text-xs rounded-md",
        md: "h-10 px-4 py-2 text-sm rounded-lg",
        lg: "h-12 px-6 text-base rounded-xl",
        icon: "h-10 w-10 p-0 rounded-lg shrink-0",
        "icon-sm": "h-8 w-8 p-0 rounded-md shrink-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export const Button = forwardRef(
  (
    {
      className,
      variant,
      size,
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      type = "button",
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-current" />
            <span>{children}</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
