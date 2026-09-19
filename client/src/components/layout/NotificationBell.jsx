import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, Clock, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import notificationApi from "../../api/notification.api";
import { formatRelativeTime } from "../../utils/formatters";
import { Dropdown } from "../ui/Dropdown";

export function NotificationBell() {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationApi.getMyNotifications(),
    refetchInterval: 30000, // poll notifications every 30s
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => notificationApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const unreadCount = data?.unreadCount || 0;
  const notifications = data?.notifications || [];

  return (
    <Dropdown
      align="right"
      className="w-80 sm:w-96 p-0 shadow-xl overflow-hidden"
      trigger={
        <button
          type="button"
          aria-label="View notifications"
          className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white shadow-xs animate-in zoom-in">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      }
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/75 px-4 py-3">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-slate-900">Notifications</h4>
          {unreadCount > 0 && (
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
              {unreadCount} new
            </span>
          )}
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
            className="flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-700 cursor-pointer"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
        {notifications.length > 0 ? (
          notifications.slice(0, 5).map((notif) => (
            <div
              key={notif._id}
              onClick={() => {
                if (!notif.isRead) markReadMutation.mutate(notif._id);
              }}
              className={`p-3.5 text-left transition-colors cursor-pointer ${
                notif.isRead
                  ? "bg-white hover:bg-slate-50"
                  : "bg-rose-50/40 hover:bg-rose-50/70"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-semibold text-slate-900">
                  {notif.title}
                </p>
                {!notif.isRead && (
                  <span className="h-2 w-2 shrink-0 rounded-full bg-rose-600 mt-1" />
                )}
              </div>
              <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                {notif.message}
              </p>
              <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-2">
                <Clock className="h-3 w-3" />
                <span>{formatRelativeTime(notif.createdAt)}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="py-8 text-center text-xs text-slate-400">
            No notifications at this time.
          </div>
        )}
      </div>

      {/* Footer link */}
      <div className="border-t border-slate-100 bg-slate-50/50 p-2 text-center">
        <Link
          to="/notifications"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 p-1"
        >
          <span>View all notifications</span>
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </Dropdown>
  );
}

export default NotificationBell;
