import { useState, useEffect } from "react";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter, DialogCloseButton } from "../ui/Dialog";
import Button from "../ui/Button";
import Input from "../ui/Input";
import authApi from "../../api/auth.api";
import useAuthStore from "../../stores/authStore";
import { toast } from "../../utils/toast";

export function EditEmergencyContactModal({ isOpen, onClose }) {
  const { user, setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    relationship: "Father",
    address: "",
  });

  useEffect(() => {
    if (user && isOpen) {
      const em = user.emergencyContact || {};
      setFormData({
        name: em.name || "",
        phone: em.phone || "",
        relationship: em.relationship || "Father",
        address: em.address || "",
      });
      setError("");
    }
  }, [user, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError("Emergency contact person name is required.");
      return;
    }
    if (!formData.phone.trim()) {
      setError("Emergency contact phone number is required.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const res = await authApi.updateProfile({
        emergencyContact: {
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          relationship: formData.relationship.trim(),
          address: formData.address.trim(),
        },
      });

      if (res?.user) {
        setUser(res.user);
      }
      toast.success("Emergency Contact Saved", {
        description: "Emergency contact details have been updated successfully.",
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to update emergency contact.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} className="max-w-md">
      <DialogHeader>
        <div className="flex items-center justify-between w-full">
          <div>
            <DialogTitle>Edit Emergency Contact</DialogTitle>
            <DialogDescription>
              Provide emergency contact person and details.
            </DialogDescription>
          </div>
          <DialogCloseButton onClose={onClose} />
        </div>
      </DialogHeader>

      <form onSubmit={handleSubmit}>
        <DialogBody className="space-y-3.5">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs border border-red-200 dark:border-red-900">
              {error}
            </div>
          )}

          <Input
            label="Contact Person Name *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Suresh Sharma"
            required
          />

          <Input
            label="Phone Number *"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="e.g. +91 98765 12345"
            required
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Relationship
            </label>
            <select
              value={formData.relationship}
              onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
              className="block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/90 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200 dark:focus:ring-rose-950/50"
            >
              <option value="Father">Father</option>
              <option value="Mother">Mother</option>
              <option value="Spouse">Spouse</option>
              <option value="Brother">Brother</option>
              <option value="Sister">Sister</option>
              <option value="Guardian">Guardian</option>
              <option value="Friend">Friend</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              City / Address
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              rows={2}
              placeholder="e.g. Bhubaneswar, Odisha"
              className="block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/90 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200 dark:focus:ring-rose-950/50 resize-none"
            />
          </div>
        </DialogBody>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={loading}>
            Save Contact
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

export default EditEmergencyContactModal;
