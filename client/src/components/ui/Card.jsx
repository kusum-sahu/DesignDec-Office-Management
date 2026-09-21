import { forwardRef } from "react";
import { cn } from "../../utils/cn";

export const Card = forwardRef(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs transition-shadow",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = "Card";

export const CardHeader = forwardRef(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex flex-col space-y-1.5 p-5 sm:p-6", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
CardHeader.displayName = "CardHeader";

export const CardTitle = forwardRef(
  ({ className, children, as: Component = "h3", ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn(
          "text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100",
          className
        )}
        {...props}
      >
        {children}
      </Component>
    );
  }
);
CardTitle.displayName = "CardTitle";

export const CardDescription = forwardRef(
  ({ className, children, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={cn("text-sm text-slate-500 dark:text-slate-400 leading-relaxed", className)}
        {...props}
      >
        {children}
      </p>
    );
  }
);
CardDescription.displayName = "CardDescription";

export const CardContent = forwardRef(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("p-5 sm:p-6 pt-0", className)} {...props}>
        {children}
      </div>
    );
  }
);
CardContent.displayName = "CardContent";

export const CardFooter = forwardRef(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center p-5 sm:p-6 pt-0 border-t border-slate-100 mt-4",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
CardFooter.displayName = "CardFooter";

export default Card;
