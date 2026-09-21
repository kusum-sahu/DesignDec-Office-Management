import { useState, useEffect } from "react";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter, DialogCloseButton } from "../ui/Dialog";
import Button from "../ui/Button";
import Input from "../ui/Input";
import authApi from "../../api/auth.api";
import useAuthStore from "../../stores/authStore";
import { toast } from "../../utils/toast";

export function EditPersonalInfoModal({ isOpen, onClose }) {
  const { user, setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    dateOfBirth: "",
    gender: "Male",
    address: "",
  });

  useEffect(() => {
    if (user && isOpen) {
      let formattedDob = "";
      if (user.dateOfBirth) {
        try {
          formattedDob = new Date(user.dateOfBirth).toISOString().split("T")[0];
        } catch {
          formattedDob = "";
        }
      }
      setFormData({
        name: user.name || "",
        phone: user.phone || "",
        dateOfBirth: formattedDob,
        gender: user.gender || "Male",
        address: user.address || "",
      });
      setError("");
    }
  }, [user, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError("Full name is required.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const res = await authApi.updateProfile({
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth) : null,
        gender: formData.gender,
        address: formData.address.trim(),
      });

      if (res?.user) {
        setUser(res.user);
      }
      toast.success("Personal Information Updated", {
        description: "Your profile details have been saved successfully.",
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} className="max-w-md">
      <DialogHeader>
        <div className="flex items-center justify-between w-full">
          <div>
            <DialogTitle>Edit Personal Information</DialogTitle>
            <DialogDescription>
              Update your personal details below.
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
            label="Full Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Rahul Sharma"
            required
          />

          <Input
            label="Phone Number"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="e.g. +91 98765 43210"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Date of Birth
              </label>
              <input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className="block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/90 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200 dark:focus:ring-rose-950/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Gender
              </label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/90 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200 dark:focus:ring-rose-950/50"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Address
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              rows={2}
              placeholder="e.g. Plot No. 123, Saheed Nagar, Bhubaneswar"
              className="block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/90 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200 dark:focus:ring-rose-950/50 resize-none"
            />
          </div>
        </DialogBody>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={loading}>
            Save Changes
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

export default EditPersonalInfoModal;
