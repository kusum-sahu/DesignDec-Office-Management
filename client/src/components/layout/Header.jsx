import { useState } from "react";
import {
  Menu,
  Building2,
  LogOut,
  User,
  KeyRound,
  ChevronDown,
  Search,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../../stores/authStore";
import useUIStore from "../../stores/uiStore";
import { ROLES, ROLE_LABELS } from "../../constants/roles";
import { BRANCHES } from "../../constants/branches";
import { Dropdown, DropdownItem, DropdownDivider } from "../ui/Dropdown";
import NotificationBell from "./NotificationBell";
import ConfirmDialog from "../ui/ConfirmDialog";
import Badge from "../ui/Badge";

export function Header() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { toggleMobileDrawer, activeBranch, setActiveBranch } = useUIStore();
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const isAdmin = user?.role === ROLES.ADMIN;

  const handleLogout = async () => {
    await logout();
    setIsLogoutDialogOpen(false);
    navigate("/login");
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/orders?search=${encodeURIComponent(searchQuery.trim())}`);
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-rose-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 px-4 backdrop-blur-md sm:px-6 shadow-2xs shrink-0 transition-colors">
        {/* Left Side: Hamburger & Global Search */}
        <div className="flex items-center gap-3.5 flex-1 max-w-xl">
          <button
            type="button"
            onClick={toggleMobileDrawer}
            aria-label="Open navigation menu"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-100 dark:border-slate-800 text-slate-600 dark:text-slate-300 transition-colors hover:bg-rose-50 dark:hover:bg-slate-800 hover:text-rose-600 lg:hidden cursor-pointer shrink-0"
          >
            <Menu className="h-4.5 w-4.5" />
          </button>

          {/* Global Search Bar (Pill style matching reference screenshots) */}
          <form onSubmit={handleSearchSubmit} className="relative w-full max-w-sm hidden sm:block">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search orders, tasks, or anything..."
              className="w-full pl-9.5 pr-4 py-2 text-xs rounded-full border border-slate-200/90 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/80 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-rose-400 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-rose-100/70 dark:focus:ring-rose-950/40 transition-all shadow-2xs"
            />
          </form>
        </div>

        {/* Right Side: Branch Selector, Notification Bell, User Profile */}
        <div className="flex items-center gap-3">
          {/* Branch Selector Pill */}
          {isAdmin ? (
            <div className="relative hidden md:flex items-center">
              <div className="flex items-center gap-2 rounded-full border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-2xs hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
                <Building2 className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                <select
                  value={activeBranch || ""}
                  onChange={(e) => setActiveBranch(e.target.value || null)}
                  aria-label="Filter by Branch"
                  className="bg-transparent text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer pr-1"
                >
                  <option value="" className="dark:bg-slate-800">All Branches (Consolidated)</option>
                  {BRANCHES.map((b) => (
                    <option key={b} value={b} className="dark:bg-slate-800">
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-1.5 rounded-full border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-2xs">
              <Building2 className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{user?.branch || "Santoshpur Branch"}</span>
            </div>
          )}

          {/* Notification Bell */}
          <NotificationBell />

          {/* User Profile Capsule Dropdown */}
          <Dropdown
            align="right"
            trigger={
              <div className="flex items-center gap-2.5 rounded-full border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-slate-800 p-1 pr-3 hover:border-rose-200 dark:hover:border-rose-900/60 hover:bg-rose-50/30 dark:hover:bg-slate-700/60 transition-all shadow-2xs cursor-pointer select-none">
                {user?.profileImage ? (
                  <img
                    src={user.profileImage}
                    alt={user.name}
                    className="h-8 w-8 rounded-full object-cover ring-2 ring-rose-100 dark:ring-slate-700"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-600 font-bold text-xs text-white shadow-2xs">
                    {user?.name ? user.name.slice(0, 2).toUpperCase() : "DD"}
                  </div>
                )}

                <div className="hidden text-left sm:block min-w-[70px]">
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight truncate max-w-[130px]">
                    {user?.name || "DesignDec Admin"}
                  </div>
                  <div className="text-[10.5px] text-slate-400 dark:text-slate-400 font-medium leading-none mt-0.5">
                    {user?.employeeId || "DD-2026-001"}
                  </div>
                </div>

                <ChevronDown className="h-3.5 w-3.5 text-slate-400 ml-0.5" />
              </div>
            }
          >
            <div className="px-3.5 py-2.5 border-b border-rose-50 dark:border-slate-800 bg-rose-50/30 dark:bg-slate-800/80">
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{user?.name}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{user?.email}</p>
              <div className="mt-2 flex items-center gap-1.5">
                <Badge variant={isAdmin ? "brand" : "secondary"} size="sm">
                  {ROLE_LABELS[user?.role] || user?.role}
                </Badge>
                {user?.branch && (
                  <Badge variant="outline" size="sm">
                    {user.branch}
                  </Badge>
                )}
              </div>
            </div>

            <DropdownItem
              icon={User}
              onClick={() => navigate("/profile")}
            >
              My Profile
            </DropdownItem>

            <DropdownItem
              icon={KeyRound}
              onClick={() => navigate("/profile#security")}
            >
              Change Password
            </DropdownItem>

            <DropdownDivider />

            <DropdownItem
              icon={LogOut}
              destructive
              onClick={() => setIsLogoutDialogOpen(true)}
            >
              Log Out
            </DropdownItem>
          </Dropdown>
        </div>
      </header>

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isLogoutDialogOpen}
        onClose={() => setIsLogoutDialogOpen(false)}
        onConfirm={handleLogout}
        title="Log Out of DesignDec"
        description="Are you sure you want to log out? You will need to enter your credentials to log back in."
        confirmText="Log Out"
        cancelText="Stay Logged In"
        isDestructive
      />
    </>
  );
}

export default Header;
