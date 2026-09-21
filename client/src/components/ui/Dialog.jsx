import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "../../utils/cn";

export function Dialog({
  isOpen,
  open,
  onClose,
  children,
  className,
  closeOnBackdrop = true,
}) {
  const dialogRef = useRef(null);
  const show = isOpen ?? open;

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && show) {
        onClose?.();
      }
    };

    if (show) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
    >
      {/* Backdrop */}
      <div
        onClick={() => closeOnBackdrop && onClose?.()}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in-0 duration-200"
      />

      {/* Content Container */}
      <div
        ref={dialogRef}
        className={cn(
          "relative z-10 w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-xl ring-1 ring-slate-900/5 dark:ring-slate-800 text-slate-900 dark:text-slate-100 transition-all animate-in fade-in-0 zoom-in-95 duration-200",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function DialogHeader({ className, children, ...props }) {
  return (
    <div
      className={cn("flex items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800", className)}
      {...props}
    >
      <div className="space-y-1">{children}</div>
    </div>
  );
}

export function DialogTitle({ className, children, ...props }) {
  return (
    <h2
      className={cn("text-lg font-semibold text-slate-900 dark:text-slate-100", className)}
      {...props}
    >
      {children}
    </h2>
  );
}

export function DialogDescription({ className, children, ...props }) {
  return (
    <p
      className={cn("text-sm text-slate-500 dark:text-slate-400", className)}
      {...props}
    >
      {children}
    </p>
  );
}

export function DialogBody({ className, children, ...props }) {
  return (
    <div className={cn("py-4 text-sm text-slate-700 dark:text-slate-300", className)} {...props}>
      {children}
    </div>
  );
}

export function DialogFooter({ className, children, ...props }) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function DialogCloseButton({ onClose, className }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Close dialog"
      className={cn(
        "rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer",
        className
      )}
    >
      <X className="h-5 w-5" />
    </button>
  );
}

export default Dialog;
