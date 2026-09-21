import { useState } from "react";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter, DialogCloseButton } from "../ui/Dialog";
import Button from "../ui/Button";
import Input from "../ui/Input";
import authApi from "../../api/auth.api";
import useAuthStore from "../../stores/authStore";
import { toast } from "../../utils/toast";

export function ChangePasswordModal({ isOpen, onClose }) {
  const { user, setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("All fields are required.");
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const res = await authApi.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      toast.success("Password Updated Successfully!", {
        description: res.message || "Your new password is now active.",
      });

      if (user) {
        setUser({ ...user, isPasswordChanged: true });
      }
      useAuthStore.setState({ forcePasswordChange: false });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to change password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} className="max-w-md">
      <DialogHeader>
        <div className="flex items-center justify-between w-full">
          <div>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Update your account security with a new password.
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
            label="Current Password *"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Enter current password"
            required
          />

          <Input
            label="New Password *"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="At least 8 characters"
            required
          />

          <Input
            label="Confirm New Password *"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter new password"
            required
          />
        </DialogBody>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setError("");
              onClose();
            }}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={loading}>
            Update Password
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

export default ChangePasswordModal;
