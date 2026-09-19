import apiClient from "./client";

export const dashboardApi = {
  /**
   * Get unified dashboard statistics (attendance, orders, financials, deadlines, branches)
   */
  getStatistics: (params) => apiClient.get("/dashboard", { params }),

  /**
   * Get today's detailed attendance records
   */
  getTodayAttendance: (params) =>
    apiClient.get("/dashboard/today-attendance", { params }),
};

export default dashboardApi;
