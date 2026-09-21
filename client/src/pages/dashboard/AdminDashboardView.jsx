import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ShoppingBag,
  IndianRupee,
  Users,
  Clock,
  ArrowRight,
  Plus,
  CalendarCheck,
  UserPlus,
  BarChart3,
  CheckCircle2,
  Truck,
  Activity,
  FileText,
  Calendar as CalendarIcon,
  MoreVertical,
  Check,
  XCircle,
  ShieldAlert,
} from "lucide-react";
import { format } from "date-fns";
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
import { toast } from "sonner";
import attendanceApi from "../../api/attendance.api";
import useAuthStore from "../../stores/authStore";
import RejectReasonModal from "../../components/attendance/RejectReasonModal";
import { formatCurrency, formatDate } from "../../utils/formatters";

export function AdminDashboardView({
  stats,
  activeBranch,
  onOpenNewOrder,
  pendingCorrections = [],
  onCorrectionAction,
}) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [selectedCorrectionForReject, setSelectedCorrectionForReject] = useState(null);
  const [actionInProgressId, setActionInProgressId] = useState(null);

  const handleApproveCorrection = async (correction) => {
    try {
      setActionInProgressId(correction._id);
      await attendanceApi.approveCorrectionRequest(correction._id, {
        comments: "Approved via Admin Dashboard",
      });
      toast.success("Correction Request Approved", {
        description: `Approved checkout correction for ${correction.employee?.name || "employee"}.`,
      });
      if (onCorrectionAction) onCorrectionAction();
    } catch (err) {
      toast.error("Approval Failed", {
        description: err.response?.data?.message || err.message || "Failed to approve correction request.",
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
      toast.success("Correction Request Rejected", {
        description: `Rejected request for ${selectedCorrectionForReject.employee?.name || "employee"}.`,
      });
      setSelectedCorrectionForReject(null);
      if (onCorrectionAction) onCorrectionAction();
    } catch (err) {
      toast.error("Rejection Failed", {
        description: err.response?.data?.message || err.message || "Failed to reject correction request.",
      });
    } finally {
      setActionInProgressId(null);
    }
  };
  const todayFormatted = format(new Date(), "EEEE, d MMMM yyyy");

  // Attendance Donut Data
  const presentCount = stats?.attendance?.presentToday ?? 0;
  const absentCount = stats?.attendance?.absentToday ?? 0;
  const lateCount = stats?.attendance?.late ?? 0;
  const totalEmployees = stats?.attendance?.totalActiveEmployees ?? 0;
  const notCheckedInCount = Math.max(0, totalEmployees - (presentCount + absentCount));

  const attendanceChartData = [
    { name: "Present", value: Math.max(presentCount, 0), color: "#10B981" },
    { name: "Absent", value: Math.max(absentCount, 0), color: "#EF4444" },
    { name: "Late", value: Math.max(lateCount, 0), color: "#F59E0B" },
    { name: "Not Checked In", value: Math.max(notCheckedInCount, 0), color: "#E2E8F0" },
  ].filter((d) => d.value > 0);

  // Fallback if all 0
  const finalAttendanceData = attendanceChartData.length > 0
    ? attendanceChartData
    : [{ name: "No Data", value: 1, color: "#F1F5F9" }];

  const isAdminUser = user?.role === "Admin";
  const isBAUser =
    user?.role === "Branch Admin" ||
    user?.role === "Branch Manager" ||
    (user?.role !== "Admin" && /^\s*branch\s*(admin|man?ager)\s*$/i.test(user?.designation || ""));

  // Branch Performance Data - strictly exclude Main Office for Branch Admin
  const branchesData = (stats?.branches || [])
    .filter((b) => isAdminUser || b.branch !== "Main Office")
    .map((b) => ({
      name: b.branch === "Santoshpur Branch" ? "Santoshpur" : "Main Office",
      revenue: b.orderValue || 0,
      orders: b.orderCount || 0,
      fill: b.branch === "Santoshpur Branch" ? "#FECDD3" : "#E11D48",
    }));

  const recentOrders = (stats?.recentOrders || []).filter(
    (o) => isAdminUser || (o.branch !== "Main Office" && (!user?.branch || o.branch === user?.branch))
  );
  const urgentOrders = (stats?.deadlines?.urgentOrders || []).filter(
    (o) => isAdminUser || (o.branch !== "Main Office" && (!user?.branch || o.branch === user?.branch))
  );

  return (
    <div className="space-y-6">
      {/* Top Greeting Header */}
      <div className="relative overflow-hidden rounded-2xl bg-white/85 backdrop-blur-xs p-6 border border-rose-100/80 shadow-2xs">
        {/* Decorative Dot Matrix in Background */}
        <div className="absolute right-1/3 top-3 w-32 h-16 bg-dot-pattern opacity-60 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-slate-500">Good morning,</p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-heading flex items-center gap-2 mt-0.5">
              {isAdminUser ? "DesignDec Admin" : `DesignDec Branch Admin`} <span className="text-xl">👋</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Here's what's happening across {activeBranch || (isAdminUser ? "your office" : "your branch")} today.
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

      {/* Top 4 KPI Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
        {/* Total Orders */}
        <div className="bg-white rounded-2xl p-5 border border-rose-100/70 shadow-2xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-500">Total Orders</span>
            <div className="text-2xl font-bold text-slate-900 font-heading">
              {stats?.orders?.totalOrders ?? 0}
            </div>
            <div className="text-[11px] font-medium text-slate-500">
              <span>{isAdminUser && !activeBranch ? "All office branches" : (activeBranch || "Your Branch")}</span>
            </div>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 shrink-0">
            <ShoppingBag className="h-6 w-6" />
          </div>
        </div>

        {/* Total Order Value */}
        <div className="bg-white rounded-2xl p-5 border border-rose-100/70 shadow-2xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-500">Total Order Value</span>
            <div className="text-2xl font-bold text-slate-900 font-heading">
              {formatCurrency(stats?.financials?.totalOrderValue ?? 0)}
            </div>
            <div className="text-[11px] font-medium text-slate-500">
              <span>{isAdminUser && !activeBranch ? "Total booked revenue" : "Branch booked revenue"}</span>
            </div>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 shrink-0">
            <IndianRupee className="h-6 w-6" />
          </div>
        </div>

        {/* Today's Attendance */}
        <div className="bg-white rounded-2xl p-5 border border-rose-100/70 shadow-2xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-500">Today's Attendance</span>
            <div className="text-2xl font-bold text-slate-900 font-heading">
              {stats?.attendance?.presentToday ?? 0} / {stats?.attendance?.totalActiveEmployees ?? 0}
            </div>
            <div className="text-[11px] font-semibold text-emerald-600">
              <span>Active staff on-site</span>
            </div>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 shrink-0">
            <Users className="h-6 w-6" />
          </div>
        </div>

        {/* Pending Receivables */}
        <div className="bg-white rounded-2xl p-5 border border-rose-100/70 shadow-2xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-500">Pending Receivables</span>
            <div className="text-2xl font-bold text-slate-900 font-heading">
              {formatCurrency(stats?.financials?.totalPendingPayment ?? 0)}
            </div>
            <div className="text-[11px] font-medium text-rose-600">
              <span>Awaiting client payment</span>
            </div>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 shrink-0">
            <Clock className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Middle Row: Order Pipeline, Attendance Overview, Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Order Pipeline (5 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-5 border border-rose-100/70 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-rose-50">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4.5 w-4.5 text-rose-600" />
              <h2 className="text-sm font-bold text-slate-900">Order Pipeline</h2>
            </div>
            <Link
              to="/orders"
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 inline-flex items-center gap-1"
            >
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-4 flex-1">
            {/* Pending */}
            <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-100/60 text-center space-y-1">
              <div className="flex justify-center text-rose-600">
                <Clock className="h-5 w-5" />
              </div>
              <span className="text-[11px] font-medium text-slate-600 block">Pending</span>
              <span className="text-xl font-bold text-slate-900 block">
                {stats?.orders?.pending ?? 0}
              </span>
            </div>

            {/* In Progress */}
            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-100/70 text-center space-y-1">
              <div className="flex justify-center text-amber-600">
                <Activity className="h-5 w-5" />
              </div>
              <span className="text-[11px] font-medium text-slate-600 block">In Progress</span>
              <span className="text-xl font-bold text-slate-900 block">
                {stats?.orders?.inProgress ?? 0}
              </span>
            </div>

            {/* Ready */}
            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100/70 text-center space-y-1">
              <div className="flex justify-center text-blue-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <span className="text-[11px] font-medium text-slate-600 block">Ready</span>
              <span className="text-xl font-bold text-slate-900 block">
                {stats?.orders?.ready ?? 0}
              </span>
            </div>

            {/* Delivered */}
            <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-100/70 text-center space-y-1">
              <div className="flex justify-center text-emerald-600">
                <Truck className="h-5 w-5" />
              </div>
              <span className="text-[11px] font-medium text-slate-600 block">Delivered</span>
              <span className="text-xl font-bold text-slate-900 block">
                {stats?.orders?.delivered ?? 0}
              </span>
            </div>
          </div>
        </div>

        {/* Attendance Overview (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-5 border border-rose-100/70 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-rose-50">
            <div className="flex items-center gap-2">
              <CalendarCheck className="h-4.5 w-4.5 text-rose-600" />
              <h2 className="text-sm font-bold text-slate-900">Attendance Overview</h2>
            </div>
            <Link
              to="/attendance"
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 inline-flex items-center gap-1"
            >
              View Report <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="flex items-center justify-between gap-4 pt-4 flex-1">
            {/* Donut Chart */}
            <div className="relative w-36 h-36 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={finalAttendanceData}
                    innerRadius={44}
                    outerRadius={62}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {finalAttendanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-extrabold text-slate-900 leading-none">
                  {presentCount}
                </span>
                <span className="text-[10px] text-slate-400 font-medium mt-0.5">Present</span>
              </div>
            </div>

            {/* Legend Stats */}
            <div className="flex-1 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Present
                </span>
                <span className="font-bold text-slate-900">{presentCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  Absent
                </span>
                <span className="font-bold text-slate-900">{absentCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  Late
                </span>
                <span className="font-bold text-slate-900">{lateCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="h-2 w-2 rounded-full bg-slate-300" />
                  Not Checked In
                </span>
                <span className="font-bold text-slate-900">{notCheckedInCount}</span>
              </div>
            </div>
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
              onClick={onOpenNewOrder}
              className="p-3.5 rounded-xl bg-rose-50/50 hover:bg-rose-100/60 border border-rose-100 text-center transition-all group cursor-pointer"
            >
              <div className="flex justify-center text-rose-600 mb-1.5 group-hover:scale-110 transition-transform">
                <Plus className="h-5 w-5" />
              </div>
              <span className="text-xs font-bold text-slate-800">New Order</span>
            </button>

            <button
              type="button"
              onClick={() => navigate("/attendance")}
              className="p-3.5 rounded-xl bg-rose-50/50 hover:bg-rose-100/60 border border-rose-100 text-center transition-all group cursor-pointer"
            >
              <div className="flex justify-center text-rose-600 mb-1.5 group-hover:scale-110 transition-transform">
                <CalendarCheck className="h-5 w-5" />
              </div>
              <span className="text-xs font-bold text-slate-800">Mark Attendance</span>
            </button>

            <button
              type="button"
              onClick={() => navigate("/employees?action=new")}
              className="p-3.5 rounded-xl bg-rose-50/50 hover:bg-rose-100/60 border border-rose-100 text-center transition-all group cursor-pointer"
            >
              <div className="flex justify-center text-rose-600 mb-1.5 group-hover:scale-110 transition-transform">
                <UserPlus className="h-5 w-5" />
              </div>
              <span className="text-xs font-bold text-slate-800">Add Employee</span>
            </button>

            <button
              type="button"
              onClick={() => navigate("/reports")}
              className="p-3.5 rounded-xl bg-rose-50/50 hover:bg-rose-100/60 border border-rose-100 text-center transition-all group cursor-pointer"
            >
              <div className="flex justify-center text-rose-600 mb-1.5 group-hover:scale-110 transition-transform">
                <BarChart3 className="h-5 w-5" />
              </div>
              <span className="text-xs font-bold text-slate-800">Generate Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* Lower Row: Urgent Deadlines, Branch Performance, Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Urgent Deadlines (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-5 border border-rose-100/70 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-rose-50">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-rose-600" />
              <h2 className="text-sm font-bold text-slate-900">Urgent Deadlines</h2>
            </div>
            <Link
              to="/orders"
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 inline-flex items-center gap-1"
            >
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="divide-y divide-rose-50 pt-2 flex-1">
            {urgentOrders.length > 0 ? (
              urgentOrders.slice(0, 3).map((order) => {
                const deadlineDate = new Date(order.deliveryDeadline);
                const isOverdue = order.isOverdue;
                const isToday = new Date().toDateString() === deadlineDate.toDateString();

                return (
                  <div key={order._id} className="py-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                        <span className="text-xs font-bold text-slate-900 truncate">
                          #{order.orderNumber}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5 pl-5">
                        {order.itemType} – {order.customerName}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isOverdue
                            ? "bg-red-50 text-red-600"
                            : isToday
                            ? "bg-rose-50 text-rose-600"
                            : "bg-amber-50 text-amber-600"
                        }`}
                      >
                        {isOverdue ? "Overdue" : isToday ? "Today" : "Tomorrow"}
                      </span>
                      <span className="block text-[10px] text-slate-400 mt-0.5">
                        {formatDate(order.deliveryDeadline)}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No urgent deadlines today!
              </div>
            )}
          </div>
        </div>

        {/* Branch Performance (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-5 border border-rose-100/70 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-rose-50">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-rose-600" />
              <h2 className="text-sm font-bold text-slate-900">Branch Performance</h2>
            </div>
            <span className="text-xs text-slate-500 font-medium">This Month</span>
          </div>

          <div className="pt-4 flex-1 flex flex-col justify-end">
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={branchesData} barSize={42}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    formatter={(val) => [formatCurrency(val), "Revenue"]}
                    contentStyle={{ borderRadius: 12, border: "1px solid #FFE4E6", fontSize: 12 }}
                  />
                  <Bar dataKey="revenue" radius={[8, 8, 0, 0]}>
                    {branchesData.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className={`grid ${branchesData.length === 1 ? "grid-cols-1" : "grid-cols-2"} gap-2 pt-2 border-t border-rose-50 text-center text-xs`}>
              {branchesData.map((b) => (
                <div key={b.name} className="py-1">
                  <span className="font-bold text-slate-900 block">{formatCurrency(b.revenue)}</span>
                  <span className="text-[11px] text-slate-400">{b.name} ({b.orders} orders)</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-5 border border-rose-100/70 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-rose-50">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-rose-600" />
              <h2 className="text-sm font-bold text-slate-900">Recent Activity</h2>
            </div>
            <Link
              to="/notifications"
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 inline-flex items-center gap-1"
            >
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="divide-y divide-rose-50 pt-2 flex-1 space-y-1">
            {recentOrders.length > 0 ? (
              recentOrders.slice(0, 4).map((order) => (
                <div key={order._id} className="py-2.5 flex items-start gap-2.5">
                  <div className="h-7 w-7 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
                    <FileText className="h-3.5 w-3.5" />
                  </div>
                  <div className="text-xs flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 leading-snug truncate">
                      Order #{order.orderNumber} ({order.itemType})
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
                      <span>{order.customerName}</span>
                      <span className="font-medium text-rose-600">{order.deliveryStatus}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400 space-y-1">
                <Activity className="h-6 w-6 mx-auto text-rose-300" />
                <span className="font-semibold text-slate-600 block">No recent activity</span>
                <span>Recent business activities and orders will appear here.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Attendance Correction Requests Card */}
      <div className="bg-white rounded-2xl border border-rose-100/70 shadow-2xs overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-rose-50 bg-rose-50/20">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <ShieldAlert className="h-4.5 w-4.5 text-amber-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">Attendance Correction Requests</h2>
                {pendingCorrections.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white animate-pulse">
                    {pendingCorrections.length} Pending
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Review and approve missing checkout correction requests submitted by employees.
              </p>
            </div>
          </div>
          <Link
            to="/attendance"
            className="text-xs font-semibold text-rose-600 hover:text-rose-700 inline-flex items-center gap-1"
          >
            Manage in Attendance <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-rose-50/40 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-rose-50">
              <tr>
                <th className="py-3 px-5">#</th>
                <th className="py-3 px-5">Employee</th>
                <th className="py-3 px-5">Date</th>
                <th className="py-3 px-5">Check In</th>
                <th className="py-3 px-5">Existing Check-Out</th>
                <th className="py-3 px-5">Requested Out</th>
                <th className="py-3 px-5">Reason</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rose-50">
              {pendingCorrections.length > 0 ? (
                pendingCorrections.map((c, i) => {
                  const emp = c.employee || {};
                  const initials = emp.name ? emp.name.slice(0, 2).toUpperCase() : "EM";
                  const attDate = c.attendanceDate ? new Date(c.attendanceDate) : null;
                  const inTime = c.attendance?.checkIn?.time ? new Date(c.attendance.checkIn.time) : null;
                  const existingOutTime = c.attendance?.checkOut?.time ? new Date(c.attendance.checkOut.time) : null;
                  const outTime = c.requestedCheckOutTime ? new Date(c.requestedCheckOutTime) : null;
                  const isProcessing = actionInProgressId === c._id;

                  const isSelf = String(emp._id || "") === String(user?._id || "");
                  const isEmpBranchAdmin =
                    emp.role === "Branch Admin" ||
                    emp.role === "Branch Manager" ||
                    (/^\s*branch\s*(admin|man?ager)\s*$/i.test(emp.designation || ""));
                  const canApproveOrReject = isAdminUser || (isBAUser && !isSelf && !isEmpBranchAdmin);

                  return (
                    <tr key={c._id} className="hover:bg-rose-50/30 transition-colors">
                      <td className="py-3.5 px-5 font-bold text-slate-400">{i + 1}</td>
                      <td className="py-3.5 px-5">
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
                      <td className="py-3.5 px-5 font-semibold text-slate-800 whitespace-nowrap">
                        {attDate ? format(attDate, "dd MMM yyyy") : "--"}
                      </td>
                      <td className="py-3.5 px-5 text-slate-700 whitespace-nowrap">
                        {inTime ? format(inTime, "hh:mm a") : "--"}
                      </td>
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        {existingOutTime ? (
                          <span className="text-slate-700 font-medium">{format(existingOutTime, "hh:mm a")}</span>
                        ) : (
                          <span className="inline-block text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/80">
                            Missing Checkout
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 font-semibold text-rose-700 whitespace-nowrap">
                        {outTime ? format(outTime, "hh:mm a") : "--"}
                      </td>
                      <td className="py-3.5 px-5 text-slate-600 max-w-xs truncate" title={c.reason}>
                        "{c.reason}"
                      </td>
                      <td className="py-3.5 px-5">
                        <span className="inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                          {c.status || "Pending"}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          {isSelf ? (
                            <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                              Self Request
                            </span>
                          ) : isBAUser && isEmpBranchAdmin ? (
                            <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                              Awaiting Admin Approval
                            </span>
                          ) : canApproveOrReject ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleApproveCorrection(c)}
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
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-1">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      <span className="font-semibold text-slate-700 text-xs">No pending correction requests</span>
                      <span className="text-[11px] text-slate-400">All checkout correction requests have been reviewed and processed.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Table: Recent Orders */}
      <div className="bg-white rounded-2xl border border-rose-100/70 shadow-2xs overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-rose-50">
          <div className="flex items-center gap-2">
            <FileText className="h-4.5 w-4.5 text-rose-600" />
            <h2 className="text-sm font-bold text-slate-900">Recent Orders</h2>
          </div>
          <Link
            to="/orders"
            className="text-xs font-semibold text-rose-600 hover:text-rose-700 inline-flex items-center gap-1"
          >
            View All <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-rose-50/40 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-rose-50">
              <tr>
                <th className="py-3 px-5">Order ID</th>
                <th className="py-3 px-5">Customer</th>
                <th className="py-3 px-5">Type</th>
                <th className="py-3 px-5">Amount</th>
                <th className="py-3 px-5">Deadline</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5">Payment</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rose-50">
              {recentOrders.length > 0 ? (
                recentOrders.slice(0, 5).map((order) => (
                  <tr key={order._id} className="hover:bg-rose-50/30 transition-colors">
                    <td className="py-3.5 px-5 font-bold text-slate-900">
                      #{order.orderNumber}
                    </td>
                    <td className="py-3.5 px-5 font-medium text-slate-800">
                      {order.customerName}
                    </td>
                    <td className="py-3.5 px-5 text-slate-600">
                      {order.itemType}
                    </td>
                    <td className="py-3.5 px-5 font-bold text-slate-900">
                      {formatCurrency(order.totalPrice)}
                    </td>
                    <td className="py-3.5 px-5 text-slate-500">
                      {formatDate(order.deliveryDeadline)}
                    </td>
                    <td className="py-3.5 px-5">
                      <span
                        className={`inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                          order.deliveryStatus === "Delivered"
                            ? "bg-emerald-50 text-emerald-600"
                            : order.deliveryStatus === "In Progress"
                            ? "bg-blue-50 text-blue-600"
                            : order.deliveryStatus === "Ready"
                            ? "bg-teal-50 text-teal-600"
                            : "bg-rose-50 text-rose-600"
                        }`}
                      >
                        {order.deliveryStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-5">
                      <span
                        className={`inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                          order.paymentStatus === "Paid"
                            ? "bg-emerald-50 text-emerald-600"
                            : order.paymentStatus === "Partial"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-rose-50 text-rose-600"
                        }`}
                      >
                        {order.paymentStatus || "Pending"}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <button
                        type="button"
                        onClick={() => navigate(`/orders`)}
                        className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No orders booked yet. Click "+ New Order" to start.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject Reason Modal */}
      <RejectReasonModal
        isOpen={!!selectedCorrectionForReject}
        onClose={() => setSelectedCorrectionForReject(null)}
        onConfirm={handleConfirmReject}
        title="Reject Attendance Correction Request"
        description={`Please provide an explanation for rejecting ${selectedCorrectionForReject?.employee?.name || "the employee"}'s checkout correction request.`}
      />
    </div>
  );
}

export default AdminDashboardView;
