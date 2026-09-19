import { Loader2 } from "lucide-react";
import { cn } from "../../utils/cn";

export function PageLoader({ message = "Loading DesignDec...", className }) {
  return (
    <div
      className={cn(
        "flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center p-6",
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-8 ring-rose-50/50">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
      <p className="text-sm font-medium text-slate-500 animate-pulse">{message}</p>
    </div>
  );
}

export default PageLoader;
