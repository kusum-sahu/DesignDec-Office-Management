import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  Users,
  Search,
  Download,
  Fingerprint,
  Calendar,
  FileText,
  AlertCircle,
  MoreVertical,
  Check,
  Square,
  History,
  XCircle,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, getDay } from "date-fns";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import dashboardApi from "../../api/dashboard.api";
import attendanceApi from "../../api/attendance.api";
import useAuthStore from "../../stores/authStore";
import CheckInModal from "../../components/attendance/CheckInModal";
import AuditTrailModal from "../../components/attendance/AuditTrailModal";
import RejectReasonModal from "../../components/attendance/RejectReasonModal";
import { TableSkeleton } from "../../components/ui/Skeleton";
import Button from "../../components/ui/Button";
import { toast } from "../../utils/toast";

export function AdminAttendancePage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState("attendance");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);

  // Correction Requests State
  const [correctionStatusFilter, setCorrectionStatusFilter] = useState("All");
  const [selectedCorrectionForAudit, setSelectedCorrectionForAudit] = useState(null);
  const [selectedCorrectionForReject, setSelectedCorrectionForReject] = useState(null);
  const [actionInProgressId, setActionInProgressId] = useState(null);


  // Live logged-in Admin/Manager today attendance record
  const { data: myTodayResponse, refetch: refetchMyToday } = useQuery({
    queryKey: ["today-attendance", user?._id],
    queryFn: () => attendanceApi.getToday(),
  });

  const myTodayRecord = myTodayResponse?.data || null;
  const isCheckedIn = Boolean(myTodayRecord?.checkIn?.time);
  const isCheckedOut = Boolean(myTodayRecord?.checkOut?.time);

  // Live dashboard statistics (overall numbers)
  const { data: dashboardResponse } = useQuery({
    queryKey: ["dashboard-stats-attendance"],
    queryFn: () => dashboardApi.getStatistics(),
  });

  // Live today's detailed attendance records
  const { data: todayAttendanceResponse, isLoading } = useQuery({
    queryKey: ["today-attendance-list", searchQuery],
    queryFn: () => dashboardApi.getTodayAttendance({ search: searchQuery || undefined }),
  });

  // Live Correction Requests (Admin & Branch Manager)
  const {
    data: correctionRequestsResponse,
    isLoading: isCorrectionsLoading,
    refetch: refetchCorrections,
  } = useQuery({
    queryKey: ["admin-correction-requests", correctionStatusFilter, searchQuery],
    queryFn: () =>
      attendanceApi.getAllCorrectionRequests({
        status: correctionStatusFilter !== "All" ? correctionStatusFilter : undefined,
        search: searchQuery || undefined,
      }),
  });

  const correctionRequests = correctionRequestsResponse?.data || [];
  const pendingCorrectionsCount = correctionRequests.filter((r) => r.status === "Pending").length;

  const handleApproveCorrection = async (correction) => {
    try {
      setActionInProgressId(correction._id);
      await attendanceApi.approveCorrectionRequest(correction._id, {
        actionReason: "Verified and approved by manager",
      });
      toast.success("Correction Approved", {
        description: `Attendance record for ${correction.employee?.name || "employee"} has been updated.`,
      });
      queryClient.invalidateQueries({ queryKey: ["admin-correction-requests"] });
      queryClient.invalidateQueries({ queryKey: ["today-attendance-list"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats-attendance"] });
      refetchCorrections();
    } catch (err) {
      toast.error("Approval Failed", {
        description: err.response?.data?.message || "Failed to approve correction request.",
      });
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleConfirmReject = async (reason) => {
    if (!selectedCorrectionForReject) return;
    try {
      setActionInProgressId(selectedCorrectionForReject._id);
      await attendanceApi.rejectCorrectionRequest(selectedCorrectionForReject._id, { reason });
      toast.success("Correction Rejected", {
        description: "Rejection note and audit trail entry have been recorded.",
      });
      setSelectedCorrectionForReject(null);
      queryClient.invalidateQueries({ queryKey: ["admin-correction-requests"] });
      refetchCorrections();
    } catch (err) {
      toast.error("Rejection Failed", {
        description: err.response?.data?.message || "Failed to reject correction request.",
      });
    } finally {
      setActionInProgressId(null);
    }
  };

  const stats = dashboardResponse?.data?.attendance || {};

  const totalEmployees = stats.totalActiveEmployees ?? 0;
  const presentToday = stats.presentToday ?? 0;
  const absentToday = stats.absentToday ?? 0;
  const lateToday = stats.late ?? 0;

  const records = todayAttendanceResponse?.data || [];

  // Donut chart slices
  const donutData = [
    { name: "Present", value: presentToday, color: "#10B981" },
    { name: "Absent", value: absentToday, color: "#EF4444" },
    { name: "Late", value: lateToday, color: "#F59E0B" },
  ];

  // Dynamically build current week data for Bar Chart (real numbers for today, 0 for rest)
  const now = new Date();
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const currentDayIndex = (now.getDay() + 6) % 7; // Monday = 0, Sunday = 6
  const weeklyAttendanceData = dayNames.map((day, index) => {
    if (index === currentDayIndex) {
      return { day, Present: presentToday, Absent: absentToday, Late: lateToday };
    }
    return { day, Present: 0, Absent: 0, Late: 0 };
  });

  const handleModalSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["today-attendance"] });
    queryClient.invalidateQueries({ queryKey: ["today-attendance-list"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-stats-attendance"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    refetchMyToday();
  };

  // Calendar setup
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);
  const paddingDays = Array.from({ length: startDayOfWeek });

  const exportCSV = () => {
    if (!records.length) return;
    const headers = ["Employee ID", "Name", "Department", "Status", "Check In", "Check Out", "Working Hours"];
    const rows = records.map((r) => [
      r.employee?.employeeId || "",
      r.employee?.name || "",
      r.employee?.department || "",
      r.attendanceStatus || "",
      r.checkIn?.time ? format(new Date(r.checkIn.time), "hh:mm a") : "",
      r.checkOut?.time ? format(new Date(r.checkOut.time), "hh:mm a") : "",
      r.workingHours || 0,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Attendance_Report_${format(now, "yyyy-MM-dd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rose-100/70 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-heading">
            Attendance
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track team attendance, manage leaves and maintain productivity.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs">
            Today, {format(now, "d MMM yyyy")}
          </div>
          <Button
            variant={isCheckedIn ? "secondary" : "primary"}
            size="sm"
            disabled={isCheckedOut}
            leftIcon={
              isCheckedOut ? (
                <Check className="h-4 w-4" />
              ) : isCheckedIn ? (
                <Square className="h-4 w-4" />
              ) : (
                <Fingerprint className="h-4 w-4" />
              )
            }
            onClick={() => setIsCheckInModalOpen(true)}
          >
            {isCheckedOut ? "Checked Out" : isCheckedIn ? "Check Out" : "Mark Attendance"}
          </Button>
        </div>
      </div>

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
        <div className="bg-white rounded-2xl p-5 border border-rose-100/70 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500">Total Employees</span>
            <div className="text-2xl font-bold text-slate-900 font-heading mt-0.5">
              {totalEmployees}
            </div>
            <span className="text-[11px] font-semibold text-slate-400">Total active team</span>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <Users className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-rose-100/70 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500">Present Today</span>
            <div className="text-2xl font-bold text-slate-900 font-heading mt-0.5">
              {presentToday}
            </div>
            <span className="text-[11px] font-semibold text-emerald-600">Marked present</span>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-rose-100/70 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500">Absent Today</span>
            <div className="text-2xl font-bold text-slate-900 font-heading mt-0.5">
              {absentToday}
            </div>
            <span className="text-[11px] font-semibold text-rose-600">Pending check-in</span>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-rose-100/70 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500">Late Today</span>
            <div className="text-2xl font-bold text-slate-900 font-heading mt-0.5">
              {lateToday}
            </div>
            <span className="text-[11px] font-semibold text-amber-600">Arrived late</span>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <Clock className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Middle Row: Attendance Overview, Today's Attendance, Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Attendance Overview Bar Chart (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-rose-100/70 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-rose-50">
            <div className="flex items-center gap-2">
              <CalendarCheck className="h-4.5 w-4.5 text-rose-600" />
              <h2 className="text-sm font-bold text-slate-900">Attendance Overview</h2>
            </div>
            <span className="text-xs text-slate-500 font-medium">This Week</span>
          </div>

          <div className="h-48 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyAttendanceData}>
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #FFE4E6", fontSize: 11 }} />
                <Bar dataKey="Present" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Absent" fill="#EF4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Late" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-center gap-4 pt-2 border-t border-rose-50 text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Present</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" /> Absent</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" /> Late</span>
          </div>
        </div>

        {/* Today's Attendance Donut (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-5 border border-rose-100/70 shadow-2xs flex flex-col">
          <div className="flex items-center gap-2 pb-3 border-b border-rose-50">
            <Calendar className="h-4.5 w-4.5 text-rose-600" />
            <h2 className="text-sm font-bold text-slate-900">Today's Attendance</h2>
          </div>

          <div className="flex items-center justify-between gap-4 pt-4 flex-1">
            <div className="relative w-36 h-36 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    innerRadius={44}
                    outerRadius={62}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={`donut-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-extrabold text-slate-900 leading-none">
                  {totalEmployees}
                </span>
                <span className="text-[10px] text-slate-400 font-medium mt-0.5">Employees</span>
              </div>
            </div>

            <div className="flex-1 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> Present
                </span>
                <span className="font-bold text-slate-900">{presentToday}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="h-2 w-2 rounded-full bg-red-500" /> Absent
                </span>
                <span className="font-bold text-slate-900">{absentToday}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="h-2 w-2 rounded-full bg-amber-500" /> Late
                </span>
                <span className="font-bold text-slate-900">{lateToday}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="h-2 w-2 rounded-full bg-slate-300" /> Not Marked
                </span>
                <span className="font-bold text-slate-900">0</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions (3 cols) */}
        <div className="lg:col-span-3 bg-white rounded-2xl p-5 border border-rose-100/70 shadow-2xs flex flex-col">
          <div className="flex items-center gap-2 pb-3 border-b border-rose-50">
            <span className="text-rose-600 font-bold">⚡</span>
            <h2 className="text-sm font-bold text-slate-900">Quick Actions</h2>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-4 flex-1">
            <button
              type="button"
              onClick={() => setIsCheckInModalOpen(true)}
              disabled={isCheckedOut}
              className={`p-3 rounded-xl border text-center transition-all group cursor-pointer ${
                isCheckedOut
                  ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                  : isCheckedIn
                  ? "bg-amber-50 hover:bg-amber-100 border-amber-200"
                  : "bg-rose-50/50 hover:bg-rose-100/60 border border-rose-100"
              }`}
            >
              <Fingerprint className={`h-5 w-5 mx-auto mb-1 transition-transform group-hover:scale-110 ${
                isCheckedOut ? "text-slate-400" : isCheckedIn ? "text-amber-600" : "text-rose-600"
              }`} />
              <span className="text-[11px] font-bold text-slate-800 block">
                {isCheckedOut ? "Checked Out" : isCheckedIn ? "Check Out" : "Mark Attendance"}
              </span>
            </button>

            <button
              type="button"
              className="p-3 rounded-xl bg-rose-50/50 hover:bg-rose-100/60 border border-rose-100 text-center transition-all group cursor-pointer"
            >
              <Calendar className="h-5 w-5 text-rose-600 mx-auto mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-[11px] font-bold text-slate-800 block">Apply Leave</span>
            </button>

            <button
              type="button"
              onClick={exportCSV}
              className="p-3 rounded-xl bg-rose-50/50 hover:bg-rose-100/60 border border-rose-100 text-center transition-all group cursor-pointer"
            >
              <FileText className="h-5 w-5 text-rose-600 mx-auto mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-[11px] font-bold text-slate-800 block">Attendance Report</span>
            </button>

            <button
              type="button"
              className="p-3 rounded-xl bg-rose-50/50 hover:bg-rose-100/60 border border-rose-100 text-center transition-all group cursor-pointer"
            >
              <CalendarCheck className="h-5 w-5 text-rose-600 mx-auto mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-[11px] font-bold text-slate-800 block">Leave Calendar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Lower Section: Tabs + Table + Sidebar Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Main Table Area (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-rose-100/70 shadow-2xs overflow-hidden flex flex-col">
          {/* Tabs Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border-b border-rose-50 bg-rose-50/20">
            <div className="flex items-center gap-6 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab("attendance")}
                className={`pb-2 transition-all cursor-pointer ${
                  activeTab === "attendance"
                    ? "text-rose-600 border-b-2 border-rose-600 font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Employee Attendance
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("corrections")}
                className={`pb-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "corrections"
                    ? "text-rose-600 border-b-2 border-rose-600 font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <span>Correction Requests</span>
                {pendingCorrectionsCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white animate-pulse">
                    {pendingCorrectionsCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("leaves")}
                className={`pb-2 transition-all cursor-pointer ${
                  activeTab === "leaves"
                    ? "text-rose-600 border-b-2 border-rose-600 font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Leave Requests
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("reports")}
                className={`pb-2 transition-all cursor-pointer ${
                  activeTab === "reports"
                    ? "text-rose-600 border-b-2 border-rose-600 font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Attendance Reports
              </button>
            </div>


            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name, ID or department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-rose-400 w-48 sm:w-56"
                />
              </div>

              <Button variant="outline" size="sm" leftIcon={<Download className="h-3.5 w-3.5" />} onClick={exportCSV}>
                Export
              </Button>
            </div>
          </div>

          {activeTab === "attendance" ? (
            isLoading ? (
              <TableSkeleton rows={6} columns={8} />
            ) : (
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-rose-50/40 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-rose-50">
                    <tr>
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4">Today's Status</th>
                      <th className="py-3 px-4">Check In</th>
                      <th className="py-3 px-4">Check Out</th>
                      <th className="py-3 px-4">Working Hours</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-50">
                    {records.length > 0 ? (
                      records.map((r, i) => {
                        const emp = r.employee || {};
                        const initials = emp.name ? emp.name.slice(0, 2).toUpperCase() : "EM";
                        return (
                          <tr key={r._id} className="hover:bg-rose-50/30 transition-colors">
                            <td className="py-3.5 px-4 font-bold text-slate-400">{i + 1}</td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="h-7 w-7 rounded-full bg-purple-100 text-purple-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                                  {initials}
                                </div>
                                <div>
                                  <span className="font-bold text-slate-900 block leading-tight">
                                    {emp.name || "Employee"}
                                  </span>
                                  <span className="text-[10px] text-slate-400 leading-none">
                                    {emp.employeeId || "DD-EMP-000"}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 font-medium">
                              {emp.department || "Operations"}
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  r.attendanceStatus === "Present"
                                    ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                    : r.attendanceStatus === "Late"
                                    ? "bg-amber-50 text-amber-700 border border-amber-100"
                                    : "bg-rose-50 text-rose-600 border border-rose-100"
                                }`}
                              >
                                {r.attendanceStatus || "Absent"}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-slate-700">
                              {r.checkIn?.time ? format(new Date(r.checkIn.time), "hh:mm a") : "--"}
                            </td>
                            <td className="py-3.5 px-4 text-slate-700">
                              {r.checkOut?.time ? format(new Date(r.checkOut.time), "hh:mm a") : "--"}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-slate-900">
                              {r.workingHours ? `${r.workingHours}h` : "--"}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <button type="button" className="p-1 text-slate-400 hover:text-slate-600 rounded-md">
                                <MoreVertical className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          No attendance records found for today.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )
          ) : activeTab === "corrections" ? (
            isCorrectionsLoading ? (
              <TableSkeleton rows={6} columns={8} />
            ) : (
              <div className="flex flex-col flex-1">
                {/* Status Filter Bar */}
                <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-rose-50 bg-rose-50/20 text-xs">
                  <span className="text-slate-400 font-medium text-[11px] mr-1">Filter Status:</span>
                  {["All", "Pending", "Approved", "Rejected"].map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setCorrectionStatusFilter(status)}
                      className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                        correctionStatusFilter === status
                          ? "bg-rose-600 text-white shadow-2xs"
                          : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>

                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-rose-50/40 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-rose-50">
                      <tr>
                        <th className="py-3 px-4">#</th>
                        <th className="py-3 px-4">Employee</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Check In</th>
                        <th className="py-3 px-4">Existing Check-Out</th>
                        <th className="py-3 px-4">Requested Out</th>
                        <th className="py-3 px-4">Reason</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Reviewed By</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rose-50">
                      {correctionRequests.length > 0 ? (
                        correctionRequests.map((c, i) => {
                          const emp = c.employee || {};
                          const initials = emp.name ? emp.name.slice(0, 2).toUpperCase() : "EM";
                          const attDate = c.attendanceDate ? new Date(c.attendanceDate) : null;
                          const inTime = c.attendance?.checkIn?.time ? new Date(c.attendance.checkIn.time) : null;
                          const existingOutTime = c.attendance?.checkOut?.time ? new Date(c.attendance.checkOut.time) : null;
                          const outTime = c.requestedCheckOutTime ? new Date(c.requestedCheckOutTime) : null;
                          const isPending = c.status === "Pending";
                          const isProcessing = actionInProgressId === c._id;

                          const isSelf = String(emp._id || "") === String(user?._id || "");
                          const isEmpBranchAdmin =
                            emp.role === "Branch Admin" ||
                            emp.role === "Branch Manager" ||
                            (/^\s*branch\s*(admin|man?ager)\s*$/i.test(emp.designation || ""));
                          const isAdminUser = user?.role === "Admin";
                          const isBAUser =
                            user?.role === "Branch Admin" ||
                            user?.role === "Branch Manager" ||
                            (user?.role !== "Admin" && /^\s*branch\s*(admin|man?ager)\s*$/i.test(user?.designation || ""));
                          const canApproveOrReject = isAdminUser || (isBAUser && !isSelf && !isEmpBranchAdmin);

                          return (
                            <tr key={c._id} className="hover:bg-rose-50/30 transition-colors">
                              <td className="py-3.5 px-4 font-bold text-slate-400">{i + 1}</td>
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-2.5">
                                  <div className="h-7 w-7 rounded-full bg-purple-100 text-purple-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                                    {initials}
                                  </div>
                                  <div>
                                    <span className="font-bold text-slate-900 block leading-tight">
                                      {emp.name || "Employee"}
                                    </span>
                                    <span className="text-[10px] text-slate-400 leading-none">
                                      {emp.employeeId || "DD-EMP"} • {emp.branch || "Main Office"}
                                      {isEmpBranchAdmin ? " (Branch Admin)" : ""}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3.5 px-4 font-semibold text-slate-800 whitespace-nowrap">
                                {attDate ? format(attDate, "dd MMM yyyy") : "--"}
                              </td>
                              <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                                {inTime ? format(inTime, "hh:mm a") : "--"}
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                {existingOutTime ? (
                                  <span className="text-slate-700 font-medium">{format(existingOutTime, "hh:mm a")}</span>
                                ) : (
                                  <span className="inline-block text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/80">
                                    Missing Checkout
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 font-semibold text-rose-700 whitespace-nowrap">
                                {outTime ? format(outTime, "hh:mm a") : "--"}
                              </td>
                              <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate" title={c.reason}>
                                "{c.reason}"
                              </td>
                              <td className="py-3.5 px-4">
                                <span
                                  className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                    c.status === "Approved"
                                      ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                      : c.status === "Rejected"
                                      ? "bg-rose-50 text-rose-600 border-rose-100"
                                      : "bg-amber-50 text-amber-700 border-amber-100 animate-pulse"
                                  }`}
                                >
                                  {c.status}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                                {c.correctedBy ? (
                                  <div>
                                    <span className="font-semibold text-slate-700 block leading-tight">
                                      {c.correctedBy.name}
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                      {c.correctedBy.role}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-slate-400">Pending review</span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                <div className="inline-flex items-center gap-1.5 justify-end">
                                  {isPending && (
                                    <>
                                      {canApproveOrReject ? (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => setSelectedCorrectionForApprove(c)}
                                            disabled={isProcessing}
                                            title="Approve Request"
                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-[11px] font-bold transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                                          >
                                            <Check className="h-3.5 w-3.5" />
                                            <span>Approve</span>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setSelectedCorrectionForReject(c)}
                                            disabled={isProcessing}
                                            title="Reject Request"
                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 text-[11px] font-bold transition-all cursor-pointer disabled:opacity-50"
                                          >
                                            <XCircle className="h-3.5 w-3.5" />
                                            <span>Reject</span>
                                          </button>
                                        </>
                                      ) : isBAUser && (isSelf || isEmpBranchAdmin) ? (
                                        <span className="text-[10.5px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                          Awaiting Admin Approval
                                        </span>
                                      ) : null}
                                    </>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => setSelectedCorrectionForAudit(c)}
                                    title="View Full Audit Trail"
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                  >
                                    <History className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={10} className="py-12 text-center text-slate-400">
                            No attendance correction requests found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          ) : (
            <div className="p-12 text-center text-xs text-slate-400">
              <AlertCircle className="h-8 w-8 mx-auto text-rose-300 mb-2" />
              <p className="font-semibold text-slate-700">
                {activeTab === "leaves" ? "Leave Requests Module" : "Attendance Reports"}
              </p>
              <p className="mt-1 max-w-sm mx-auto">
                {activeTab === "leaves"
                  ? "Leave application and approval schema is scheduled for the upcoming administrative update."
                  : "Use the Export button above to download full CSV attendance reports."}
              </p>
            </div>
          )}


          {/* Table Pagination */}
          <div className="flex items-center justify-between p-4 border-t border-rose-50 text-xs text-slate-500">
            <span>Showing 1 to {records.length} of {records.length} employees</span>
            <div className="flex items-center gap-1">
              <button type="button" className="px-2 py-1 rounded border border-slate-200 bg-white">1</button>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Mini Calendar & Upcoming Leaves (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Calendar Widget */}
          <div className="bg-white rounded-2xl p-5 border border-rose-100/70 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-rose-50">
              <span className="text-xs font-bold text-slate-900">
                {format(now, "MMMM yyyy")}
              </span>
            </div>

            <div className="pt-3">
              <div className="grid grid-cols-7 gap-1 text-center text-[10.5px] font-semibold text-slate-400 mb-1.5">
                <span>Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {paddingDays.map((_, i) => (
                  <div key={`pad-${i}`} className="h-7 w-7 mx-auto" />
                ))}
                {daysInMonth.map((day) => {
                  const isCur = isToday(day);
                  return (
                    <div
                      key={day.toISOString()}
                      className={`h-7 w-7 mx-auto flex items-center justify-center rounded-full text-xs ${
                        isCur
                          ? "bg-rose-600 text-white font-bold shadow-xs"
                          : "text-slate-700 hover:bg-rose-50"
                      }`}
                    >
                      {format(day, "d")}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Upcoming Leaves Widget */}
          <div className="bg-white rounded-2xl p-5 border border-rose-100/70 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-rose-50">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-rose-600" />
                <h3 className="text-xs font-bold text-slate-900">Upcoming Leaves</h3>
              </div>
              <span className="text-[11px] text-rose-600 font-semibold cursor-pointer">View All</span>
            </div>

            <div className="py-8 text-center text-xs text-slate-400">
              <Calendar className="h-6 w-6 mx-auto text-slate-300 mb-1.5" />
              <p className="font-semibold text-slate-600">No upcoming leaves scheduled</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Approved leave requests will appear here.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Check In / Check Out Modal */}
      <CheckInModal
        isOpen={isCheckInModalOpen}
        onClose={() => setIsCheckInModalOpen(false)}
        onSuccess={handleModalSuccess}
        isCheckOut={isCheckedIn && !isCheckedOut}
      />

      {/* Audit Trail Modal */}
      <AuditTrailModal
        isOpen={Boolean(selectedCorrectionForAudit)}
        onClose={() => setSelectedCorrectionForAudit(null)}
        correction={selectedCorrectionForAudit}
      />

      {/* Reject Reason Modal */}
      <RejectReasonModal
        isOpen={Boolean(selectedCorrectionForReject)}
        onClose={() => setSelectedCorrectionForReject(null)}
        onConfirm={handleConfirmReject}
        isSubmitting={Boolean(actionInProgressId)}
      />
    </div>
  );
}

export default AdminAttendancePage;
