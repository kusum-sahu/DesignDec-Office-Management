import { useState } from "react";
import { Edit3, X } from "lucide-react";
import Dialog, {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "../ui/Dialog";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Select from "../ui/Select";
import ItemTypeSelect from "./ItemTypeSelect";
import orderApi from "../../api/order.api";
import { ITEM_TYPES, DELIVERY_STATUS } from "../../constants/status";
import { toast } from "../../utils/toast";
import useAuthStore from "../../stores/authStore";

const BRANCH_OPTIONS = [
  { value: "Main Office", label: "Main Office" },
  { value: "Santoshpur Branch", label: "Santoshpur Branch" },
];

const ORDER_STATUS_OPTIONS = Object.values(DELIVERY_STATUS).map((status) => ({
  value: status,
  label: status,
}));

const getInitialFormData = (order) => ({
  customerName: order?.customerName || "",
  contactNo: order?.contactNo || "",
  itemType: order?.itemType || ITEM_TYPES[0],
  description: order?.description || "",
  quantity: order?.quantity || 1,
  totalPrice: order?.totalPrice !== undefined ? String(order.totalPrice) : "",
  advancePaid: order?.advancePaid !== undefined ? String(order.advancePaid) : "0",
  orderDate: order?.orderDate
    ? new Date(order.orderDate).toISOString().split("T")[0]
    : order?.createdAt
    ? new Date(order.createdAt).toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0],
  deliveryDeadline: order?.deliveryDeadline
    ? new Date(order.deliveryDeadline).toISOString().split("T")[0]
    : "",
  deliveryStatus: order?.deliveryStatus || "Pending",
  branch: order?.branch || "Main Office",
});

export function EditOrderModal({ isOpen, onClose, order, onSuccess, isAdmin: propIsAdmin }) {
  const { user } = useAuthStore();
  const isAdmin = propIsAdmin !== undefined ? propIsAdmin : user?.role === "Admin";

  const [formData, setFormData] = useState(() => getInitialFormData(order));
  const [prevOrderId, setPrevOrderId] = useState(order?._id);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // Sync state when editing a different order
  if (order && order._id !== prevOrderId) {
    setPrevOrderId(order._id);
    setFormData(getInitialFormData(order));
    setErrors({});
  }

  const validate = () => {
    const errs = {};
    if (!formData.customerName.trim()) errs.customerName = "Customer name is required";
    if (!formData.itemType || !formData.itemType.trim()) errs.itemType = "Item type is required";
    if (!formData.totalPrice || Number(formData.totalPrice) <= 0) {
      errs.totalPrice = "Total price must be greater than 0";
    }
    if (Number(formData.advancePaid) < 0) {
      errs.advancePaid = "Advance cannot be negative";
    }
    if (Number(formData.advancePaid) > Number(formData.totalPrice)) {
      errs.advancePaid = "Advance payment cannot exceed total price";
    }
    if (!formData.deliveryDeadline) {
      errs.deliveryDeadline = "Delivery deadline date is required";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setIsLoading(true);
      const payload = {
        ...formData,
        customerName: formData.customerName.trim(),
        itemType: formData.itemType.trim(),
        totalPrice: Number(formData.totalPrice),
        advancePaid: Number(formData.advancePaid) || 0,
        quantity: Number(formData.quantity) || 1,
      };

      // Only Admin can alter branch on edit
      if (!isAdmin) {
        delete payload.branch;
      }

      const res = await orderApi.updateOrder(order._id, payload);
      toast.success("Order Updated Successfully!", {
        description: `Order #${order.orderNumber} has been updated.`,
      });

      if (onSuccess) onSuccess(res?.order);
      onClose();
    } catch (err) {
      console.error("Update order error:", err);
      toast.error("Failed to Update Order", {
        description: err.response?.data?.message || "Please check the form inputs.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const computedBalance = Math.max(
    0,
    (Number(formData.totalPrice) || 0) - (Number(formData.advancePaid) || 0)
  );

  return (
    <Dialog isOpen={isOpen} onClose={onClose} className="max-w-xl">
      <DialogHeader>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <Edit3 className="h-4.5 w-4.5" />
            </div>
            <DialogTitle>Edit Order #{order?.orderNumber}</DialogTitle>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
        <DialogDescription>
          Update order specifications, schedule, or delivery progress.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit}>
        <DialogBody className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Customer Name"
              placeholder="e.g. Amit Sharma"
              value={formData.customerName}
              onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
              error={errors.customerName}
              required
            />

            <Input
              label="Contact Phone (Optional)"
              placeholder="e.g. +91 98765 43210 (Optional)"
              value={formData.contactNo}
              onChange={(e) => setFormData({ ...formData, contactNo: e.target.value })}
              error={errors.contactNo}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ItemTypeSelect
              label="Project / Item Type"
              value={formData.itemType}
              onChange={(val) => {
                setFormData((prev) => ({ ...prev, itemType: val }));
                if (errors.itemType) {
                  setErrors((prev) => ({ ...prev, itemType: undefined }));
                }
              }}
              error={errors.itemType}
              required
            />

            {isAdmin ? (
              <Select
                label="Branch Allocation"
                value={formData.branch}
                onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                options={BRANCH_OPTIONS}
                required
                helperText="Reassign branch"
              />
            ) : (
              <Input
                label="Branch"
                value={formData.branch}
                disabled
                helperText="Assigned branch"
              />
            )}

            <Select
              label="Delivery Status"
              value={formData.deliveryStatus}
              onChange={(e) => setFormData({ ...formData, deliveryStatus: e.target.value })}
              options={ORDER_STATUS_OPTIONS}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Total Price (₹)"
              type="number"
              placeholder="e.g. 85000"
              value={formData.totalPrice}
              onChange={(e) => setFormData({ ...formData, totalPrice: e.target.value })}
              error={errors.totalPrice}
              required
            />

            <div>
              <Input
                label="Advance Paid (₹)"
                type="number"
                placeholder="e.g. 30000"
                value={formData.advancePaid}
                onChange={(e) => setFormData({ ...formData, advancePaid: e.target.value })}
                error={errors.advancePaid}
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Pending Balance: <strong className="text-amber-700">₹{computedBalance.toLocaleString("en-IN")}</strong>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Order / Booking Date"
              type="date"
              value={formData.orderDate}
              onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
              error={errors.orderDate}
              required
              helperText="Set original booking date for historical orders."
            />

            <Input
              label="Delivery Deadline"
              type="date"
              value={formData.deliveryDeadline}
              onChange={(e) => setFormData({ ...formData, deliveryDeadline: e.target.value })}
              error={errors.deliveryDeadline}
              required
            />
          </div>

          <Input
            label="Project Description / Notes"
            placeholder="Special instructions, specifications, design requirements..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" type="button" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={isLoading}>
            Save Changes
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

export default EditOrderModal;

