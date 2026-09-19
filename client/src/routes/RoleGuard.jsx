import { Outlet } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import useAuthStore from "../stores/authStore";
import Button from "../components/ui/Button";

export function RoleGuard({ allowedRoles = [], children }) {
  const { user } = useAuthStore();

  if (!user || !allowedRoles.includes(user.role)) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center p-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-8 ring-amber-50/50 mb-4">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-1">
          Access Restricted
        </h2>
        <p className="max-w-md text-sm text-slate-500 mb-6">
          Your account role (<span className="font-semibold text-slate-700">{user?.role || "Unknown"}</span>) does not have permission to view this section. Please contact your administrator if you believe this is an error.
        </p>
        <Button variant="primary" onClick={() => (window.location.href = "/")}>
          Return to Dashboard
        </Button>
      </div>
    );
  }

  return children ? children : <Outlet />;
}

export default RoleGuard;
