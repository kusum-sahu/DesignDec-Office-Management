import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      richColors
      closeButton
      expand={false}
      toastOptions={{
        classNames: {
          toast:
            "rounded-xl border border-slate-200 shadow-lg font-sans text-sm p-4",
          description: "text-slate-500 text-xs",
          actionButton:
            "bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-lg text-xs px-3 py-1.5",
          cancelButton:
            "bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-xs px-3 py-1.5",
        },
      }}
    />
  );
}

export default Toaster;
