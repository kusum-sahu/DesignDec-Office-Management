import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, AlertTriangle, Send, Calendar, Loader2 } from "lucide-react";
import Dialog, {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "../ui/Dialog";
import Button from "../ui/Button";
import attendanceApi from "../../api/attendance.api";
import { toast } from "../../utils/toast";
import { format } from "date-fns";

export function CorrectionRequestModal({
  isOpen,
  onClose,
  onSuccess,
  attendanceRecord,
}) {
  const queryClient = useQueryClient();
  const [requestedTime, setRequestedTime] = useState("18:30");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch incomplete attendance record fallback if record was not directly passed
  const { data: incompleteData, isLoading: isIncompleteLoading } = useQuery({
    queryKey: ["incomplete-attendance-records"],
    queryFn: () => attendanceApi.getIncomplete(),
    enabled: Boolean(isOpen && !attendanceRecord),
    staleTime: 5000,
  });

  const activeRecord =
    attendanceRecord ||
    (incompleteData?.data && incompleteData.data.length > 0
      ? incompleteData.data.find((r) => !r.hasPendingCorrection) || incompleteData.data[0]
      : null);

  const attendanceDate = activeRecord?.attendanceDate
    ? new Date(activeRecord.attendanceDate)
    : new Date();

  const checkInTime = activeRecord?.checkInTime
    ? new Date(activeRecord.checkInTime)
    : activeRecord?.checkIn?.time
    ? new Date(activeRecord.checkIn.time)
    : null;

  useEffect(() => {
    if (isOpen) {
      setReason("");
      setRequestedTime("18:30");
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!activeRecord) {
      toast.error("Record Missing", {
        description: "No incomplete attendance record identified to correct.",
      });
      return;
    }

    if (!reason.trim() || reason.trim().length < 3) {
      toast.error("Reason Required", {
        description: "Please provide a valid explanation of at least 3 characters.",
      });
      return;
    }

    if (!requestedTime) {
      toast.error("Time Required", {
        description: "Please specify your actual check-out time.",
      });
      return;
    }

    // Construct target Date object combining attendanceDate and requestedTime (HH:MM)
    const [hours, minutes] = requestedTime.split(":").map(Number);
    const targetCheckOut = new Date(attendanceDate);
    targetCheckOut.setHours(hours, minutes, 0, 0);

    if (checkInTime && targetCheckOut <= checkInTime) {
      toast.error("Invalid Time", {
        description: `Check-out time must be after your check-in time (${format(checkInTime, "hh:mm a")}).`,
      });
      return;
    }

    if (targetCheckOut.getTime() > Date.now()) {
      toast.error("Future Time", {
        description: "Check-out time cannot be in the future.",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await attendanceApi.submitCorrectionRequest({
        attendanceId: activeRecord.attendanceId || activeRecord._id,
        requestedCheckOutTime: targetCheckOut.toISOString(),
        reason: reason.trim(),
      });

      // Immediately invalidate queries so that warning banners disappear and lists refresh
      queryClient.invalidateQueries({ queryKey: ["today-attendance"] });
      queryClient.invalidateQueries({ queryKey: ["incomplete-attendance-records"] });
      queryClient.invalidateQueries({ queryKey: ["my-correction-requests"] });
      queryClient.invalidateQueries({ queryKey: ["all-correction-requests"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-history"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });

      toast.success("Correction Request Submitted!", {
        description:
          res?.message ||
          "Your request has been forwarded to Admin and Branch Admin for review.",
      });

      setReason("");
      if (onSuccess) onSuccess(res?.data);
      onClose();
    } catch (err) {
      console.error("Correction submit error:", err);
      const msg =
        err.response?.data?.message || "Failed to submit correction request.";
      toast.error("Submission Failed", { description: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} className="max-w-md">
      <DialogHeader>
        <div className="flex items-center gap-2 text-amber-600">
          <Clock className="h-5 w-5 text-amber-600" />
          <DialogTitle>Attendance Correction Request</DialogTitle>
        </div>
        <DialogDescription>
          Request an official check-out time correction for an incomplete attendance record.
        </DialogDescription>
      </DialogHeader>

      {isIncompleteLoading && !activeRecord ? (
        <div className="py-12 text-center text-slate-400 space-y-2">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-rose-500" />
          <p className="text-xs">Loading attendance record...</p>
        </div>
      ) : !activeRecord ? (
        <div className="py-8 text-center text-slate-500 space-y-3 px-4">
          <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto" />
          <p className="text-xs font-bold text-slate-800">
            No Incomplete Attendance Record Found
          </p>
          <p className="text-[11px] text-slate-400">
            You have already checked out for all past dates or submitted requests are currently under review.
          </p>
          <div className="pt-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <DialogBody className="space-y-4">
            {/* Policy Notice: Employees cannot edit previous records directly */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-900 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold block">Company Policy Compliance</span>
                <span className="text-amber-800 text-[11px] leading-relaxed block">
                  Employees cannot directly edit previous check-in or check-out times. All correction requests are audited and require approval from an Admin or Branch Admin.
                </span>
              </div>
            </div>

            {/* If record already has pending correction */}
            {activeRecord?.hasPendingCorrection && (
              <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-3 text-xs text-blue-900 flex items-center gap-2.5">
                <Clock className="h-4.5 w-4.5 text-blue-600 shrink-0" />
                <div>
                  <span className="font-bold block text-blue-950">Correction Request Already Submitted</span>
                  <span className="text-[11px] text-blue-800">
                    A correction request for this date is currently pending approval by your Admin or Branch Admin.
                  </span>
                </div>
              </div>
            )}

            {/* Attendance Date & Check-in Summary */}
            <div className="grid grid-cols-2 gap-3 bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px] font-medium">Attendance Date</span>
                <div className="flex items-center gap-1.5 font-bold text-slate-800 mt-0.5">
                  <Calendar className="h-3.5 w-3.5 text-rose-500" />
                  <span>{format(attendanceDate, "dd MMMM yyyy")}</span>
                </div>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] font-medium">Original Check-in</span>
                <div className="flex items-center gap-1.5 font-bold text-slate-800 mt-0.5">
                  <Clock className="h-3.5 w-3.5 text-emerald-500" />
                  <span>{checkInTime ? format(checkInTime, "hh:mm a") : "--"}</span>
                </div>
              </div>
            </div>

            {/* Requested Check-out Time */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Actual Check-Out Time <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="time"
                  value={requestedTime}
                  onChange={(e) => setRequestedTime(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-rose-400 text-slate-800"
                />
              </div>
              <span className="text-[10.5px] text-slate-400 block">
                Specify the approximate time you departed from the office on {format(attendanceDate, "dd MMM")}.
              </span>
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Reason for Missed Check-Out <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Forgot to check out before leaving office, device battery died, power outage, etc."
                required
                minLength={3}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-rose-400 text-slate-800 placeholder:text-slate-400 resize-none"
              />
              <span className="text-[10.5px] text-slate-400 block">
                Provide a clear reason for administrative review.
              </span>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
              disabled={isSubmitting || !activeRecord || activeRecord?.hasPendingCorrection}
              leftIcon={<Send className="h-3.5 w-3.5" />}
            >
              Submit Request
            </Button>
          </DialogFooter>
        </form>
      )}
    </Dialog>
  );
}

export default CorrectionRequestModal;
