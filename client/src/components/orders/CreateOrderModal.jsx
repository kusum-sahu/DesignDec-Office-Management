import { useState } from "react";
import { Plus, X } from "lucide-react";
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
import { ITEM_TYPES } from "../../constants/status";
import { toast } from "../../utils/toast";
import useAuthStore from "../../stores/authStore";


const BRANCH_OPTIONS = [
  { value: "Main Office", label: "Main Office" },
  { value: "Santoshpur Branch", label: "Santoshpur Branch" },
];

export function CreateOrderModal({
  isOpen,
  onClose,
  onSuccess,
  defaultBranch = "Main Office",
  isAdmin: propIsAdmin,
}) {
  const { user } = useAuthStore();
  const isAdmin = propIsAdmin !== undefined ? propIsAdmin : user?.role === "Admin";
  const assignedBranch = user?.branch || defaultBranch || "Main Office";

  const [formData, setFormData] = useState({
    customerName: "",
    contactNo: "",
    itemType: ITEM_TYPES[0],
    description: "",
    quantity: 1,
    totalPrice: "",
    advancePaid: "0",
    orderDate: new Date().toISOString().split("T")[0],
    deliveryDeadline: "",
    branch: isAdmin ? (defaultBranch || "Main Office") : assignedBranch,
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const validate = () => {
    const errs = {};
    if (!formData.customerName.trim()) errs.customerName = "Customer name is required";
    if (!formData.itemType || !formData.itemType.trim()) errs.itemType = "Item type is required";
    if (!formData.totalPrice || Number(formData.totalPrice) <= 0) {
      errs.totalPrice = "Total price must be greater than 0";
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
        branch: isAdmin ? formData.branch : assignedBranch,
        totalPrice: Number(formData.totalPrice),
        advancePaid: Number(formData.advancePaid) || 0,
        quantity: Number(formData.quantity) || 1,
      };

      const res = await orderApi.createOrder(payload);
      toast.success("Order Created Successfully!", {
        description: `Order #${res?.order?.orderNumber || "NEW"} has been booked for ${formData.customerName}.`,
      });

      if (onSuccess) onSuccess(res?.order);
      onClose();
      // Reset form
      setFormData({
        customerName: "",
        contactNo: "",
        itemType: ITEM_TYPES[0],
        description: "",
        quantity: 1,
        totalPrice: "",
        advancePaid: "0",
        orderDate: new Date().toISOString().split("T")[0],
        deliveryDeadline: "",
        branch: isAdmin ? (defaultBranch || "Main Office") : assignedBranch,
      });
    } catch (err) {
      console.error("Create order error:", err);
      toast.error("Failed to Create Order", {
        description: err.response?.data?.message || "Please check the form inputs.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} className="max-w-xl">
      <DialogHeader>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <Plus className="h-4.5 w-4.5" />
            </div>
            <DialogTitle>Create New Order</DialogTitle>
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
          Book a new printing, signage, or design order. All orders are tracked in the production pipeline.
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                label="Target Branch"
                value={formData.branch}
                onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                options={BRANCH_OPTIONS}
                required
                helperText="Select target branch allocation for this order."
              />
            ) : (
              <Input
                label="Branch"
                value={assignedBranch}
                disabled
                helperText="Orders are booked under your assigned branch."
              />
            )}
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

            <Input
              label="Advance Paid (₹)"
              type="number"
              placeholder="e.g. 30000"
              value={formData.advancePaid}
              onChange={(e) => setFormData({ ...formData, advancePaid: e.target.value })}
              error={errors.advancePaid}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Order / Booking Date"
              type="date"
              value={formData.orderDate}
              onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
              error={errors.orderDate}
              required
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
            placeholder="Special instructions, design requirements, materials..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" type="button" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={isLoading}>
            Create Order
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

export default CreateOrderModal;

