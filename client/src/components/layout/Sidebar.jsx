import { NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "../../utils/cn";
import { NAVIGATION_ITEMS } from "../../constants/navigation";
import useAuthStore from "../../stores/authStore";
import useUIStore from "../../stores/uiStore";
import BrandLogo from "./BrandLogo";
import notificationApi from "../../api/notification.api";
import plantImg from "../../assets/plant-illustration.png";

export function Sidebar() {
  const { user } = useAuthStore();
  const { isSidebarCollapsed, toggleSidebar } = useUIStore();

  const userRole = user?.role || "Employee";
  const isEmployee = userRole === "Employee";

  // Real unread notification count
  const { data: notifData } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationApi.getMyNotifications(),
    staleTime: 30000,
  });

  const unreadCount = notifData?.unreadCount || 0;

  // Filter navigation items by role
  const accessibleItems = NAVIGATION_ITEMS.filter((item) =>
    item.roles.includes(userRole)
  );

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col border-r border-rose-200/80 bg-gradient-to-b from-white via-[#FFF8F9] to-[#FEEFF1] shadow-[2px_0_15px_rgba(244,63,94,0.03)] transition-all duration-300 select-none z-40 shrink-0 h-screen sticky top-0",
        isSidebarCollapsed ? "w-20" : "w-64"
      )}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between border-b border-rose-100/80 px-4 bg-white/60 backdrop-blur-xs shrink-0">
        <BrandLogo collapsed={isSidebarCollapsed} />
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
        {accessibleItems.map((item) => {
          const Icon = item.icon;
          const displayTitle =
            isEmployee && item.employeeTitle ? item.employeeTitle : item.title;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              title={isSidebarCollapsed ? displayTitle : undefined}
              className={({ isActive }) =>
                cn(
                  "relative group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150 cursor-pointer",
                  isActive
                    ? "bg-rose-100/80 text-rose-700 font-semibold shadow-2xs border border-rose-200/60"
                    : "text-slate-600 hover:bg-rose-100/40 hover:text-slate-900",
                  isSidebarCollapsed && "justify-center px-2"
                )
              }
            >
              {({ isActive }) => (
                <>
                  {/* Active Indicator Left Vertical Bar */}
                  {isActive && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-md bg-rose-600 shadow-sm" />
                  )}

                  <Icon
                    className={cn(
                      "h-5 w-5 shrink-0 transition-colors",
                      isActive
                        ? "text-rose-600"
                        : "text-slate-400 group-hover:text-slate-600"
                    )}
                  />

                  {!isSidebarCollapsed && (
                    <span className="truncate flex-1">{displayTitle}</span>
                  )}

                  {/* Notification Badge */}
                  {!isSidebarCollapsed && item.path === "/notifications" && unreadCount > 0 && (
                    <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[11px] font-bold text-white bg-rose-600 rounded-full shadow-2xs">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Promotional Plant Card (DesignDec Signature UI) */}
      {!isSidebarCollapsed && (
        <div className="px-3 pb-3 shrink-0">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white via-rose-50 to-rose-100/60 p-3.5 border border-rose-200/80 shadow-xs">
            {/* Subtle restrained dot grid accent in card */}
            <div className="absolute top-2 right-2 flex gap-1 opacity-50 pointer-events-none" aria-hidden="true">
              <span className="h-1 w-1 rounded-full bg-rose-400" />
              <span className="h-1 w-1 rounded-full bg-rose-400" />
              <span className="h-1 w-1 rounded-full bg-rose-400" />
            </div>

            <div className="relative z-10 max-w-[110px]">
              <p className="text-[13px] font-extrabold leading-snug text-slate-800">
                Better<br />
                People.<br />
                <span className="text-rose-600">Brighter</span><br />
                Spaces.
              </p>
            </div>
            {/* Plant Image floating on right */}
            <div className="absolute -right-2 -bottom-2 w-24 h-28 pointer-events-none flex items-end justify-end">
              <img
                src={plantImg}
                alt="DesignDec Plants"
                className="w-full h-full object-contain drop-shadow-xs"
              />
            </div>
          </div>
        </div>
      )}

      {/* Footer Row: Copyright & Collapse Button */}
      <div className="border-t border-rose-100/80 p-3 flex items-center justify-between gap-2 bg-white/40 shrink-0">
        {!isSidebarCollapsed ? (
          <>
            <div className="text-[11px] text-slate-400 leading-tight">
              © 2026 DesignDec.<br />All rights reserved.
            </div>
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label="Collapse sidebar"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-100/70 transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Expand sidebar"
            className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-100/70 transition-colors cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
