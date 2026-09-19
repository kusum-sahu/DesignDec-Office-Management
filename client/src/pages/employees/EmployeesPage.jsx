import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  UserPlus,
  Search,
  Edit2,
  Trash2,
  Building2,
  Mail,
  Phone,
  X,
} from "lucide-react";
import useUIStore from "../../stores/uiStore";
import employeeApi from "../../api/employee.api";
import { formatDate } from "../../utils/formatters";
import { BRANCHES } from "../../constants/branches";
import { TableSkeleton } from "../../components/ui/Skeleton";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Dialog, {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "../../components/ui/Dialog";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { toast } from "../../utils/toast";

const DEPARTMENTS = ["Design", "Operations", "Installation", "Sales", "Accounts", "Support", "Management"];

export function EmployeesPage() {
  const queryClient = useQueryClient();
  const { activeBranch } = useUIStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    department: DEPARTMENTS[0],
    designation: "Designer",
    branch: "Main Office",
    role: "Employee",
    status: "Active",
  });
  const [formErrors, setFormErrors] = useState({});

  // Query Employees
  const queryParams = {
    page,
    limit,
    search: searchQuery || undefined,
    branch: selectedBranch || activeBranch || undefined,
  };

  const { data: employeesResponse, isLoading } = useQuery({
    queryKey: ["employees", queryParams],
    queryFn: () => employeeApi.getEmployees(queryParams),
  });

  const employees = employeesResponse?.employees || [];
  const totalEmployees = employeesResponse?.pagination?.totalEmployees || 0;
  const totalPages = employeesResponse?.pagination?.totalPages || 1;

  // Create / Update Employee Mutation
  const saveMutation = useMutation({
    mutationFn: (payload) => {
      if (editingEmployee) {
        return employeeApi.updateEmployee(editingEmployee.employeeId, payload);
      }
      return employeeApi.createEmployee(payload);
    },
    onSuccess: () => {
      toast.success(
        editingEmployee ? "Employee Updated!" : "Employee Added Successfully!",
        {
          description: editingEmployee
            ? "Staff details have been updated."
            : "Welcome credentials were sent to their email.",
        }
      );
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      closeModal();
    },
    onError: (err) => {
      toast.error("Operation Failed", {
        description: err.response?.data?.message || "Please check inputs.",
      });
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (empId) => employeeApi.deleteEmployee(empId),
    onSuccess: () => {
      toast.success("Employee Deleted");
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setEmployeeToDelete(null);
    },
    onError: (err) => {
      toast.error("Delete Failed", {
        description: err.response?.data?.message || "Cannot delete this user.",
      });
    },
  });

  const openAddModal = () => {
    setEditingEmployee(null);
    setFormData({
      name: "",
      email: "",
      phone: "",
      department: DEPARTMENTS[0],
      designation: "Designer",
      branch: activeBranch || "Main Office",
      role: "Employee",
      status: "Active",
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (emp) => {
    setEditingEmployee(emp);
    setFormData({
      name: emp.name || "",
      email: emp.email || "",
      phone: emp.phone || "",
      department: emp.department || DEPARTMENTS[0],
      designation: emp.designation || "Staff",
      branch: emp.branch || "Main Office",
      role: emp.role || "Employee",
      status: emp.status || "Active",
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEmployee(null);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!formData.name.trim()) errs.name = "Name is required";
    if (!formData.email.trim()) errs.email = "Email is required";
    setFormErrors(errs);
    if (Object.keys(errs).length > 0) return;

    saveMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rose-100/70 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-heading">
            Employees Directory
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage staff profiles, department assignments, branch allocation, and account credentials.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          leftIcon={<UserPlus className="h-4 w-4" />}
          onClick={openAddModal}
        >
          Add Employee
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-rose-100/70 shadow-2xs">
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, employee ID..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:border-rose-400"
          />
        </div>

        <select
          value={selectedBranch}
          onChange={(e) => {
            setSelectedBranch(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by Branch"
          className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:border-rose-400"
        >
          <option value="">All Branches</option>
          {BRANCHES.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>

        <select
          value={selectedDepartment}
          onChange={(e) => {
            setSelectedDepartment(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by Department"
          className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:border-rose-400"
        >
          <option value="">All Departments</option>
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-2xl border border-rose-100/70 shadow-2xs overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={6} columns={7} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-rose-50/40 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-rose-50">
                <tr>
                  <th className="py-3 px-5">Employee</th>
                  <th className="py-3 px-5">Contact</th>
                  <th className="py-3 px-5">Department & Role</th>
                  <th className="py-3 px-5">Branch</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5">Joined Date</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rose-50">
                {employees.length > 0 ? (
                  employees.map((emp) => {
                    const initials = emp.name ? emp.name.slice(0, 2).toUpperCase() : "DD";
                    return (
                      <tr key={emp._id} className="hover:bg-rose-50/30 transition-colors">
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-rose-100 text-rose-700 font-bold text-xs flex items-center justify-center shrink-0">
                              {initials}
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 block leading-tight">
                                {emp.name}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {emp.employeeId}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-5 space-y-0.5">
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                            <span>{emp.email}</span>
                          </div>
                          {emp.phone && (
                            <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                              <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                              <span>{emp.phone}</span>
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-5">
                          <span className="font-semibold text-slate-800 block">
                            {emp.department || "General"}
                          </span>
                          <span className="text-[11px] text-slate-400 block">
                            {emp.designation || "Staff"}
                          </span>
                        </td>

                        <td className="py-3.5 px-5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">
                            <Building2 className="h-3 w-3 text-rose-500" />
                            {emp.branch || "Main Office"}
                          </span>
                        </td>

                        <td className="py-3.5 px-5">
                          <span
                            className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                              emp.status === "Active"
                                ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                : "bg-red-50 text-red-600 border border-red-100"
                            }`}
                          >
                            {emp.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-5 text-slate-500">
                          {formatDate(emp.joiningDate || emp.createdAt)}
                        </td>

                        <td className="py-3.5 px-5 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditModal(emp)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Edit Employee"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setEmployeeToDelete(emp)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                              title="Delete Employee"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No employees found matching your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Pagination */}
        <div className="flex items-center justify-between p-4 border-t border-rose-50 bg-rose-50/20 text-xs text-slate-500">
          <div>
            Showing {(page - 1) * limit + 1} to{" "}
            {Math.min(page * limit, totalEmployees)} of {totalEmployees} employees
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 rounded-md border border-slate-200 bg-white disabled:opacity-40 hover:bg-rose-50 cursor-pointer"
            >
              &lt;
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setPage(num)}
                className={`h-7 w-7 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                  page === num
                    ? "bg-rose-600 text-white shadow-2xs"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-rose-50"
                }`}
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 rounded-md border border-slate-200 bg-white disabled:opacity-40 hover:bg-rose-50 cursor-pointer"
            >
              &gt;
            </button>
          </div>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <Dialog isOpen={isModalOpen} onClose={closeModal} className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between w-full">
            <DialogTitle>
              {editingEmployee ? `Edit ${editingEmployee.name}` : "Add New Employee"}
            </DialogTitle>
            <button
              type="button"
              onClick={closeModal}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <DialogDescription>
            {editingEmployee
              ? "Update staff assignment and office status."
              : "Create an employee account. A secure temporary password will be dispatched to their email."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleFormSubmit}>
          <DialogBody className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                placeholder="e.g. Rahul Sharma"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                error={formErrors.name}
                required
              />

              <Input
                label="Email Address"
                type="email"
                placeholder="rahul@designdec.in"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                error={formErrors.email}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Phone Number"
                placeholder="+91 98765 43210"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />

              <Select
                label="Branch"
                value={formData.branch}
                onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                options={BRANCHES.map((b) => ({ value: b, label: b }))}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Department"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                options={DEPARTMENTS.map((d) => ({ value: d, label: d }))}
              />

              <Input
                label="Designation / Role Title"
                placeholder="e.g. Senior Interior Designer"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
              />
            </div>

            {editingEmployee && (
              <Select
                label="Account Status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                options={[
                  { value: "Active", label: "Active" },
                  { value: "Inactive", label: "Inactive" },
                ]}
              />
            )}
          </DialogBody>

          <DialogFooter>
            <Button variant="outline" type="button" onClick={closeModal} disabled={saveMutation.isPending}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={saveMutation.isPending}>
              {editingEmployee ? "Save Changes" : "Create Account"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(employeeToDelete)}
        onClose={() => setEmployeeToDelete(null)}
        onConfirm={() => deleteMutation.mutate(employeeToDelete?.employeeId)}
        title={`Remove ${employeeToDelete?.name}?`}
        description="Are you sure you want to delete this employee account? Their historical attendance and records will be unlinked."
        confirmText="Yes, Delete"
        isDestructive
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

export default EmployeesPage;
