import { useQuery } from "@tanstack/react-query";
import {
  Download,
  IndianRupee,
  ShoppingBag,
  Building2,
  FileSpreadsheet,
  CheckCircle2,
} from "lucide-react";
import { format } from "date-fns";
import useAuthStore from "../../stores/authStore";
import useUIStore from "../../stores/uiStore";
import dashboardApi from "../../api/dashboard.api";
import attendanceApi from "../../api/attendance.api";
import orderApi from "../../api/order.api";
import { formatCurrency, formatDate } from "../../utils/formatters";
import Button from "../../components/ui/Button";
import { toast } from "../../utils/toast";

export function ReportsPage() {
  const { user } = useAuthStore();
  const { activeBranch } = useUIStore();
  const isAdmin = user?.role === "Admin";

  // Fetch live dashboard statistics for financial & order breakdown
  const { data: dashboardResponse } = useQuery({
    queryKey: ["reports-dashboard-stats", activeBranch],
    queryFn: () => dashboardApi.getStatistics(activeBranch ? { branch: activeBranch } : {}),
  });

  // Fetch attendance report
  const { data: attendanceResponse } = useQuery({
    queryKey: ["reports-attendance-data", activeBranch],
    queryFn: () => attendanceApi.getAdminReport({ limit: 50 }),
    enabled: isAdmin,
  });

  const stats = dashboardResponse?.data || {};
  const finances = stats.financials || {};
  const ordersStats = stats.orders || {};
  const branches = stats.branches || [];
  const attendanceRecords = attendanceResponse?.data || [];

  const handleExportAttendanceCSV = () => {
    if (!attendanceRecords.length) {
      toast.error("No attendance data to export.");
      return;
    }
    const headers = ["Employee ID", "Name", "Department", "Date", "Status", "Working Hours"];
    const rows = attendanceRecords.map((r) => [
      r.employee?.employeeId || "",
      r.employee?.name || "",
      r.employee?.department || "",
      formatDate(r.attendanceDate),
      r.attendanceStatus || "",
      r.workingHours || 0,
    ]);
    const csv = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csv));
    link.setAttribute("download", `DesignDec_Attendance_Report_${format(new Date(), "yyyyMMdd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Attendance CSV Exported!");
  };

  const handleExportOrdersCSV = async () => {
    try {
      const res = await orderApi.getOrders({ limit: 100 });
      const orders = res?.orders || [];
      if (!orders.length) {
        toast.error("No orders data to export.");
        return;
      }
      const headers = ["Order Number", "Customer Name", "Contact", "Item Type", "Total Price", "Advance Paid", "Balance", "Status", "Branch"];
      const rows = orders.map((o) => [
        o.orderNumber,
        o.customerName,
        o.contactNo,
        o.itemType,
        o.totalPrice,
        o.advancePaid,
        o.pendingBalance,
        o.deliveryStatus,
        o.branch,
      ]);
      const csv = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
      const link = document.createElement("a");
      link.setAttribute("href", encodeURI(csv));
      link.setAttribute("download", `DesignDec_Orders_Report_${format(new Date(), "yyyyMMdd")}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Orders CSV Exported!");
    } catch {
      toast.error("Export Failed");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rose-100/70 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-heading">
            Executive Reports & Analytics
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time business intelligence, financial performance, and attendance records.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="h-4 w-4" />}
            onClick={handleExportOrdersCSV}
          >
            Export Orders CSV
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<FileSpreadsheet className="h-4 w-4" />}
            onClick={handleExportAttendanceCSV}
          >
            Export Attendance CSV
          </Button>
        </div>
      </div>

      {/* Top 4 Financial KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
        <div className="bg-white rounded-2xl p-5 border border-rose-100/70 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500">Gross Order Value</span>
            <div className="text-2xl font-bold text-slate-900 font-heading mt-0.5">
              {formatCurrency(finances.totalOrderValue || 0)}
            </div>
            <span className="text-[11px] font-semibold text-emerald-600">All non-cancelled orders</span>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <IndianRupee className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-rose-100/70 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500">Advance Collected</span>
            <div className="text-2xl font-bold text-slate-900 font-heading mt-0.5">
              {formatCurrency(finances.totalAdvanceCollected || 0)}
            </div>
            <span className="text-[11px] font-semibold text-emerald-600">Liquid revenue in hand</span>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-rose-100/70 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500">Pending Receivables</span>
            <div className="text-2xl font-bold text-slate-900 font-heading mt-0.5">
              {formatCurrency(finances.totalPendingPayment || 0)}
            </div>
            <span className="text-[11px] font-semibold text-rose-600">Outstanding client balance</span>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <IndianRupee className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-rose-100/70 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500">Production Completed</span>
            <div className="text-2xl font-bold text-slate-900 font-heading mt-0.5">
              {ordersStats.delivered || 0}
            </div>
            <span className="text-[11px] font-semibold text-slate-500">Delivered orders</span>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <ShoppingBag className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Branch Financial Split Table */}
      <div className="bg-white rounded-2xl border border-rose-100/70 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-rose-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-4.5 w-4.5 text-rose-600" />
            <h2 className="text-sm font-bold text-slate-900">Branch Revenue & Revenue Sharing Analysis</h2>
          </div>
          <span className="text-xs text-slate-500 font-medium">Consolidated Audit</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-rose-50/40 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-rose-50">
              <tr>
                <th className="py-3 px-5">Branch</th>
                <th className="py-3 px-5">Total Orders</th>
                <th className="py-3 px-5">Gross Revenue</th>
                <th className="py-3 px-5">Main Office Share</th>
                <th className="py-3 px-5">Branch Share</th>
                <th className="py-3 px-5">Advance Collected</th>
                <th className="py-3 px-5 text-right">Pending Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rose-50">
              {branches.length > 0 ? (
                branches.map((b) => (
                  <tr key={b.branch} className="hover:bg-rose-50/30 transition-colors">
                    <td className="py-3.5 px-5 font-bold text-slate-900 flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-rose-500" />
                      <span>{b.branch}</span>
                    </td>
                    <td className="py-3.5 px-5 font-medium text-slate-800">{b.orderCount}</td>
                    <td className="py-3.5 px-5 font-bold text-slate-900">{formatCurrency(b.orderValue)}</td>
                    <td className="py-3.5 px-5 text-emerald-600 font-semibold">{formatCurrency(b.mainOfficeShare)}</td>
                    <td className="py-3.5 px-5 text-blue-600 font-semibold">{formatCurrency(b.branchShare)}</td>
                    <td className="py-3.5 px-5 text-slate-700">{formatCurrency(b.advanceCollected)}</td>
                    <td className="py-3.5 px-5 font-bold text-rose-600 text-right">{formatCurrency(b.pendingPayment)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No branch metrics available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default ReportsPage;
