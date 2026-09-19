import { Routes, Route } from "react-router-dom";
import { ROLES } from "../constants/roles";

// Layouts
import RootLayout from "../layouts/RootLayout";
import AuthLayout from "../layouts/AuthLayout";
import DashboardLayout from "../layouts/DashboardLayout";

// Route Guards
import ProtectedRoute from "./ProtectedRoute";
import PublicRoute from "./PublicRoute";
import RoleGuard from "./RoleGuard";

// Pages
import LoginPage from "../pages/auth/LoginPage";
import ForgotPasswordPage from "../pages/auth/ForgotPasswordPage";
import DashboardShellPage from "../pages/dashboard/DashboardShellPage";
import OrdersPage from "../pages/orders/OrdersPage";
import AttendancePage from "../pages/attendance/AttendancePage";
import AdminAttendancePage from "../pages/attendance/AdminAttendancePage";
import EmployeesPage from "../pages/employees/EmployeesPage";
import NotificationsPage from "../pages/notifications/NotificationsPage";
import ProfilePage from "../pages/profile/ProfilePage";
import ReportsPage from "../pages/reports/ReportsPage";
import SettingsPage from "../pages/settings/SettingsPage";
import NotFoundPage from "../pages/common/NotFoundPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        {/* Public Authentication Routes */}
        <Route
          element={
            <PublicRoute>
              <AuthLayout />
            </PublicRoute>
          }
        >
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>

        {/* Protected Dashboard Routes */}
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardShellPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/attendance" element={<AttendancePage />} />

          {/* Admin Only Routes */}
          <Route
            path="/attendance/admin"
            element={
              <RoleGuard allowedRoles={[ROLES.ADMIN]}>
                <AdminAttendancePage />
              </RoleGuard>
            }
          />
          <Route
            path="/employees"
            element={
              <RoleGuard allowedRoles={[ROLES.ADMIN]}>
                <EmployeesPage />
              </RoleGuard>
            }
          />
          <Route
            path="/reports"
            element={
              <RoleGuard allowedRoles={[ROLES.ADMIN]}>
                <ReportsPage />
              </RoleGuard>
            }
          />

          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        {/* 404 Fallback */}
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default AppRoutes;
