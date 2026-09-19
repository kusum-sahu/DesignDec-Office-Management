import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import useAuthStore from "../../stores/authStore";
import useUIStore from "../../stores/uiStore";
import dashboardApi from "../../api/dashboard.api";
import orderApi from "../../api/order.api";
import attendanceApi from "../../api/attendance.api";
import notificationApi from "../../api/notification.api";
import AdminDashboardView from "./AdminDashboardView";
import EmployeeDashboardView from "./EmployeeDashboardView";
import CheckInModal from "../../components/attendance/CheckInModal";
import CreateOrderModal from "../../components/orders/CreateOrderModal";
import { CardSkeleton } from "../../components/ui/Skeleton";
import ErrorState from "../../components/ui/ErrorState";

export function DashboardShellPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { activeBranch } = useUIStore();

  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [isCreateOrderModalOpen, setIsCreateOrderModalOpen] = useState(false);

  const isAdmin = user?.role === "Admin";

  // Dashboard Stats Query (Admin / Branch Manager)
  const {
    data: dashboardResponse,
    isLoading: isDashboardLoading,
    isError: isDashboardError,
    error: dashboardError,
    refetch: refetchDashboard,
  } = useQuery({
    queryKey: ["dashboard-stats", activeBranch],
    queryFn: () =>
      dashboardApi.getStatistics(activeBranch ? { branch: activeBranch } : {}),
    enabled: isAdmin,
  });

  // Employee Specific Queries (Orders, Attendance History, Notifications)
  const { data: employeeOrdersData } = useQuery({
    queryKey: ["employee-orders"],
    queryFn: () => orderApi.getOrders({ limit: 10 }),
    enabled: !isAdmin,
  });

  // Dedicated Today Attendance Query (Single Source of Truth)
  const {
    data: todayAttendanceResponse,
    refetch: refetchTodayAttendance,
  } = useQuery({
    queryKey: ["today-attendance", user?._id],
    queryFn: () => attendanceApi.getToday(),
  });

  const { data: attendanceHistoryData } = useQuery({
    queryKey: ["employee-attendance-history"],
    queryFn: () => attendanceApi.getHistory({ limit: 30 }),
    enabled: !isAdmin,
  });

  const { data: notificationsData } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationApi.getMyNotifications(),
    enabled: !isAdmin,
  });

  const handleAttendanceSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["today-attendance"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    queryClient.invalidateQueries({ queryKey: ["employee-attendance-history"] });
    refetchTodayAttendance();
  };

  const handleOrderCreated = () => {
    queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    queryClient.invalidateQueries({ queryKey: ["employee-orders"] });
  };

  // Determine if employee is currently checked in today from backend single source of truth
  const todayRecord =
    todayAttendanceResponse?.data ||
    (attendanceHistoryData?.data || []).find((att) => {
      const attDate = new Date(att.attendanceDate);
      const today = new Date();
      return attDate.toDateString() === today.toDateString();
    }) ||
    null;

  const isCheckedIn = Boolean(todayRecord?.checkIn?.time);
  const isCheckedOut = Boolean(todayRecord?.checkOut?.time);

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {isAdmin ? (
        isDashboardLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5 pt-4">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : isDashboardError ? (
          <ErrorState
            title="Failed to Load Dashboard Metrics"
            message={dashboardError?.message || "Please check backend server connection."}
            onRetry={() => refetchDashboard()}
          />
        ) : (
          <AdminDashboardView
            stats={dashboardResponse?.data}
            activeBranch={activeBranch}
            onOpenNewOrder={() => setIsCreateOrderModalOpen(true)}
          />
        )
      ) : (
        <EmployeeDashboardView
          user={user}
          orders={employeeOrdersData?.orders || []}
          attendanceRecords={attendanceHistoryData?.data || []}
          todayRecord={todayRecord}
          incompleteAttendance={todayAttendanceResponse?.incompletePreviousAttendance}
          notifications={notificationsData?.notifications || []}
          onCheckInClick={() => setIsCheckInModalOpen(true)}
          onCorrectionSuccess={() => {
            refetchTodayAttendance();
            queryClient.invalidateQueries({ queryKey: ["today-attendance"] });
            queryClient.invalidateQueries({ queryKey: ["employee-attendance-history"] });
          }}
        />
      )}

      {/* Global Modals */}
      <CheckInModal
        isOpen={isCheckInModalOpen}
        onClose={() => setIsCheckInModalOpen(false)}
        onSuccess={handleAttendanceSuccess}
        isCheckOut={isCheckedIn && !isCheckedOut}
      />

      <CreateOrderModal
        isOpen={isCreateOrderModalOpen}
        onClose={() => setIsCreateOrderModalOpen(false)}
        onSuccess={handleOrderCreated}
        defaultBranch={user?.branch || "Main Office"}
      />
    </div>
  );
}

export default DashboardShellPage;
