import { useState } from "react";
import { AlertCircle, XCircle } from "lucide-react";
import Dialog, {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "../ui/Dialog";
import Button from "../ui/Button";

export function RejectReasonModal({ isOpen, onClose, onConfirm, isSubmitting }) {
  const [reason, setReason] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 3) return;
    onConfirm(reason.trim());
  };

  const handleClose = () => {
    setReason("");
    onClose();
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} className="max-w-md">
      <DialogHeader>
        <div className="flex items-center gap-2 text-rose-600">
          <XCircle className="h-5 w-5 text-rose-600" />
          <DialogTitle>Reject Correction Request</DialogTitle>
        </div>
        <DialogDescription>
          Provide a mandatory reason for rejecting this correction request.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit}>
        <DialogBody className="space-y-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Rejection Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Security CCTV logs contradict requested check-out time..."
              required
              minLength={3}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-rose-400 text-slate-800 placeholder:text-slate-400 resize-none"
            />
            <span className="text-[10.5px] text-slate-400 block">
              This explanation will be permanently recorded in the audit trail and visible to the employee.
            </span>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="danger"
            size="sm"
            isLoading={isSubmitting}
            disabled={!reason.trim() || reason.trim().length < 3}
          >
            Confirm Rejection
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

export default RejectReasonModal;
