import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarCheck,
  Camera,
  MapPin,
  Clock,
  Play,
  Square,
  Info,
  Calendar as CalendarIcon,
  AlertTriangle,
  History,
  Building2,
  Send,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { format, isToday } from "date-fns";
import useAuthStore from "../../stores/authStore";
import attendanceApi from "../../api/attendance.api";
import CheckInModal from "../../components/attendance/CheckInModal";
import CorrectionRequestModal from "../../components/attendance/CorrectionRequestModal";
import AuditTrailModal from "../../components/attendance/AuditTrailModal";
import AdminAttendancePage from "./AdminAttendancePage";
import { TableSkeleton } from "../../components/ui/Skeleton";

export function AttendancePage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.role === "Admin";
  const isBranchManager =
    user?.role === "Branch Manager" ||
    (user?.role !== "Admin" && /^\s*branch\s*man?ager\s*$/i.test(user?.designation || ""));

  const [branchManagerMode, setBranchManagerMode] = useState("personal"); // "personal" | "branch"
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [selectedRecordForCorrection, setSelectedRecordForCorrection] = useState(null);
  const [selectedCorrectionForAudit, setSelectedCorrectionForAudit] = useState(null);
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [bottomTab, setBottomTab] = useState("history"); // "history" | "requests"

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));

  // Dedicated Today's Attendance Query (Backend as Single Source of Truth)
  const {
    data: todayResponse,
    refetch: refetchToday,
  } = useQuery({
    queryKey: ["today-attendance", user?._id],
    queryFn: () => attendanceApi.getToday(),
    enabled: !isAdmin,
  });

  // Query Employee Attendance History
  const { data: historyResponse, isLoading } = useQuery({
    queryKey: ["attendance-history", selectedMonth, selectedYear],
    queryFn: () =>
      attendanceApi.getHistory({
        month: selectedMonth,
        year: selectedYear,
        limit: 31,
      }),
    enabled: !isAdmin,
  });

  // Query Employee's Own Correction Requests
  const { data: myCorrectionsResponse, refetch: refetchMyCorrections } = useQuery({
    queryKey: ["my-correction-requests", user?._id],
    queryFn: () => attendanceApi.getMyCorrectionRequests(),
    enabled: !isAdmin,
  });

  const myCorrections = myCorrectionsResponse?.data || [];

  // If user is Admin, or Branch Manager viewing Branch Mode, render Admin Attendance Suite
  if (isAdmin || (isBranchManager && branchManagerMode === "branch")) {
    return (
      <div className="space-y-4">
        {isBranchManager && (
          <div className="flex items-center justify-between bg-white border border-rose-100 rounded-2xl p-3.5 px-5 shadow-2xs">
            <div className="flex items-center gap-2 text-xs text-slate-700 font-semibold">
              <Building2 className="h-4 w-4 text-rose-600" />
              <span>Branch Management Mode • {user?.branch || "Santoshpur Branch"}</span>
            </div>
            <button
              type="button"
              onClick={() => setBranchManagerMode("personal")}
              className="text-xs font-bold text-rose-600 hover:text-rose-800 underline cursor-pointer"
            >
              Switch to My Personal Attendance View →
            </button>
          </div>
        )}
        <AdminAttendancePage />
      </div>
    );
  }


  const attendanceRecords = historyResponse?.data || [];

  // Single Source of Truth for today:
  const todayRecord =
    todayResponse?.data ||
    attendanceRecords.find((att) => {
      const attDate = new Date(att.attendanceDate);
      return isToday(attDate);
    }) ||
    null;

  const isCheckedIn = Boolean(todayRecord?.checkIn?.time);
  const isCheckedOut = Boolean(todayRecord?.checkOut?.time);

  const handleModalSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["today-attendance"] });
    queryClient.invalidateQueries({ queryKey: ["attendance-history"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    queryClient.invalidateQueries({ queryKey: ["employee-attendance-history"] });
    refetchToday();
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Present":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">Present</span>;
      case "Late":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-100">Late</span>;
      case "Absent":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-600 border border-red-100">Absent</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-600 border border-rose-100">{status || "Not Marked"}</span>;
    }
  };

  const API_SERVER_URL = import.meta.env.VITE_API_BASE_URL
    ? import.meta.env.VITE_API_BASE_URL.replace("/api/v1", "")
    : "http://localhost:5000";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rose-100/70 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-heading">
            Attendance
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Mark your attendance and view your attendance history.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {isBranchManager && (
            <button
              type="button"
              onClick={() => setBranchManagerMode("branch")}
              className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors shadow-2xs cursor-pointer"
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>Manage Branch Attendance →</span>
            </button>
          )}

          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/90 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs">
            <CalendarIcon className="h-3.5 w-3.5 text-rose-600" />
            <span>{format(new Date(), "EEEE, d MMMM yyyy")}</span>
          </div>
        </div>
      </div>

      {/* Incomplete Previous Attendance Warning Banner */}
      {todayResponse?.incompletePreviousAttendance &&
        !todayResponse.incompletePreviousAttendance.hasPendingCorrection &&
        todayResponse.incompletePreviousAttendance.warningMessage && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50/90 p-4.5 text-xs text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-900 text-sm">
                You didn’t check out on {todayResponse.incompletePreviousAttendance.dateFormatted}. Please submit a correction request.
              </h3>
              <p className="text-amber-800 text-[11px] leading-relaxed">
                Your today's check-in is <span className="font-semibold text-emerald-700">not blocked</span>. Employees cannot directly edit past timestamps.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedRecordForCorrection(todayResponse.incompletePreviousAttendance);
              setIsCorrectionModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-all shadow-2xs cursor-pointer whitespace-nowrap self-stretch sm:self-auto text-center"
          >
            Submit Correction Request
          </button>
        </div>
      )}

      {/* Top Row: Today's Attendance, How It Works, Date & Working Hours */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Today's Attendance Action Card (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-rose-100/70 shadow-2xs flex flex-col justify-between">
          <div className="space-y-2 text-center py-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50/70 border border-rose-100 text-xs font-bold text-slate-800">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  isCheckedOut
                    ? "bg-slate-400"
                    : isCheckedIn
                    ? "bg-emerald-500 animate-pulse"
                    : "bg-rose-500"
                }`}
              />
              <span>
                {isCheckedOut
                  ? "Checked Out Today"
                  : isCheckedIn
                  ? "Currently Checked In"
                  : "Not Checked In"}
              </span>
            </div>

            <p className="text-xs text-slate-500 max-w-xs mx-auto pt-1">
              {isCheckedOut
                ? "Your work hours for today have been logged."
                : isCheckedIn
                ? "You are logged in. Don't forget to check out at the end of your shift."
                : "Start your day by checking in at the office."}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCheckInModalOpen(true)}
            disabled={isCheckedOut}
            className={`w-full py-3.5 px-6 rounded-full text-sm font-bold text-white shadow-md flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
              isCheckedOut
                ? "bg-slate-300 cursor-not-allowed shadow-none"
                : isCheckedIn
                ? "bg-slate-800 hover:bg-slate-900 shadow-slate-200"
                : "bg-rose-600 hover:bg-rose-700 shadow-rose-200 hover:shadow-lg"
            }`}
          >
            {isCheckedIn ? (
              <>
                <Square className="h-4 w-4 fill-white" />
                <span>Check Out</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-white" />
                <span>Check In</span>
              </>
            )}
          </button>
        </div>

        {/* How It Works (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-5 border border-rose-100/70 shadow-2xs">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
            How it works?
          </h2>

          <div className="space-y-2.5 text-xs text-slate-600">
            <div className="flex items-start gap-2.5">
              <span className="flex h-5 w-5 rounded-full bg-rose-50 text-rose-600 font-bold text-[10px] items-center justify-center shrink-0">
                1
              </span>
              <span>Click on <strong>Check In</strong></span>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="flex h-5 w-5 rounded-full bg-rose-50 text-rose-600 font-bold text-[10px] items-center justify-center shrink-0">
                2
              </span>
              <span>Allow camera & location permissions</span>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="flex h-5 w-5 rounded-full bg-rose-50 text-rose-600 font-bold text-[10px] items-center justify-center shrink-0">
                3
              </span>
              <span>Your photo and location will be captured automatically</span>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="flex h-5 w-5 rounded-full bg-rose-50 text-rose-600 font-bold text-[10px] items-center justify-center shrink-0">
                4
              </span>
              <span>Click on <strong>Check Out</strong> after your work hours</span>
            </div>
          </div>
        </div>

        {/* Today's Date & Working Hours (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-rose-100/70 shadow-2xs flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 shrink-0">
              <CalendarIcon className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Today's Date</span>
              <span className="text-sm font-bold text-slate-900 block">
                {format(new Date(), "d MMM yyyy")}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-rose-100/70 shadow-2xs flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 shrink-0">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Working Hours (Today)</span>
              <span className="text-sm font-bold text-slate-900 block">
                {todayRecord?.workingHours ? `${todayRecord.workingHours}h` : "--"}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 text-[11px] text-blue-700 flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
            <span>Your photo and location are logged automatically for workplace compliance.</span>
          </div>
        </div>
      </div>

      {/* Middle Row: 4 Inspection Cards (Today's Details, Check In Photo, Check Out Photo, Location) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
        {/* Today's Details */}
        <div className="bg-white rounded-2xl p-4.5 border border-rose-100/70 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-rose-50">
            <Clock className="h-4 w-4 text-rose-600" />
            <h3 className="text-xs font-bold text-slate-900">Today's Details</h3>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Check In:</span>
              <span className="font-semibold text-slate-800">
                {todayRecord?.checkIn?.time ? format(new Date(todayRecord.checkIn.time), "hh:mm a") : "--"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Check Out:</span>
              <span className="font-semibold text-slate-800">
                {todayRecord?.checkOut?.time ? format(new Date(todayRecord.checkOut.time), "hh:mm a") : "--"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Working Hours:</span>
              <span className="font-semibold text-slate-800">
                {todayRecord?.workingHours ? `${todayRecord.workingHours}h` : "--"}
              </span>
            </div>
            <div className="flex justify-between pt-1 border-t border-rose-50">
              <span className="text-slate-500">Status:</span>
              {getStatusBadge(todayRecord?.attendanceStatus)}
            </div>
          </div>
        </div>

        {/* Check In Photo */}
        <div className="bg-white rounded-2xl p-4.5 border border-rose-100/70 shadow-2xs space-y-2">
          <div className="flex items-center gap-2 pb-2 border-b border-rose-50">
            <Camera className="h-4 w-4 text-rose-600" />
            <h3 className="text-xs font-bold text-slate-900">Check In Photo</h3>
          </div>
          <div className="aspect-4/3 rounded-xl bg-rose-50/50 border border-rose-100/70 overflow-hidden flex items-center justify-center text-center">
            {todayRecord?.checkIn?.photo ? (
              <img
                src={`${API_SERVER_URL}/${todayRecord.checkIn.photo}`}
                alt="Check in selfie"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="p-3 text-slate-400 text-xs space-y-1">
                <Camera className="h-6 w-6 mx-auto text-rose-300" />
                <span className="block text-[11px]">No photo yet</span>
              </div>
            )}
          </div>
        </div>

        {/* Check Out Photo */}
        <div className="bg-white rounded-2xl p-4.5 border border-rose-100/70 shadow-2xs space-y-2">
          <div className="flex items-center gap-2 pb-2 border-b border-rose-50">
            <Camera className="h-4 w-4 text-rose-600" />
            <h3 className="text-xs font-bold text-slate-900">Check Out Photo</h3>
          </div>
          <div className="aspect-4/3 rounded-xl bg-rose-50/50 border border-rose-100/70 overflow-hidden flex items-center justify-center text-center">
            {todayRecord?.checkOut?.photo ? (
              <img
                src={`${API_SERVER_URL}/${todayRecord.checkOut.photo}`}
                alt="Check out selfie"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="p-3 text-slate-400 text-xs space-y-1">
                <Camera className="h-6 w-6 mx-auto text-rose-300" />
                <span className="block text-[11px]">No photo yet</span>
              </div>
            )}
          </div>
        </div>

        {/* Location (Today) */}
        <div className="bg-white rounded-2xl p-4.5 border border-rose-100/70 shadow-2xs space-y-2">
          <div className="flex items-center gap-2 pb-2 border-b border-rose-50">
            <MapPin className="h-4 w-4 text-rose-600" />
            <h3 className="text-xs font-bold text-slate-900">Location (Today)</h3>
          </div>
          <div className="aspect-4/3 rounded-xl bg-slate-50 border border-slate-200/80 p-3 flex flex-col items-center justify-center text-center relative overflow-hidden">
            <div className="h-9 w-9 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-1.5 animate-bounce">
              <MapPin className="h-5 w-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">
              {todayRecord?.checkIn?.location?.address || "Main Office Workspace"}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5">
              {todayRecord?.checkIn?.location?.latitude
                ? `${todayRecord.checkIn.location.latitude.toFixed(4)}, ${todayRecord.checkIn.location.longitude.toFixed(4)}`
                : "Location coordinates locked"}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Section: Attendance History & My Correction Requests */}
      <div className="bg-white rounded-2xl border border-rose-100/70 shadow-2xs overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 border-b border-rose-50 gap-3">
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => setBottomTab("history")}
              className={`pb-1 text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                bottomTab === "history"
                  ? "text-rose-600 border-b-2 border-rose-600"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <CalendarCheck className="h-4.5 w-4.5" />
              <span>Attendance History</span>
            </button>

            <button
              type="button"
              onClick={() => setBottomTab("requests")}
              className={`pb-1 text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                bottomTab === "requests"
                  ? "text-rose-600 border-b-2 border-rose-600"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <History className="h-4.5 w-4.5" />
              <span>My Correction Requests</span>
              {myCorrections.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10.5px] font-bold bg-rose-100 text-rose-700">
                  {myCorrections.length}
                </span>
              )}
            </button>
          </div>

          {bottomTab === "history" && (
            <div className="flex items-center gap-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                aria-label="Filter Attendance Month"
                className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs cursor-pointer focus:outline-none"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => {
                  const d = new Date(Number(selectedYear), m - 1, 1);
                  return (
                    <option key={m} value={String(m)}>
                      {format(d, "MMMM yyyy")}
                    </option>
                  );
                })}
              </select>
            </div>
          )}
        </div>

        {bottomTab === "history" ? (
          isLoading ? (
            <TableSkeleton rows={5} columns={8} />
          ) : (

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-rose-50/40 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-rose-50">
                <tr>
                  <th className="py-3 px-5">Date</th>
                  <th className="py-3 px-5">Day</th>
                  <th className="py-3 px-5">Check In</th>
                  <th className="py-3 px-5">Check Out</th>
                  <th className="py-3 px-5">Working Hours</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5">In Photo</th>
                  <th className="py-3 px-5">Out Photo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rose-50">
                {attendanceRecords.length > 0 ? (
                  attendanceRecords.map((att) => {
                    const dateObj = new Date(att.attendanceDate);
                    return (
                      <tr key={att._id} className="hover:bg-rose-50/30 transition-colors">
                        <td className="py-3.5 px-5 font-semibold text-slate-800">
                          {format(dateObj, "dd MMM yyyy")}
                        </td>
                        <td className="py-3.5 px-5 text-slate-500">
                          {format(dateObj, "EEE")}
                        </td>
                        <td className="py-3.5 px-5 font-medium text-slate-700">
                          {att.checkIn?.time ? format(new Date(att.checkIn.time), "hh:mm a") : "--"}
                        </td>
                        <td className="py-3.5 px-5 font-medium text-slate-700">
                          {att.checkOut?.time ? (
                            format(new Date(att.checkOut.time), "hh:mm a")
                          ) : !isToday(dateObj) && att.checkIn?.time ? (
                            <div className="space-y-1">
                              <span className="inline-block text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                Missing Checkout
                              </span>
                              <div>
                                {att.hasPendingCorrection ? (
                                  <span className="text-[10px] text-amber-600 font-semibold block">Pending Review</span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedRecordForCorrection(att);
                                      setIsCorrectionModalOpen(true);
                                    }}
                                    className="text-[10.5px] font-bold text-rose-600 hover:text-rose-800 underline cursor-pointer"
                                  >
                                    Request Correction
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : (
                            "--"
                          )}
                        </td>
                        <td className="py-3.5 px-5 font-bold text-slate-900">
                          {att.workingHours ? `${att.workingHours}h` : "--"}
                        </td>

                        <td className="py-3.5 px-5">
                          {getStatusBadge(att.attendanceStatus)}
                        </td>
                        <td className="py-3.5 px-5">
                          {att.checkIn?.photo ? (
                            <img
                              src={`${API_SERVER_URL}/${att.checkIn.photo}`}
                              alt="Check-in"
                              className="h-8 w-8 rounded-full object-cover ring-1 ring-rose-200"
                            />
                          ) : (
                            <span className="text-slate-400">--</span>
                          )}
                        </td>
                        <td className="py-3.5 px-5">
                          {att.checkOut?.photo ? (
                            <img
                              src={`${API_SERVER_URL}/${att.checkOut.photo}`}
                              alt="Check-out"
                              className="h-8 w-8 rounded-full object-cover ring-1 ring-rose-200"
                            />
                          ) : (
                            <span className="text-slate-400">--</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No attendance history recorded for this month.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )
      ) : (
      /* My Correction Requests Tab View */
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-rose-50/40 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-rose-50">
            <tr>
              <th className="py-3 px-5">Date</th>
              <th className="py-3 px-5">Requested Out</th>
              <th className="py-3 px-5">Reason</th>
              <th className="py-3 px-5">Status</th>
              <th className="py-3 px-5">Manager Feedback</th>
              <th className="py-3 px-5 text-right">Audit Trail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rose-50">
            {myCorrections.length > 0 ? (
              myCorrections.map((req) => {
                const reqDate = req.attendanceDate ? new Date(req.attendanceDate) : null;
                const outTime = req.requestedCheckOutTime ? new Date(req.requestedCheckOutTime) : null;

                return (
                  <tr key={req._id} className="hover:bg-rose-50/30 transition-colors">
                    <td className="py-3.5 px-5 font-semibold text-slate-800">
                      {reqDate ? format(reqDate, "dd MMM yyyy") : "--"}
                    </td>
                    <td className="py-3.5 px-5 font-bold text-rose-700">
                      {outTime ? format(outTime, "hh:mm a") : "--"}
                    </td>
                    <td className="py-3.5 px-5 text-slate-600 max-w-xs truncate" title={req.reason}>
                      "{req.reason}"
                    </td>
                    <td className="py-3.5 px-5">
                      <span
                        className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          req.status === "Approved"
                            ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                            : req.status === "Rejected"
                            ? "bg-rose-50 text-rose-600 border-rose-100"
                            : "bg-amber-50 text-amber-700 border-amber-100"
                        }`}
                      >
                        {req.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-slate-600 text-[11px]">
                      {req.actionReason ? (
                        <div>
                          <span className="font-semibold text-slate-800 block">"{req.actionReason}"</span>
                          {req.correctedBy && (
                            <span className="text-[10px] text-slate-400">
                              Reviewed by {req.correctedBy.name} ({req.correctedBy.role})
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Pending manager review</span>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedCorrectionForAudit(req)}
                        title="View Full Audit Trail"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <History className="h-3.5 w-3.5" />
                        <span>Timeline</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  You haven't submitted any correction requests.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    )}
  </div>

      {/* Check In Modal */}
      <CheckInModal
        isOpen={isCheckInModalOpen}
        onClose={() => setIsCheckInModalOpen(false)}
        onSuccess={handleModalSuccess}
        isCheckOut={isCheckedIn && !isCheckedOut}
      />

      {/* Correction Request Modal */}
      <CorrectionRequestModal
        isOpen={isCorrectionModalOpen}
        onClose={() => {
          setIsCorrectionModalOpen(false);
          setSelectedRecordForCorrection(null);
        }}
        attendanceRecord={selectedRecordForCorrection || todayResponse?.incompletePreviousAttendance}
        onSuccess={() => {
          refetchToday();
          refetchMyCorrections();
          queryClient.invalidateQueries({ queryKey: ["today-attendance"] });
          queryClient.invalidateQueries({ queryKey: ["attendance-history"] });
          queryClient.invalidateQueries({ queryKey: ["my-correction-requests"] });
        }}
      />

      {/* Audit Trail Modal */}
      <AuditTrailModal
        isOpen={Boolean(selectedCorrectionForAudit)}
        onClose={() => setSelectedCorrectionForAudit(null)}
        correction={selectedCorrectionForAudit}
      />
    </div>
  );
}

export default AttendancePage;
