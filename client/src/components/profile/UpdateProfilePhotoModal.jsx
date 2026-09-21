import { useState, useRef } from "react";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter, DialogCloseButton } from "../ui/Dialog";
import Button from "../ui/Button";
import { Camera, Trash2, Upload } from "lucide-react";
import authApi from "../../api/auth.api";
import useAuthStore from "../../stores/authStore";
import { toast } from "../../utils/toast";

export function UpdateProfilePhotoModal({ isOpen, onClose }) {
  const { user, setUser } = useAuthStore();
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const currentPhoto = preview !== null ? preview : user?.profileImage;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (PNG, JPG, WEBP).");
      return;
    }

    // Limit to 2.5MB
    if (file.size > 2.5 * 1024 * 1024) {
      setError("Image size exceeds 2.5MB limit. Please choose a smaller photo.");
      return;
    }

    setError("");
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPreview("");
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async () => {
    if (preview === null) {
      onClose();
      return;
    }

    try {
      setLoading(true);
      setError("");
      const res = await authApi.updateProfile({
        profileImage: preview,
      });

      if (res?.user) {
        setUser(res.user);
      }
      toast.success(preview ? "Profile Photo Updated!" : "Profile Photo Removed", {
        description: "Your new avatar has been applied across the application.",
      });
      setPreview(null);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to update profile photo.");
    } finally {
      setLoading(false);
    }
  };

  const initials = user?.name ? user.name.slice(0, 2).toUpperCase() : "DD";

  return (
    <Dialog isOpen={isOpen} onClose={onClose} className="max-w-md text-center">
      <DialogHeader>
        <div className="flex items-center justify-between w-full text-left">
          <div>
            <DialogTitle>Update Profile Photo</DialogTitle>
            <DialogDescription>
              Upload a profile picture to personalize your workspace.
            </DialogDescription>
          </div>
          <DialogCloseButton onClose={onClose} />
        </div>
      </DialogHeader>

      <DialogBody className="space-y-5">
        {error && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs border border-red-200 dark:border-red-900 text-left">
            {error}
          </div>
        )}

        {/* Circular Avatar Preview */}
        <div className="flex flex-col items-center justify-center pt-2">
          <div className="relative group">
            {currentPhoto ? (
              <img
                src={currentPhoto}
                alt="Profile Preview"
                className="h-28 w-28 rounded-full object-cover ring-4 ring-rose-100 dark:ring-slate-800 shadow-lg"
              />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-full bg-rose-600 font-extrabold text-3xl text-white shadow-lg ring-4 ring-rose-100 dark:ring-slate-800">
                {initials}
              </div>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-1 right-1 p-2 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-md hover:text-rose-600 transition-colors cursor-pointer"
              title="Choose Photo"
            >
              <Camera className="h-4 w-4" />
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Recommended: Square format, under 2MB</p>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/jpg"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            leftIcon={<Upload className="h-3.5 w-3.5" />}
          >
            Select from Device
          </Button>

          {currentPhoto && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemovePhoto}
              className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
              leftIcon={<Trash2 className="h-3.5 w-3.5" />}
            >
              Remove Photo
            </Button>
          )}
        </div>
      </DialogBody>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setPreview(null);
            onClose();
          }}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="primary"
          onClick={handleSave}
          isLoading={loading}
          disabled={preview === null}
        >
          Save Photo
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

export default UpdateProfilePhotoModal;
