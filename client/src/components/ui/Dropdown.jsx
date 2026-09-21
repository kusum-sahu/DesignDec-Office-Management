import { useState, useRef, useEffect } from "react";
import { cn } from "../../utils/cn";

export function Dropdown({
  trigger,
  children,
  align = "right",
  className,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <div onClick={() => setIsOpen((prev) => !prev)} className="cursor-pointer">
        {trigger}
      </div>

      {isOpen && (
        <div
          role="menu"
          className={cn(
            "absolute z-50 mt-2 min-w-48 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 shadow-lg ring-1 ring-slate-900/5 dark:ring-slate-800 text-slate-900 dark:text-slate-100 transition-all animate-in fade-in-0 zoom-in-95",
            align === "right" ? "right-0 origin-top-right" : "left-0 origin-top-left",
            className
          )}
          onClick={() => setIsOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({
  children,
  onClick,
  icon: Icon,
  destructive = false,
  disabled = false,
  className,
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-left font-medium transition-colors cursor-pointer",
        destructive
          ? "text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-700"
          : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100",
        disabled && "pointer-events-none opacity-50 cursor-not-allowed",
        className
      )}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />}
      <span>{children}</span>
    </button>
  );
}

export function DropdownDivider() {
  return <div className="my-1 border-t border-slate-100 dark:border-slate-800" />;
}

export function DropdownLabel({ children, className }) {
  return (
    <div
      className={cn(
        "px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400",
        className
      )}
    >
      {children}
    </div>
  );
}

export default Dropdown;
