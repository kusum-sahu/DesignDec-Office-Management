import { AlertTriangle, Info } from "lucide-react";
import Dialog, {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
  DialogCloseButton,
} from "./Dialog";
import Button from "./Button";

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  description = "Are you sure you want to proceed? This action cannot be undone.",
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDestructive = false,
  isLoading = false,
}) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} className="max-w-md">
      <DialogHeader>
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              isDestructive ? "bg-red-100 text-red-600" : "bg-rose-100 text-rose-600"
            }`}
          >
            {isDestructive ? (
              <AlertTriangle className="h-5 w-5" />
            ) : (
              <Info className="h-5 w-5" />
            )}
          </div>
          <div>
            <DialogTitle>{title}</DialogTitle>
          </div>
        </div>
        <DialogCloseButton onClose={onClose} />
      </DialogHeader>

      <DialogBody>
        <DialogDescription>{description}</DialogDescription>
      </DialogBody>

      <DialogFooter>
        <Button
          variant="outline"
          onClick={onClose}
          disabled={isLoading}
        >
          {cancelText}
        </Button>
        <Button
          variant={isDestructive ? "destructive" : "primary"}
          onClick={onConfirm}
          isLoading={isLoading}
        >
          {confirmText}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

export default ConfirmDialog;
