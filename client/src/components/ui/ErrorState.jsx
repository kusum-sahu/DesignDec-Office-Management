import { AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "../../utils/cn";
import Button from "./Button";

export function ErrorState({
  title = "Something went wrong",
  message = "Failed to load data. Please check your connection and try again.",
  onRetry,
  className,
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center sm:p-12",
        className
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600 ring-8 ring-red-50/50 mb-4">
        <AlertCircle className="h-7 w-7" />
      </div>

      <h3 className="text-base font-semibold text-slate-900 mb-1">{title}</h3>
      <p className="max-w-sm text-sm text-slate-500 mb-6">{message}</p>

      {onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
          size="sm"
          leftIcon={<RefreshCw className="h-4 w-4" />}
        >
          Try Again
        </Button>
      )}
    </div>
  );
}

export default ErrorState;
