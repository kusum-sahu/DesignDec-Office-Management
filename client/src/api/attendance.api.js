import apiClient from "./client";

export const attendanceApi = {
  /**
   * Get logged-in user's today attendance record (Single Source of Truth)
   */
  getToday: () => apiClient.get("/attendance/today"),

  /**
   * Check in with selfie photo and location coordinates (FormData)
   */
  checkIn: (formData) =>
    apiClient.post("/attendance/check-in", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  /**
   * Check out with selfie photo and location coordinates (FormData)
   */
  checkOut: (formData) =>
    apiClient.post("/attendance/check-out", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  /**
   * Get attendance history for logged-in employee
   */
  getHistory: (params) => apiClient.get("/attendance/history", { params }),

  /**
   * Get overall attendance report across employees (Admin only)
   */
  getAdminReport: (params) => apiClient.get("/attendance/admin", { params }),

  /**
   * Get attendance settings and branch geofences
   */
  getSettings: () => apiClient.get("/attendance/settings"),

  /**
   * Update branch office coordinates (Admin only)
   */
  updateBranchLocation: (payload) =>
    apiClient.put("/attendance/settings/branch-location", payload),

  /**
   * Get past incomplete attendance records for logged-in employee
   */
  getIncomplete: () => apiClient.get("/attendance/incomplete"),

  /**
   * Submit correction request (employee cannot directly edit times)
   */
  submitCorrectionRequest: (payload) =>
    apiClient.post("/attendance/correction-request", payload),

  /**
   * Get logged-in employee's correction requests
   */
  getMyCorrectionRequests: () =>
    apiClient.get("/attendance/correction-requests/my"),

  /**
   * Get all correction requests (Admin & Branch Manager)
   */
  getAllCorrectionRequests: (params) =>
    apiClient.get("/attendance/correction-requests", { params }),

  /**
   * Approve a correction request (Admin & Branch Manager)
   */
  approveCorrectionRequest: (id, payload) =>
    apiClient.patch(`/attendance/correction-requests/${id}/approve`, payload),

  /**
   * Reject a correction request (Admin & Branch Manager)
   */
  rejectCorrectionRequest: (id, payload) =>
    apiClient.patch(`/attendance/correction-requests/${id}/reject`, payload),
};

export default attendanceApi;
