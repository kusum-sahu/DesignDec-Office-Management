import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ShoppingBag,
  Clock,
  CalendarCheck,
  CheckSquare,
  Play,
  Square,
  Bell,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  User,
  HelpCircle,
  Calendar as CalendarIcon,
  AlertTriangle,
} from "lucide-react";
import CorrectionRequestModal from "../../components/attendance/CorrectionRequestModal";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isToday,
  addMonths,
  subMonths,
  getDay,
} from "date-fns";
import { formatDate } from "../../utils/formatters";
import designerBannerImg from "../../assets/designer-banner.png";

export function EmployeeDashboardView({
  user,
  orders,
  attendanceRecords,
  todayRecord: propTodayRecord,
  incompleteAttendance,
  notifications,
  onCheckInClick,
  onCorrectionSuccess,
}) {
  const navigate = useNavigate();
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);

  const todayFormatted = format(new Date(), "EEEE, d MMMM yyyy");

  // Strictly filter out any Main Office orders from employee dashboard
  const branchOrders = (orders || []).filter(
    (o) => o.branch !== "Main Office" && (!user?.branch || o.branch === user?.branch)
  );

  // Determine active orders (Pending, In Progress, Ready)
  const activeOrders = branchOrders.filter(
    (o) => o.deliveryStatus !== "Delivered" && o.deliveryStatus !== "Cancelled"
  );

  // Today's attendance state (Single Source of Truth)
  const todayRecord =
    propTodayRecord ||
    (attendanceRecords || []).find((att) => {
      const attDate = new Date(att.attendanceDate);
      return isToday(attDate);
    }) ||
    null;

  const isCheckedIn = Boolean(todayRecord?.checkIn?.time);
  const isCheckedOut = Boolean(todayRecord?.checkOut?.time);
  const workingHoursToday = todayRecord?.workingHours
    ? `${todayRecord.workingHours}h`
    : isCheckedIn
    ? "In progress"
    : "0h 00m";

  // Present days this month
  const presentDaysCount = (attendanceRecords || []).filter(
    (att) => att.attendanceStatus === "Present" || att.attendanceStatus === "Late"
  ).length;

  // Calendar Day Calculation
  const monthStart = startOfMonth(currentCalendarDate);
  const monthEnd = endOfMonth(currentCalendarDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart); // 0 for Sunday
  const paddingDays = Array.from({ length: startDayOfWeek });

  return (
    <div className="space-y-6">
      {/* Hero Greeting Header */}
      <div className="relative overflow-hidden rounded-2xl bg-white/85 backdrop-blur-xs p-6 border border-rose-100/80 shadow-2xs">
        <div className="absolute right-1/3 top-3 w-32 h-16 bg-dot-pattern opacity-60 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-slate-500">Good morning,</p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-heading flex items-center gap-2 mt-0.5">
              {user?.name || "Employee"} <span className="text-xl">👋</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Stay focused. Great work creates beautiful spaces.
            </p>
          </div>

          <div className="flex items-center gap-3.5">
            {/* Restrained Coral Dot Grid from Login page */}
            <div className="hidden sm:grid grid-cols-4 gap-1.5 select-none opacity-70" aria-hidden="true">
              {Array.from({ length: 8 }).map((_, i) => (
                <span key={i} className="h-1.5 w-1.5 rounded-full bg-rose-400/60" />
              ))}
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/90 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs">
              <CalendarIcon className="h-3.5 w-3.5 text-rose-600" />
              <span>{todayFormatted}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Incomplete Previous Attendance Warning Banner */}
      {incompleteAttendance &&
        !incompleteAttendance.hasPendingCorrection &&
        incompleteAttendance.warningMessage && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50/90 p-4.5 text-xs text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-900 text-sm">
                You didn’t check out on {incompleteAttendance.dateFormatted}. Please submit a correction request.
              </h3>
              <p className="text-amber-800 text-[11px] leading-relaxed">
                Your today's check-in is <span className="font-semibold text-emerald-700">not blocked</span>. Employees cannot directly edit past timestamps.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsCorrectionModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-all shadow-2xs cursor-pointer whitespace-nowrap self-stretch sm:self-auto text-center"
          >
            Submit Correction Request
          </button>
        </div>
      )}

      {/* Top 4 KPI Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
        {/* Active Orders */}
        <div className="bg-white rounded-2xl p-5 border border-rose-100/70 shadow-2xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-500">Active Orders</span>
            <div className="text-2xl font-bold text-slate-900 font-heading">
              {activeOrders.length}
            </div>
            <div className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
              <span>Active in pipeline</span>
            </div>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 shrink-0">
            <ShoppingBag className="h-6 w-6" />
          </div>
        </div>

        {/* Today's Tasks */}
        <div className="bg-white rounded-2xl p-5 border border-rose-100/70 shadow-2xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-500">Today's Tasks</span>
            <div className="text-2xl font-bold text-slate-900 font-heading">0</div>
            <div className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
              <span>No pending tasks</span>
            </div>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 shrink-0">
            <CheckSquare className="h-6 w-6" />
          </div>
        </div>

        {/* Working Hours */}
        <div className="bg-white rounded-2xl p-5 border border-rose-100/70 shadow-2xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-500">Working Hours</span>
            <div className="text-2xl font-bold text-slate-900 font-heading">
              {workingHoursToday}
            </div>
            <div className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
              <span>- today</span>
            </div>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 shrink-0">
            <Clock className="h-6 w-6" />
          </div>
        </div>

        {/* This Month Attendance */}
        <div className="bg-white rounded-2xl p-5 border border-rose-100/70 shadow-2xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-500">This Month Attendance</span>
            <div className="text-2xl font-bold text-slate-900 font-heading">
              {presentDaysCount} / 22
            </div>
            <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
              <span>Present this month</span>
            </div>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 shrink-0">
            <CalendarCheck className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Middle Row: Today's Attendance Punch, Today's Tasks, Mini Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Today's Attendance Card (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-5 border border-rose-100/70 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-rose-50">
              <div className="flex items-center gap-2">
                <Clock className="h-4.5 w-4.5 text-rose-600" />
                <h2 className="text-sm font-bold text-slate-900">Today's Attendance</h2>
              </div>
              <span className="text-xs text-slate-400 font-medium">
                {format(new Date(), "EEEE, d MMM")}
              </span>
            </div>

            <div className="py-8 text-center space-y-2">
              <div className="flex items-center justify-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    isCheckedOut
                      ? "bg-slate-400"
                      : isCheckedIn
                      ? "bg-emerald-500 animate-pulse"
                      : "bg-rose-500"
                  }`}
                />
                <span className="text-base font-bold text-slate-900">
                  {isCheckedOut
                    ? "Checked Out"
                    : isCheckedIn
                    ? "Checked In"
                    : "Not Checked In"}
                </span>
              </div>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                {isCheckedOut
                  ? "Great job today! Your attendance has been logged."
                  : isCheckedIn
                  ? "You are currently clocked in at the office."
                  : "Start your day by checking in at the office."}
              </p>
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={onCheckInClick}
              disabled={isCheckedOut}
              className={`w-full py-3.5 px-5 rounded-full text-sm font-bold text-white shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer ${
                isCheckedOut
                  ? "bg-slate-300 cursor-not-allowed"
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
        </div>

        {/* Today's Tasks (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-5 border border-rose-100/70 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-rose-50">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-4.5 w-4.5 text-rose-600" />
              <h2 className="text-sm font-bold text-slate-900">Today's Tasks</h2>
            </div>
            <span className="text-xs text-slate-400 font-medium">0 Tasks</span>
          </div>

          <div className="pt-6 pb-8 text-center flex-1 flex flex-col items-center justify-center space-y-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
              <CheckSquare className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-700 block">No tasks assigned</span>
              <span className="text-[11px] text-slate-400 block max-w-[200px] mt-0.5">
                You have no pending tasks scheduled for today.
              </span>
            </div>
          </div>
        </div>

        {/* Calendar Widget (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-5 border border-rose-100/70 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-rose-50">
            <span className="text-xs font-bold text-slate-900">
              {format(currentCalendarDate, "MMMM yyyy")}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentCalendarDate(subMonths(currentCalendarDate, 1))}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentCalendarDate(addMonths(currentCalendarDate, 1))}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="pt-3 flex-1">
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
                const isCurrent = isToday(day);
                return (
                  <div
                    key={day.toISOString()}
                    className={`h-7 w-7 mx-auto flex items-center justify-center rounded-full text-xs transition-all ${
                      isCurrent
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
      </div>

      {/* Lower Row: Orders, Recent Notifications, Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Orders (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-5 border border-rose-100/70 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-rose-50">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4.5 w-4.5 text-rose-600" />
              <h2 className="text-sm font-bold text-slate-900">Orders</h2>
            </div>
            <Link
              to="/orders"
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 inline-flex items-center gap-1"
            >
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="divide-y divide-rose-50 pt-2 flex-1">
            {activeOrders.length > 0 ? (
              activeOrders.slice(0, 4).map((order) => (
                <div key={order._id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-bold text-slate-900 block">#{order.orderNumber}</span>
                    <span className="text-[11px] text-slate-500 block truncate max-w-[140px]">
                      {order.customerName} • {order.itemType}
                    </span>
                  </div>

                  <div className="text-right">
                    <span
                      className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        order.deliveryStatus === "In Progress"
                          ? "bg-blue-50 text-blue-600"
                          : "bg-rose-50 text-rose-600"
                      }`}
                    >
                      {order.deliveryStatus}
                    </span>
                    <span className="block text-[10px] text-slate-400 mt-0.5">
                      {formatDate(order.deliveryDeadline)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400 space-y-1">
                <ShoppingBag className="h-6 w-6 mx-auto text-rose-300" />
                <span className="font-semibold text-slate-600 block">No active orders</span>
                <span>All assigned customer orders are up to date.</span>
              </div>
            )}
          </div>
        </div>

        {/* Recent Notifications (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-5 border border-rose-100/70 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-rose-50">
            <div className="flex items-center gap-2">
              <Bell className="h-4.5 w-4.5 text-rose-600" />
              <h2 className="text-sm font-bold text-slate-900">Recent Notifications</h2>
            </div>
            <Link
              to="/notifications"
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 inline-flex items-center gap-1"
            >
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="divide-y divide-rose-50 pt-2 flex-1">
            {(notifications || []).length > 0 ? (
              (notifications || []).slice(0, 4).map((notif) => (
                <div key={notif._id} className="py-2.5 flex items-start gap-2.5 text-xs">
                  <span
                    className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${
                      !notif.isRead ? "bg-rose-600" : "bg-slate-300"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 leading-tight truncate">
                      {notif.title}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {notif.message}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400 space-y-1">
                <Bell className="h-6 w-6 mx-auto text-rose-300" />
                <span className="font-semibold text-slate-600 block">No recent notifications</span>
                <span>You're all caught up with office updates.</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-5 border border-rose-100/70 shadow-2xs flex flex-col">
          <div className="flex items-center gap-2 pb-3 border-b border-rose-50">
            <span className="text-rose-600 font-bold">⚡</span>
            <h2 className="text-sm font-bold text-slate-900">Quick Actions</h2>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-4 flex-1">
            <button
              type="button"
              onClick={() => navigate("/orders")}
              className="p-3.5 rounded-xl bg-rose-50/50 hover:bg-rose-100/60 border border-rose-100 text-center transition-all group cursor-pointer"
            >
              <div className="flex justify-center text-rose-600 mb-1.5 group-hover:scale-110 transition-transform">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <span className="text-xs font-bold text-slate-800">View Orders</span>
            </button>

            <button
              type="button"
              onClick={onCheckInClick}
              className="p-3.5 rounded-xl bg-rose-50/50 hover:bg-rose-100/60 border border-rose-100 text-center transition-all group cursor-pointer"
            >
              <div className="flex justify-center text-rose-600 mb-1.5 group-hover:scale-110 transition-transform">
                <Clock className="h-5 w-5" />
              </div>
              <span className="text-xs font-bold text-slate-800">Mark Attendance</span>
            </button>

            <button
              type="button"
              onClick={() => navigate("/profile")}
              className="p-3.5 rounded-xl bg-rose-50/50 hover:bg-rose-100/60 border border-rose-100 text-center transition-all group cursor-pointer"
            >
              <div className="flex justify-center text-rose-600 mb-1.5 group-hover:scale-110 transition-transform">
                <User className="h-5 w-5" />
              </div>
              <span className="text-xs font-bold text-slate-800">My Profile</span>
            </button>

            <button
              type="button"
              onClick={() => navigate("/notifications")}
              className="p-3.5 rounded-xl bg-rose-50/50 hover:bg-rose-100/60 border border-rose-100 text-center transition-all group cursor-pointer"
            >
              <div className="flex justify-center text-rose-600 mb-1.5 group-hover:scale-110 transition-transform">
                <HelpCircle className="h-5 w-5" />
              </div>
              <span className="text-xs font-bold text-slate-800">Raise a Request</span>
            </button>
          </div>
        </div>
      </div>

      {/* Motivational Quote Banner at Bottom */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-rose-50/90 via-pink-50/60 to-rose-100/40 p-6 border border-rose-100 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="h-16 w-24 rounded-xl overflow-hidden shrink-0 shadow-2xs hidden sm:block">
            <img
              src={designerBannerImg}
              alt="Designer at desk"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
              Good design builds better tomorrows.
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              Let's keep creating beautiful spaces together.
            </p>
          </div>
        </div>

        <div className="font-script text-3xl text-rose-400 font-bold tracking-wide select-none self-end sm:self-center">
          DesignDec —
        </div>
      </div>
      {/* Correction Request Modal */}
      <CorrectionRequestModal
        isOpen={isCorrectionModalOpen}
        onClose={() => setIsCorrectionModalOpen(false)}
        attendanceRecord={incompleteAttendance}
        onSuccess={() => {
          if (onCorrectionSuccess) onCorrectionSuccess();
        }}
      />
    </div>
  );
}

export default EmployeeDashboardView;
