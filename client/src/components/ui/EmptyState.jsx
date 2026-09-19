import { FolderOpen } from "lucide-react";
import { cn } from "../../utils/cn";
import Button from "./Button";

export function EmptyState({
  icon: Icon = FolderOpen,
  title = "No data found",
  description = "There are no records to display at this moment.",
  actionLabel,
  onAction,
  className,
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center sm:p-12",
        className
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-8 ring-rose-50/50 mb-4">
        <Icon className="h-7 w-7" />
      </div>

      <h3 className="text-base font-semibold text-slate-900 mb-1">{title}</h3>
      <p className="max-w-sm text-sm text-slate-500 mb-6">{description}</p>

      {actionLabel && onAction && (
        <Button onClick={onAction} variant="primary" size="sm">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export default EmptyState;
