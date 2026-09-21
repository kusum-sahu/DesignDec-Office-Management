import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShoppingBag,
  Plus,
  Search,
  RotateCcw,
  Clock,
  Activity,
  CheckCircle2,
  Calendar,
  Eye,
  CreditCard,
  Edit3,
  Trash2,
  ChevronDown,
} from "lucide-react";
import useAuthStore from "../../stores/authStore";
import useUIStore from "../../stores/uiStore";
import orderApi from "../../api/order.api";
import { formatCurrency, formatDate } from "../../utils/formatters";
import CreateOrderModal from "../../components/orders/CreateOrderModal";
import EditOrderModal from "../../components/orders/EditOrderModal";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import Dialog, {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "../../components/ui/Dialog";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { TableSkeleton } from "../../components/ui/Skeleton";
import { toast } from "../../utils/toast";
import designerBannerImg from "../../assets/designer-banner.png";

const ORDER_STATUSES = ["All", "Pending", "In Progress", "Ready", "Delivered", "Cancelled"];

export function OrdersPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { activeBranch } = useUIStore();

  const isAdmin = user?.role === "Admin";
  const isBranchAdmin =
    user?.role === "Branch Admin" ||
    user?.role === "Branch Manager" ||
    (user?.role !== "Admin" && /^\s*branch\s*(admin|man?ager)\s*$/i.test(user?.designation || ""));

  // Filter & Pagination States
  const [selectedStatusTab, setSelectedStatusTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState(null);
  const [selectedOrderForEdit, setSelectedOrderForEdit] = useState(null);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [orderToDelete, setOrderToDelete] = useState(null);

  // RBAC Permission Rules:
  // - Admin: Full access across Main Office and Santoshpur Branch (Edit, Payment, Status, Delete).
  // - Branch Admin: Full access only for their assigned branch.
  // - Normal Employees: View and Create only for assigned branch; cannot Edit, Add Payment, Update Status, or Delete.
  // - Financial details: Visible to ALL roles.
  const canManageOrder = (order) => {
    if (!order) return false;
    if (isAdmin) return true;
    if (order.branch === "Main Office") return false;
    if (isBranchAdmin && order.branch === user?.branch) return true;
    return false;
  };

  // Orders Query
  const queryParams = {
    page,
    limit,
    search: searchQuery || undefined,
    deliveryStatus: selectedStatusTab !== "All" ? selectedStatusTab : undefined,
  };
  if (isAdmin) {
    if (activeBranch) queryParams.branch = activeBranch;
  } else {
    // Non-admin branch staff strictly filtered to user's assigned branch
    queryParams.branch = user?.branch || undefined;
  }

  const { data: ordersResponse, isLoading } = useQuery({
    queryKey: ["orders", queryParams],
    queryFn: () => orderApi.getOrders(queryParams),
  });

  const rawOrders = ordersResponse?.orders || [];
  // Strict Defense-in-Depth: Never display Main Office orders to branch office staff
  const orders = !isAdmin
    ? rawOrders.filter((o) => o.branch !== "Main Office" && (!user?.branch || o.branch === user?.branch))
    : rawOrders;
  const totalRecords = !isAdmin ? orders.length : (ordersResponse?.totalRecords || 0);
  const totalPages = ordersResponse?.totalPages || 1;

  // Status Counts for Tabs
  const pendingCount = orders.filter((o) => o.deliveryStatus === "Pending").length;
  const inProgressCount = orders.filter((o) => o.deliveryStatus === "In Progress").length;
  const readyCount = orders.filter((o) => o.deliveryStatus === "Ready").length;
  const deliveredCount = orders.filter((o) => o.deliveryStatus === "Delivered").length;
  const cancelledCount = orders.filter((o) => o.deliveryStatus === "Cancelled").length;

  // Update Status Mutation
  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => orderApi.updateStatus(id, status),
    onSuccess: (res, variables) => {
      const updatedStatus = res?.order?.deliveryStatus || variables?.status;
      toast.success("Status Updated", {
        description: `Order is now ${updatedStatus}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (err) => {
      toast.error("Failed to update status", {
        description: err.response?.data?.message || "Something went wrong.",
      });
    },
  });

  // Add Payment Mutation
  const paymentMutation = useMutation({
    mutationFn: ({ id, amount }) => orderApi.addPayment(id, amount),
    onSuccess: (res) => {
      toast.success("Payment Recorded", {
        description: `Collected ${formatCurrency(paymentAmount)}. Remaining: ${formatCurrency(
          res?.order?.pendingBalance ?? 0
        )}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setSelectedOrderForPayment(null);
      setPaymentAmount("");
    },
    onError: (err) => {
      toast.error("Payment Failed", {
        description: err.response?.data?.message || "Please check the amount.",
      });
    },
  });

  // Soft-Delete Order Mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => orderApi.deleteOrder(id),
    onSuccess: (res) => {
      toast.success(res?.message || "Order deleted successfully.");
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setOrderToDelete(null);
    },
    onError: (err) => {
      toast.error("Failed to delete order", {
        description: err.response?.data?.message || "Something went wrong.",
      });
    },
  });

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedStatusTab("All");
    setPage(1);
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "Delivered":
        return "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100/60";
      case "In Progress":
        return "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100/60";
      case "Ready":
        return "bg-teal-50 text-teal-600 border-teal-200 hover:bg-teal-100/60";
      case "Cancelled":
        return "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200/60";
      default:
        return "bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100/60";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rose-100/70 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-heading">
            Orders
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isAdmin
              ? "Manage and track all your design & interior orders across all branches."
              : "View, create, and track orders for your branch. Stay updated on the latest progress."}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs text-slate-600">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span>01 Sep 2025 - 30 Sep 2025</span>
          </div>

          {/* New Order: Admin, Branch Manager, and Employee can all create orders */}
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setIsCreateModalOpen(true)}
          >
            New Order
          </Button>
        </div>
      </div>

      {/* Top 4 Summary Cards (if not admin) */}
      {!isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
          <div className="bg-white rounded-2xl p-5 border border-rose-100/70 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-500">Total Orders</span>
              <div className="text-2xl font-bold text-slate-900 font-heading mt-0.5">
                {totalRecords}
              </div>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <ShoppingBag className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-rose-100/70 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-500">Pending Orders</span>
              <div className="text-2xl font-bold text-slate-900 font-heading mt-0.5">
                {pendingCount}
              </div>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-rose-100/70 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-500">In Progress</span>
              <div className="text-2xl font-bold text-slate-900 font-heading mt-0.5">
                {inProgressCount}
              </div>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <Activity className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-rose-100/70 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-500">Completed</span>
              <div className="text-2xl font-bold text-slate-900 font-heading mt-0.5">
                {deliveredCount}
              </div>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs Row (Admin Pill Style) */}
      {isAdmin ? (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {[
            { label: "All Orders", count: totalRecords, key: "All" },
            { label: "Pending", count: pendingCount, key: "Pending" },
            { label: "In Progress", count: inProgressCount, key: "In Progress" },
            { label: "Ready", count: readyCount, key: "Ready" },
            { label: "Delivered", count: deliveredCount, key: "Delivered" },
            { label: "Cancelled", count: cancelledCount, key: "Cancelled" },
          ].map((tab) => {
            const isActive = selectedStatusTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setSelectedStatusTab(tab.key);
                  setPage(1);
                }}
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? "bg-rose-50 text-rose-600 border border-rose-200 shadow-2xs"
                    : "text-slate-600 hover:bg-slate-50 border border-transparent"
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            );
          })}
        </div>
      ) : (
        /* Employee Search & Filter Controls */
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-rose-100/70 shadow-2xs">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by order ID, customer name..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:border-rose-400"
            />
          </div>

          <select
            value={selectedStatusTab}
            onChange={(e) => {
              setSelectedStatusTab(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by Status"
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:border-rose-400"
          >
            <option value="All">All Statuses</option>
            {ORDER_STATUSES.filter((s) => s !== "All").map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <Button
            variant="outline"
            size="sm"
            leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
            onClick={handleResetFilters}
          >
            Reset
          </Button>
        </div>
      )}

      {/* Orders Data Table */}
      <div className="bg-white rounded-2xl border border-rose-100/70 shadow-2xs overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={6} columns={10} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-rose-50/40 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-rose-50">
                <tr>
                  <th className="py-3 px-5">Order ID</th>
                  <th className="py-3 px-5">Customer</th>
                  <th className="py-3 px-5">Project Type</th>
                  <th className="py-3 px-5">Amount</th>
                  <th className="py-3 px-5">Advance</th>
                  <th className="py-3 px-5">Balance</th>
                  <th className="py-3 px-5">Order Date</th>
                  <th className="py-3 px-5">Deadline</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rose-50">
                {orders.length > 0 ? (
                  orders.map((order) => (
                    <tr key={order._id} className="hover:bg-rose-50/30 transition-colors">
                      <td className="py-3.5 px-5 font-bold text-rose-600">
                        #{order.orderNumber}
                      </td>
                      <td className="py-3.5 px-5 font-semibold text-slate-800">
                        {order.customerName}
                      </td>
                      <td className="py-3.5 px-5 text-slate-600">
                        {order.itemType}
                      </td>
                      <td className="py-3.5 px-5 font-bold text-slate-900">
                        {formatCurrency(order.totalPrice)}
                      </td>
                      <td className="py-3.5 px-5 text-emerald-600 font-medium">
                        {formatCurrency(order.advancePaid || 0)}
                      </td>
                      <td className="py-3.5 px-5 text-amber-700 font-medium">
                        {formatCurrency(order.pendingBalance || 0)}
                      </td>
                      <td className="py-3.5 px-5 text-slate-500">
                        {formatDate(order.orderDate || order.createdAt)}
                      </td>
                      <td className="py-3.5 px-5 text-slate-500">
                        {formatDate(order.deliveryDeadline)}
                      </td>
                      <td className="py-3.5 px-5">
                        {canManageOrder(order) ? (
                          <div className="relative inline-flex items-center">
                            <select
                              value={order.deliveryStatus}
                              onChange={(e) => {
                                const newStatus = e.target.value;
                                if (newStatus !== order.deliveryStatus) {
                                  statusMutation.mutate({
                                    id: order._id,
                                    status: newStatus,
                                  });
                                }
                              }}
                              disabled={
                                statusMutation.isPending &&
                                statusMutation.variables?.id === order._id
                              }
                              title="Click to change status"
                              aria-label={`Change delivery status for order #${order.orderNumber}`}
                              className={`text-[11px] font-bold pl-2.5 pr-6 py-1 rounded-full border cursor-pointer appearance-none transition-all focus:outline-none focus:ring-2 focus:ring-rose-400/20 ${getStatusBadgeClass(
                                order.deliveryStatus
                              )} ${
                                statusMutation.isPending &&
                                statusMutation.variables?.id === order._id
                                  ? "opacity-50 cursor-wait"
                                  : ""
                              }`}
                            >
                              {ORDER_STATUSES.filter((s) => s !== "All").map((statusOption) => (
                                <option
                                  key={statusOption}
                                  value={statusOption}
                                  className="bg-white text-slate-800 font-semibold py-1"
                                >
                                  {statusOption}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 pointer-events-none opacity-60 text-current" />
                          </div>
                        ) : (
                          <span
                            className={`inline-block text-[11px] font-bold px-2.5 py-1 rounded-full border ${getStatusBadgeClass(
                              order.deliveryStatus
                            )}`}
                          >
                            {order.deliveryStatus}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          {/* View Details - available to all roles */}
                          <button
                            type="button"
                            onClick={() => setSelectedOrderForDetails(order)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="View Details"
                            aria-label="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          {/* Edit Order - Admin or assigned BM */}
                          {canManageOrder(order) && (
                            <button
                              type="button"
                              onClick={() => setSelectedOrderForEdit(order)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Edit Order"
                              aria-label="Edit Order"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                          )}

                          {/* Delete Order - Admin or assigned BM */}
                          {canManageOrder(order) && (
                            <button
                              type="button"
                              onClick={() => setOrderToDelete(order)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete Order"
                              aria-label="Delete Order"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      No orders found matching your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Pagination Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border-t border-rose-50 bg-rose-50/20 text-xs text-slate-500">
          <div>
            Showing {(page - 1) * limit + 1} to{" "}
            {Math.min(page * limit, totalRecords)} of {totalRecords} orders
          </div>

          <div className="flex items-center gap-1 self-end sm:self-auto">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 rounded-md border border-slate-200 bg-white disabled:opacity-40 hover:bg-rose-50 cursor-pointer"
            >
              &lt;
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map((num) => (
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

      {/* Motivational Banner at Bottom */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-rose-50/90 via-pink-50/60 to-rose-100/40 p-6 border border-rose-100 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="h-16 w-24 rounded-xl overflow-hidden shrink-0 shadow-2xs hidden sm:block">
            <img
              src={designerBannerImg}
              alt="Designer at desk"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
              Every space tells a story.
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              Let's make it beautiful, together.
            </p>
          </div>
        </div>

        <div className="font-script text-3xl text-rose-400 font-bold tracking-wide select-none self-end sm:self-center">
          DesignDec —
        </div>
      </div>

      {/* Create Order Modal */}
      <CreateOrderModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["orders"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
        }}
        defaultBranch={!isAdmin ? (user?.branch || "Santoshpur Branch") : (activeBranch || "Main Office")}
        isAdmin={isAdmin}
      />

      {/* Order Details Modal */}
      {selectedOrderForDetails && (
        <Dialog
          isOpen={Boolean(selectedOrderForDetails)}
          onClose={() => setSelectedOrderForDetails(null)}
          className="max-w-md"
        >
          <DialogHeader>
            <DialogTitle>Order #{selectedOrderForDetails.orderNumber}</DialogTitle>
            <DialogDescription>
              {selectedOrderForDetails.itemType} • {selectedOrderForDetails.customerName}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-rose-50">
              <span className="text-slate-500">Contact:</span>
              <span className="font-bold text-slate-800">{selectedOrderForDetails.contactNo || "—"}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-rose-50">
              <span className="text-slate-500">Branch:</span>
              <span className="font-bold text-slate-800">{selectedOrderForDetails.branch}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-rose-50">
              <span className="text-slate-500">Total Price:</span>
              <span className="font-bold text-slate-900">
                {formatCurrency(selectedOrderForDetails.totalPrice)}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-rose-50">
              <span className="text-slate-500">Advance Paid:</span>
              <span className="font-bold text-emerald-600">
                {formatCurrency(selectedOrderForDetails.advancePaid)}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-rose-50">
              <span className="text-slate-500">Pending Balance:</span>
              <span className="font-bold text-amber-700">
                {formatCurrency(selectedOrderForDetails.pendingBalance)}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-rose-50">
              <span className="text-slate-500">Order / Booking Date:</span>
              <span className="font-bold text-slate-800">
                {formatDate(selectedOrderForDetails.orderDate || selectedOrderForDetails.createdAt)}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-rose-50">
              <span className="text-slate-500">Delivery Deadline:</span>
              <span className="font-bold text-slate-800">
                {formatDate(selectedOrderForDetails.deliveryDeadline)}
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">Delivery Status:</span>
              <span
                className={`font-bold px-2 py-0.5 rounded-full ${getStatusBadgeClass(
                  selectedOrderForDetails.deliveryStatus
                )}`}
              >
                {selectedOrderForDetails.deliveryStatus}
              </span>
            </div>
          </DialogBody>
          <DialogFooter>
            {canManageOrder(selectedOrderForDetails) && selectedOrderForDetails.pendingBalance > 0 && (
              <Button
                variant="outline"
                size="sm"
                leftIcon={<CreditCard className="h-3.5 w-3.5" />}
                onClick={() => {
                  setSelectedOrderForPayment(selectedOrderForDetails);
                  setSelectedOrderForDetails(null);
                }}
              >
                Record Payment
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={() => setSelectedOrderForDetails(null)}
            >
              Close
            </Button>
          </DialogFooter>
        </Dialog>
      )}

      {/* Record Payment Modal */}
      {selectedOrderForPayment && canManageOrder(selectedOrderForPayment) && (
        <Dialog
          isOpen={Boolean(selectedOrderForPayment)}
          onClose={() => setSelectedOrderForPayment(null)}
          className="max-w-sm"
        >
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Pending Balance: {formatCurrency(selectedOrderForPayment.pendingBalance)}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <Input
              label="Payment Amount (₹)"
              type="number"
              placeholder="e.g. 20000"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              helperText={`Maximum payable: ₹${selectedOrderForPayment.pendingBalance}`}
            />
          </DialogBody>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedOrderForPayment(null)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={paymentMutation.isPending}
              onClick={() =>
                paymentMutation.mutate({
                  id: selectedOrderForPayment._id,
                  amount: Number(paymentAmount),
                })
              }
            >
              Confirm Payment
            </Button>
          </DialogFooter>
        </Dialog>
      )}

      {/* Edit Order Modal */}
      {selectedOrderForEdit && canManageOrder(selectedOrderForEdit) && (
        <EditOrderModal
          isOpen={Boolean(selectedOrderForEdit)}
          onClose={() => setSelectedOrderForEdit(null)}
          order={selectedOrderForEdit}
          isAdmin={isAdmin}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["orders"] });
            setSelectedOrderForEdit(null);
          }}
        />
      )}

      {/* Delete Order Confirmation Dialog */}
      {orderToDelete && canManageOrder(orderToDelete) && (
        <ConfirmDialog
          isOpen={Boolean(orderToDelete)}
          onClose={() => setOrderToDelete(null)}
          onConfirm={() => {
            if (orderToDelete) {
              deleteMutation.mutate(orderToDelete._id);
            }
          }}
          title={`Delete Order #${orderToDelete?.orderNumber}`}
          description={`Are you sure you want to delete order #${orderToDelete?.orderNumber} for ${orderToDelete?.customerName}? This will remove it from active orders while securely preserving business audit records.`}
          confirmText="Delete Order"
          isDestructive={true}
          isLoading={deleteMutation.isPending}
        />
      )}
    </div>
  );
}

export default OrdersPage;

