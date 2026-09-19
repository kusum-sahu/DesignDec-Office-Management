import { useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { X, LogOut, Building2 } from "lucide-react";
import { cn } from "../../utils/cn";
import { NAVIGATION_ITEMS } from "../../constants/navigation";
import useAuthStore from "../../stores/authStore";
import useUIStore from "../../stores/uiStore";
import BrandLogo from "./BrandLogo";
import notificationApi from "../../api/notification.api";
import plantImg from "../../assets/plant-illustration.png";

export function MobileDrawer() {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { isMobileDrawerOpen, setMobileDrawerOpen } = useUIStore();

  const userRole = user?.role || "Employee";
  const isEmployee = userRole === "Employee";

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

  // Close drawer whenever route changes
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [location.pathname, setMobileDrawerOpen]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isMobileDrawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMobileDrawerOpen]);

  if (!isMobileDrawerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        onClick={() => setMobileDrawerOpen(false)}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in-0 duration-200"
      />

      {/* Drawer Panel */}
      <div className="fixed inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-gradient-to-b from-white via-[#FFF8F9] to-[#FEEFF1] shadow-2xl transition-transform animate-in slide-in-from-left duration-250 z-10 border-r border-rose-200/80">
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-rose-100/80 px-4 bg-white/60">
          <BrandLogo />
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(false)}
            aria-label="Close navigation"
            className="rounded-lg p-2 text-slate-400 hover:bg-rose-100/60 hover:text-rose-600 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User Info Bar */}
        <div className="p-4 border-b border-rose-200/60 bg-rose-100/40">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-600 font-bold text-sm text-white shadow-xs">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : "DD"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">
                {user?.name || "Employee"}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {user?.employeeId || "DD000"} • {user?.role}
              </p>
            </div>
          </div>
          {user?.branch && (
            <div className="mt-2.5 flex items-center gap-1.5 text-xs text-slate-600">
              <Building2 className="h-3.5 w-3.5 text-rose-600" />
              <span className="font-medium truncate">{user.branch}</span>
            </div>
          )}
        </div>

        {/* Navigation Items */}
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
                className={({ isActive }) =>
                  cn(
                    "relative group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-rose-100/80 text-rose-700 font-semibold shadow-2xs border border-rose-200/60"
                      : "text-slate-600 hover:bg-rose-100/40 hover:text-slate-900"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-md bg-rose-600 shadow-sm" />
                    )}
                    <Icon
                      className={cn(
                        "h-5 w-5 shrink-0",
                        isActive ? "text-rose-600" : "text-slate-400"
                      )}
                    />
                    <span className="truncate flex-1">{displayTitle}</span>

                    {item.path === "/notifications" && unreadCount > 0 && (
                      <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[11px] font-bold text-white bg-rose-600 rounded-full shadow-2xs">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}

          {/* Plant Card in Mobile Drawer */}
          <div className="pt-3">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white via-rose-50 to-rose-100/60 p-3.5 border border-rose-200/80 shadow-xs">
              <div className="relative z-10 max-w-[110px]">
                <p className="text-[13px] font-extrabold leading-snug text-slate-800">
                  Better<br />
                  People.<br />
                  <span className="text-rose-600">Brighter</span><br />
                  Spaces.
                </p>
              </div>
              <div className="absolute -right-2 -bottom-2 w-20 h-24 pointer-events-none flex items-end justify-end">
                <img
                  src={plantImg}
                  alt="DesignDec Plants"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Logout Button in Drawer Footer */}
        <div className="border-t border-rose-100/80 p-4 bg-white/40">
          <button
            type="button"
            onClick={() => {
              setMobileDrawerOpen(false);
              logout();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50/50 py-2.5 px-4 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default MobileDrawer;
