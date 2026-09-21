import { useState, useEffect } from "react";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter, DialogCloseButton } from "../ui/Dialog";
import Button from "../ui/Button";
import Input from "../ui/Input";
import authApi from "../../api/auth.api";
import useAuthStore from "../../stores/authStore";
import { toast } from "../../utils/toast";

export function UploadDocumentModal({ isOpen, onClose, initialDocType = "addressProof" }) {
  const { user, setUser } = useAuthStore();
  const [docType, setDocType] = useState(initialDocType);
  const [docValue, setDocValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      const type = initialDocType || "addressProof";
      setDocType(type);
      setDocValue(user?.documents?.[type] || "");
      setError("");
    }
  }, [isOpen, initialDocType, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!docValue.trim()) {
      setError("Please provide document number or reference details.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const currentDocs = user?.documents || {};
      const updatedDocs = {
        ...currentDocs,
        [docType]: docValue.trim(),
      };

      const res = await authApi.updateProfile({
        documents: updatedDocs,
      });

      if (res?.user) {
        setUser(res.user);
      }
      toast.success("Document Updated", {
        description: "Your document verification details have been recorded.",
      });
      setDocValue("");
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to update document.");
    } finally {
      setLoading(false);
    }
  };

  const getLabel = () => {
    if (docType === "aadhaar") return "Aadhaar Card Number / Ref";
    if (docType === "pan") return "PAN Card Number";
    return "Address Proof Document / Utility Bill ID";
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} className="max-w-md">
      <DialogHeader>
        <div className="flex items-center justify-between w-full">
          <div>
            <DialogTitle>Submit Document Details</DialogTitle>
            <DialogDescription>
              Upload or enter official identification document details.
            </DialogDescription>
          </div>
          <DialogCloseButton onClose={onClose} />
        </div>
      </DialogHeader>

      <form onSubmit={handleSubmit}>
        <DialogBody className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs border border-red-200 dark:border-red-900">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Select Document Type
            </label>
            <select
              value={docType}
              onChange={(e) => {
                setDocType(e.target.value);
                setDocValue("");
                setError("");
              }}
              className="block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/90 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200 dark:focus:ring-rose-950/50"
            >
              <option value="aadhaar">Aadhaar Card</option>
              <option value="pan">PAN Card</option>
              <option value="addressProof">Address Proof (Electricity/Rent/Voter ID)</option>
            </select>
          </div>

          <Input
            label={getLabel()}
            value={docValue}
            onChange={(e) => setDocValue(e.target.value)}
            placeholder="e.g. 5432-8765-1234 or DOC-REF-8849"
            required
          />
        </DialogBody>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={loading}>
            Save Document
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

export default UploadDocumentModal;
