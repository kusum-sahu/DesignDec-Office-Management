import apiClient from "./client";

export const employeeApi = {
  /**
   * Get paginated employees list with filtering and search
   */
  getEmployees: (params) => apiClient.get("/employees", { params }),

  /**
   * Get single employee by employee ID
   */
  getEmployeeById: (employeeId) => apiClient.get(`/employees/${employeeId}`),

  /**
   * Create new employee (Admin only)
   */
  createEmployee: (data) => apiClient.post("/employees", data),

  /**
   * Update existing employee details
   */
  updateEmployee: (employeeId, data) =>
    apiClient.put(`/employees/${employeeId}`, data),

  /**
   * Delete an employee
   */
  deleteEmployee: (employeeId) => apiClient.delete(`/employees/${employeeId}`),
};

export default employeeApi;
