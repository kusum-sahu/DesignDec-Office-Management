import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  CheckCheck,
  Clock,
  FileText,
  Users,
  AlertTriangle,
  CreditCard,
  Calendar,
  MoreVertical,
  Filter,
} from "lucide-react";
import useAuthStore from "../../stores/authStore";
import notificationApi from "../../api/notification.api";
import { formatRelativeTime } from "../../utils/formatters";
import { TableSkeleton } from "../../components/ui/Skeleton";
import Button from "../../components/ui/Button";
import plantImg from "../../assets/plant-illustration.png";
import { toast } from "../../utils/toast";

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.role === "Admin";

  const [selectedTab, setSelectedTab] = useState("All");
  const [filterType, setFilterType] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");

  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationApi.getMyNotifications(),
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("All notifications marked as read.");
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => notificationApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const allNotifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  // Filter logic
  const filteredNotifications = allNotifications.filter((n) => {
    if (selectedTab === "Unread") return !n.isRead;
    if (selectedTab === "Orders") return n.type === "NEW_BRANCH_ORDER" || n.type === "DEADLINE_ALERT" || n.order;
    if (selectedTab === "Attendance") return n.type === "STATUS_UPDATE" || n.title?.toLowerCase().includes("attendance");
    if (selectedTab === "Employees") return n.title?.toLowerCase().includes("employee");
    if (selectedTab === "System") return n.type === "PAYMENT_ALERT" || !n.order;
    return true;
  });

  const getNotificationIcon = (item) => {
    const type = item.type || "";
    const title = (item.title || "").toLowerCase();

    if (type === "NEW_BRANCH_ORDER" || title.includes("order")) {
      return { icon: FileText, bg: "bg-rose-100 text-rose-600" };
    }
    if (type === "PAYMENT_ALERT" || title.includes("payment")) {
      return { icon: CreditCard, bg: "bg-emerald-100 text-emerald-600" };
    }
    if (type === "DEADLINE_ALERT" || title.includes("deadline") || title.includes("alert")) {
      return { icon: AlertTriangle, bg: "bg-amber-100 text-amber-600" };
    }
    if (title.includes("attendance") || title.includes("checked")) {
      return { icon: Calendar, bg: "bg-blue-100 text-blue-600" };
    }
    if (title.includes("employee") || title.includes("staff")) {
      return { icon: Users, bg: "bg-purple-100 text-purple-600" };
    }
    return { icon: Bell, bg: "bg-rose-100 text-rose-600" };
  };

  const getCategoryPill = (item) => {
    const title = (item.title || "").toLowerCase();
    if (title.includes("order")) return { label: "Order", color: "bg-emerald-50 text-emerald-600" };
    if (title.includes("employee")) return { label: "Employee", color: "bg-blue-50 text-blue-600" };
    if (title.includes("attendance")) return { label: "Attendance", color: "bg-rose-50 text-rose-600" };
    if (title.includes("payment")) return { label: "Payment", color: "bg-emerald-50 text-emerald-700" };
    if (title.includes("leave")) return { label: "Leave", color: "bg-purple-50 text-purple-600" };
    if (title.includes("stock") || title.includes("inventory")) return { label: "Inventory", color: "bg-amber-50 text-amber-700" };
    return { label: "System", color: "bg-slate-100 text-slate-600" };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-rose-50/60 via-white to-rose-50/40 p-6 border border-rose-100/70 shadow-2xs">
        <div className="absolute right-1/4 top-3 w-32 h-16 bg-dot-pattern opacity-60 pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-heading">
              Notifications
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {isAdmin
                ? "Stay updated with important activities across your office management system."
                : "Stay updated with important information, tasks, and activities."}
            </p>
          </div>

          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<CheckCheck className="h-4 w-4 text-slate-600" />}
              onClick={() => markAllMutation.mutate()}
              isLoading={markAllMutation.isPending}
            >
              Mark All as Read
            </Button>
          )}
        </div>
      </div>

      {/* Main Grid: Feed + Right Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Feed Section (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-rose-100/70 shadow-2xs overflow-hidden flex flex-col">
          {/* Filter Tabs Bar */}
          <div className="flex items-center gap-2 p-4 border-b border-rose-50 overflow-x-auto scrollbar-none">
            {[
              { label: "All", count: allNotifications.length, key: "All" },
              ...(isAdmin ? [{ label: "Unread", count: unreadCount, key: "Unread" }] : []),
              { label: "Orders", count: allNotifications.filter((n) => n.order).length, key: "Orders" },
              { label: "Attendance", count: allNotifications.filter((n) => n.title?.toLowerCase().includes("attendance")).length, key: "Attendance" },
              { label: isAdmin ? "Employees" : "Tasks", count: 1, key: isAdmin ? "Employees" : "Tasks" },
              { label: isAdmin ? "System" : "Announcements", count: 1, key: isAdmin ? "System" : "Announcements" },
            ].map((tab) => {
              const isActive = selectedTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSelectedTab(tab.key)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? "bg-rose-50 text-rose-600 border border-rose-200 shadow-2xs"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {tab.label} {tab.count > 0 && `(${tab.count})`}
                </button>
              );
            })}
          </div>

          {/* Notifications List */}
          {isLoading ? (
            <TableSkeleton rows={5} columns={4} />
          ) : (
            <div className="divide-y divide-rose-50 flex-1">
              {filteredNotifications.length > 0 ? (
                filteredNotifications.map((notif) => {
                  const { icon: Icon, bg } = getNotificationIcon(notif);
                  const cat = getCategoryPill(notif);

                  return (
                    <div
                      key={notif._id}
                      onClick={() => {
                        if (!notif.isRead) markReadMutation.mutate(notif._id);
                      }}
                      className={`p-4.5 flex items-start justify-between gap-4 transition-colors cursor-pointer ${
                        notif.isRead
                          ? "bg-white hover:bg-rose-50/20"
                          : "bg-rose-50/30 hover:bg-rose-50/50"
                      }`}
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${bg} shadow-2xs mt-0.5`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>

                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-xs font-bold text-slate-900 leading-snug">
                              {notif.title}
                            </h4>
                            <span
                              className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${cat.color}`}
                            >
                              {cat.label}
                            </span>
                          </div>

                          <p className="text-xs text-slate-600 leading-relaxed">
                            {notif.message}
                          </p>

                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-0.5">
                            <Clock className="h-3 w-3" />
                            <span>{formatRelativeTime(notif.createdAt)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Red unread indicator dot */}
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${
                            !notif.isRead ? "bg-rose-600 ring-4 ring-rose-100" : "bg-slate-300"
                          }`}
                        />
                        <button
                          type="button"
                          className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-16 text-center text-xs text-slate-400">
                  <Bell className="h-8 w-8 mx-auto text-rose-200 mb-2" />
                  <p className="font-semibold text-slate-700">No notifications found</p>
                  <p className="mt-0.5">You're all caught up with your updates.</p>
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          <div className="p-4 border-t border-rose-50 bg-rose-50/10 flex items-center justify-between text-xs text-slate-500">
            <span>Showing 1 to {filteredNotifications.length} of {allNotifications.length} notifications</span>
            <div className="flex items-center gap-1">
              <button type="button" className="px-2.5 py-1 rounded bg-rose-600 text-white font-bold">1</button>
            </div>
          </div>
        </div>

        {/* Right Sidebar Widgets (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Unread Count Box */}
          <div className="bg-white rounded-2xl p-5 border border-rose-100/70 shadow-2xs flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 shrink-0">
              <Bell className="h-6 w-6" />
            </div>
            <div>
              <span className="text-2xl font-extrabold text-slate-900 font-heading block">
                {unreadCount}
              </span>
              <span className="text-xs text-slate-500 block">
                {unreadCount === 1 ? "1 unread notification" : `${unreadCount} unread notifications`}
              </span>
            </div>
          </div>

          {/* Filter Notifications Form / Panel */}
          <div className="bg-white rounded-2xl p-5 border border-rose-100/70 shadow-2xs space-y-3.5">
            <div className="flex items-center gap-2 pb-2 border-b border-rose-50">
              <Filter className="h-4 w-4 text-rose-600" />
              <h3 className="text-xs font-bold text-slate-900">Filter Notifications</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Type</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs focus:outline-none focus:border-rose-400"
                >
                  <option value="All">All Types</option>
                  <option value="Orders">Orders</option>
                  <option value="Attendance">Attendance</option>
                  <option value="System">System</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs focus:outline-none focus:border-rose-400"
                >
                  <option value="All">All Notifications</option>
                  <option value="Unread">Unread Only</option>
                  <option value="Read">Read Only</option>
                </select>
              </div>

              <Button
                variant="primary"
                size="sm"
                className="w-full mt-2"
                onClick={() => toast.success("Filters applied")}
              >
                Apply Filters
              </Button>
            </div>
          </div>

          {/* Inspirational Plant Motif Card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-50/90 via-pink-50/60 to-rose-100/40 p-5 border border-rose-100 shadow-2xs">
            <p className="text-xs font-extrabold text-slate-800 leading-relaxed max-w-[160px]">
              “Small updates build a better tomorrow.”
            </p>
            <div className="font-script text-xl text-rose-400 font-bold mt-2">
              DesignDec —
            </div>

            <div className="absolute -right-2 -bottom-2 w-24 h-28 pointer-events-none flex items-end justify-end">
              <img
                src={plantImg}
                alt="Rubber plant"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NotificationsPage;
