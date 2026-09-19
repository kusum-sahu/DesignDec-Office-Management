import { History, CheckCircle2, XCircle, Clock, User, ShieldCheck } from "lucide-react";
import Dialog, {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "../ui/Dialog";
import Button from "../ui/Button";
import { format } from "date-fns";

export function AuditTrailModal({ isOpen, onClose, correction }) {
  if (!correction) return null;

  const employee = correction.employee || {};
  const reviewer = correction.correctedBy || {};
  const auditTrail = correction.auditTrail || [];
  const attendanceDate = correction.attendanceDate ? new Date(correction.attendanceDate) : null;

  const getActionBadge = (action) => {
    switch (action) {
      case "REQUEST_SUBMITTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="h-3 w-3" /> Request Created
          </span>
        );
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3" /> Approved
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="h-3 w-3" /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
            {action}
          </span>
        );
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} className="max-w-xl">
      <DialogHeader>
        <div className="flex items-center gap-2 text-slate-900">
          <History className="h-5 w-5 text-rose-600" />
          <DialogTitle>Audit Trail & Verification History</DialogTitle>
        </div>
        <DialogDescription>
          Immutable compliance record tracking all actions, timestamps, and reviews for this attendance correction.
        </DialogDescription>
      </DialogHeader>

      <DialogBody className="space-y-5">
        {/* Top Summary Card */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px] font-medium">Employee</span>
            <span className="font-bold text-slate-800 block text-sm mt-0.5">
              {employee.name || "Employee"}
            </span>
            <span className="text-[10px] text-slate-400 block">
              {employee.employeeId || "DD-EMP"} • {employee.branch || "Main Office"}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px] font-medium">Attendance Date</span>
            <span className="font-bold text-slate-800 block text-sm mt-0.5">
              {attendanceDate ? format(attendanceDate, "dd MMM yyyy") : "--"}
            </span>
            <span className="text-[10px] text-slate-500 block">
              Requested Check-Out: {correction.requestedCheckOutTime ? format(new Date(correction.requestedCheckOutTime), "hh:mm a") : "--"}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px] font-medium">Current Status</span>
            <div className="mt-1">
              <span
                className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                  correction.status === "Approved"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : correction.status === "Rejected"
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}
              >
                {correction.status}
              </span>
            </div>
            {correction.correctedAt && (
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Reviewed on {format(new Date(correction.correctedAt), "dd MMM yyyy, hh:mm a")}
              </span>
            )}
          </div>
        </div>

        {/* Employee Reason */}
        <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/70 text-xs">
          <span className="text-slate-400 font-bold block text-[11px] uppercase tracking-wider mb-1">
            Employee's Submitted Reason
          </span>
          <p className="text-slate-700 italic">"{correction.reason}"</p>
        </div>

        {/* Manager Action Reason / Review Remarks (if any) */}
        {correction.actionReason && (
          <div className="p-3.5 rounded-xl bg-rose-50/40 border border-rose-100 text-xs">
            <span className="text-rose-600 font-bold block text-[11px] uppercase tracking-wider mb-1">
              Manager Review Remarks / Reason
            </span>
            <p className="text-slate-800 font-medium">"{correction.actionReason}"</p>
            {reviewer.name && (
              <span className="text-[10.5px] text-slate-400 block mt-1">
                — {reviewer.name} ({reviewer.role || "Manager"})
              </span>
            )}
          </div>
        )}

        {/* Chronological Audit Trail Timeline */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-900 block">Chronological Audit Events</span>
          <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {auditTrail.map((event, idx) => {
              const performer = event.performedBy || {};
              const eventDate = event.timestamp ? new Date(event.timestamp) : new Date();

              return (
                <div key={idx} className="relative text-xs">
                  <div className="absolute -left-6 top-0.5 h-3 w-3 rounded-full bg-rose-500 ring-4 ring-white" />
                  <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      {getActionBadge(event.action)}
                      <span className="text-[10.5px] text-slate-400 font-medium">
                        {format(eventDate, "dd MMM yyyy, hh:mm:ss a")}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-600 text-[11px]">
                      <User className="h-3 w-3 text-slate-400" />
                      <span>
                        Action by: <strong>{performer.name || "User"}</strong> ({event.performedByRole})
                      </span>
                    </div>

                    {event.details && (
                      <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 grid grid-cols-2 gap-2">
                        {event.details.checkOutTime && (
                          <div>
                            <span className="text-slate-400 block">Check-Out:</span>
                            <span className="font-semibold text-slate-700">
                              {format(new Date(event.details.checkOutTime), "hh:mm a")}
                            </span>
                          </div>
                        )}
                        {event.details.workingHours !== undefined && (
                          <div>
                            <span className="text-slate-400 block">Working Hours:</span>
                            <span className="font-semibold text-slate-700">
                              {event.details.workingHours}h
                            </span>
                          </div>
                        )}
                        {event.details.rejectionReason && (
                          <div className="col-span-2">
                            <span className="text-rose-500 block">Rejection Reason:</span>
                            <span className="text-slate-700 font-medium">
                              {event.details.rejectionReason}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </DialogBody>

      <DialogFooter>
        <Button variant="outline" size="sm" onClick={onClose}>
          Close
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

export default AuditTrailModal;
