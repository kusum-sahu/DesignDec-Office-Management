import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Shield,
  Building2,
  Moon,
  Sun,
  Laptop,
  Save,
  MapPin,
  Navigation,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";
import useAuthStore from "../../stores/authStore";
import attendanceApi from "../../api/attendance.api";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import { toast } from "../../utils/toast";

export function SettingsPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "Admin";
  const queryClient = useQueryClient();

  const [emailAlerts, setEmailAlerts] = useState(true);
  const [orderAlerts, setOrderAlerts] = useState(true);
  const [attendanceAlerts, setAttendanceAlerts] = useState(true);
  const [autoCheckOutReminder, setAutoCheckOutReminder] = useState(true);
  const [theme, setTheme] = useState("Light");

  // Branch Geofence Management State
  const [editingBranch, setEditingBranch] = useState(null);
  const [branchForm, setBranchForm] = useState({
    latitude: "",
    longitude: "",
    radius: 200,
    address: "",
  });
  const [isCapturingGps, setIsCapturingGps] = useState(false);

  // Fetch Attendance Settings & Configured Geofence Branches
  const { data: settingsResponse, isLoading: isSettingsLoading } = useQuery({
    queryKey: ["attendance-settings"],
    queryFn: () => attendanceApi.getSettings(),
  });

  const branchLocations = settingsResponse?.data?.branchLocations || [
    {
      branchName: "Main Office",
      latitude: 19.314962,
      longitude: 84.794091,
      radius: 200,
      address: "Main Office, Berhampur, Ganjam, Odisha",
    },
    {
      branchName: "Santoshpur Branch",
      latitude: 20.25880,
      longitude: 85.78840,
      radius: 200,
      address: "Santoshpur Branch, Odisha",
    },
  ];

  // Mutation to update branch geofence
  const updateBranchMutation = useMutation({
    mutationFn: (payload) => attendanceApi.updateBranchLocation(payload),
    onSuccess: (res) => {
      toast.success("Geofence Updated Successfully!", {
        description: res?.data?.message || "Branch office coordinates and radius updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["attendance-settings"] });
      setEditingBranch(null);
    },
    onError: (err) => {
      toast.error("Failed to update branch geofence", {
        description: err.response?.data?.message || err.message,
      });
    },
  });

  const handleStartEdit = (branch) => {
    setEditingBranch(branch.branchName);
    setBranchForm({
      latitude: String(branch.latitude),
      longitude: String(branch.longitude),
      radius: branch.radius || 200,
      address: branch.address || "",
    });
  };

  const handleCaptureCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported by this browser.");
      return;
    }

    setIsCapturingGps(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsCapturingGps(false);
        const lat = position.coords.latitude.toFixed(6);
        const lng = position.coords.longitude.toFixed(6);
        setBranchForm((prev) => ({
          ...prev,
          latitude: lat,
          longitude: lng,
        }));
        toast.success("Current GPS Captured!", {
          description: `Captured ${lat}, ${lng} (Accuracy: ±${Math.round(position.coords.accuracy)}m)`,
        });
      },
      (error) => {
        setIsCapturingGps(false);
        toast.error("GPS capture failed", {
          description: error.message || "Please enable location permissions.",
        });
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const handleSaveBranch = (e) => {
    e.preventDefault();
    const lat = Number(branchForm.latitude);
    const lng = Number(branchForm.longitude);
    const radius = Number(branchForm.radius);

    if (Number.isNaN(lat) || lat < -90 || lat > 90) {
      toast.error("Invalid latitude (-90 to +90)");
      return;
    }
    if (Number.isNaN(lng) || lng < -180 || lng > 180) {
      toast.error("Invalid longitude (-180 to +180)");
      return;
    }
    if (Number.isNaN(radius) || radius < 10 || radius > 5000) {
      toast.error("Radius must be between 10m and 5000m");
      return;
    }

    updateBranchMutation.mutate({
      branchName: editingBranch,
      latitude: lat,
      longitude: lng,
      radius,
      address: branchForm.address,
    });
  };

  const handleSaveGeneral = () => {
    toast.success("Settings Saved Successfully!", {
      description: "Your workspace preferences have been updated.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rose-100/70 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-heading">
            Settings & Preferences
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isAdmin
              ? "Configure office branch geofences (200m radius), automated alert thresholds, and system preferences."
              : "Customize your notification preferences and view branch geofence boundaries."}
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          leftIcon={<Save className="h-4 w-4" />}
          onClick={handleSaveGeneral}
        >
          Save Preferences
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Main Settings Panel (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          {/* Office Branch Geofence Configuration */}
          <div className="bg-white rounded-2xl p-6 border border-rose-100/70 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-rose-50">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-rose-600" />
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Office Branch Geofences</h2>
                  <p className="text-[11px] text-slate-500">
                    Configured with 200m radius enforcement for biometric attendance check-in/out
                  </p>
                </div>
              </div>
              {isAdmin && (
                <Badge variant="brand" size="sm">
                  Admin Managed
                </Badge>
              )}
            </div>

            {isSettingsLoading ? (
              <div className="py-6 flex items-center justify-center gap-2 text-xs text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin text-rose-500" />
                <span>Loading branch coordinates...</span>
              </div>
            ) : (
              <div className="space-y-3.5">
                {branchLocations.map((branch) => {
                  const isEditing = editingBranch === branch.branchName;
                  const isMain = branch.branchName === "Main Office";

                  return (
                    <div
                      key={branch.branchName}
                      className={`p-4 rounded-xl border transition-all ${
                        isEditing
                          ? "border-rose-400 bg-rose-50/20 shadow-xs"
                          : "border-slate-200/80 bg-slate-50/50 hover:bg-white"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs">
                              {branch.branchName}
                            </span>
                            <Badge variant={isMain ? "brand" : "secondary"} size="sm">
                              {isMain ? "Headquarters" : "Branch Studio"}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            {branch.address ||
                              (isMain
                                ? "Berhampur, Ganjam, Odisha"
                                : "Santoshpur Branch, Odisha")}
                          </p>
                          <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] font-mono text-slate-600">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-rose-500 shrink-0" />
                              Lat: <strong className="text-slate-800">{branch.latitude}</strong>
                            </span>
                            <span className="flex items-center gap-1">
                              Lng: <strong className="text-slate-800">{branch.longitude}</strong>
                            </span>
                            <span className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200">
                              Radius: <strong className="text-rose-600">{branch.radius || 200}m</strong>
                            </span>
                          </div>
                        </div>

                        {isAdmin && !isEditing && (
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<Edit2 className="h-3.5 w-3.5" />}
                            onClick={() => handleStartEdit(branch)}
                          >
                            Calibrate
                          </Button>
                        )}
                      </div>

                      {/* Edit / Calibration Sub-Panel */}
                      {isEditing && (
                        <form onSubmit={handleSaveBranch} className="mt-4 pt-3.5 border-t border-rose-100 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-rose-900">
                              Calibrate Fixed Office Coordinates
                            </span>
                            <button
                              type="button"
                              onClick={() => setEditingBranch(null)}
                              className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                Latitude
                              </label>
                              <input
                                type="text"
                                value={branchForm.latitude}
                                onChange={(e) =>
                                  setBranchForm((prev) => ({ ...prev, latitude: e.target.value }))
                                }
                                placeholder="e.g. 19.314962"
                                required
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs focus:outline-none focus:border-rose-400"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                Longitude
                              </label>
                              <input
                                type="text"
                                value={branchForm.longitude}
                                onChange={(e) =>
                                  setBranchForm((prev) => ({ ...prev, longitude: e.target.value }))
                                }
                                placeholder="e.g. 84.794091"
                                required
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs focus:outline-none focus:border-rose-400"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                Allowed Radius (meters)
                              </label>
                              <input
                                type="number"
                                value={branchForm.radius}
                                onChange={(e) =>
                                  setBranchForm((prev) => ({ ...prev, radius: e.target.value }))
                                }
                                min="50"
                                max="2000"
                                required
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs focus:outline-none focus:border-rose-400"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Address / Location Description
                            </label>
                            <input
                              type="text"
                              value={branchForm.address}
                              onChange={(e) =>
                                setBranchForm((prev) => ({ ...prev, address: e.target.value }))
                              }
                              placeholder="e.g. Berhampur, Ganjam, Odisha"
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs focus:outline-none focus:border-rose-400"
                            />
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={isCapturingGps}
                              leftIcon={
                                isCapturingGps ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Navigation className="h-3.5 w-3.5 text-rose-600" />
                                )
                              }
                              onClick={handleCaptureCurrentLocation}
                            >
                              {isCapturingGps ? "Capturing GPS..." : "Capture Live GPS on Site"}
                            </Button>

                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingBranch(null)}
                              >
                                Cancel
                              </Button>
                              <Button
                                type="submit"
                                variant="primary"
                                size="sm"
                                disabled={updateBranchMutation.isPending}
                                leftIcon={
                                  updateBranchMutation.isPending ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Save className="h-3.5 w-3.5" />
                                  )
                                }
                              >
                                {updateBranchMutation.isPending ? "Saving..." : "Save Coordinates"}
                              </Button>
                            </div>
                          </div>
                        </form>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Notifications Setting */}
          <div className="bg-white rounded-2xl p-6 border border-rose-100/70 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-rose-50">
              <Bell className="h-4 w-4 text-rose-600" />
              <h2 className="text-sm font-bold text-slate-900">Notification Channels</h2>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between py-1">
                <div>
                  <span className="font-bold text-slate-800 block">Email Alerts</span>
                  <span className="text-slate-500 text-[11px]">
                    Receive instant email notifications for key events
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={emailAlerts}
                  onChange={(e) => setEmailAlerts(e.target.checked)}
                  className="accent-rose-600 h-4 w-4 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between py-1 border-t border-rose-50">
                <div>
                  <span className="font-bold text-slate-800 block">Order Status Updates</span>
                  <span className="text-slate-500 text-[11px]">
                    Get notified when an order transitions from In Progress to Ready/Delivered
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={orderAlerts}
                  onChange={(e) => setOrderAlerts(e.target.checked)}
                  className="accent-rose-600 h-4 w-4 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between py-1 border-t border-rose-50">
                <div>
                  <span className="font-bold text-slate-800 block">Attendance Reminders</span>
                  <span className="text-slate-500 text-[11px]">
                    Daily punch-in and checkout alerts
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={attendanceAlerts}
                  onChange={(e) => setAttendanceAlerts(e.target.checked)}
                  className="accent-rose-600 h-4 w-4 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between py-1 border-t border-rose-50">
                <div>
                  <span className="font-bold text-slate-800 block">Auto Check-Out Reminders</span>
                  <span className="text-slate-500 text-[11px]">
                    Gentle reminder after 8 working hours to punch out
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={autoCheckOutReminder}
                  onChange={(e) => setAutoCheckOutReminder(e.target.checked)}
                  className="accent-rose-600 h-4 w-4 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Theme & Display Mode */}
          <div className="bg-white rounded-2xl p-6 border border-rose-100/70 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 pb-3 border-b border-rose-50">
              Appearance & Theme
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div
                onClick={() => setTheme("Light")}
                className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                  theme === "Light"
                    ? "border-rose-500 bg-rose-50/50 shadow-2xs"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <Sun className="h-5 w-5 text-rose-600" />
                <span className="font-bold text-slate-800">Light (Default)</span>
              </div>

              <div
                onClick={() => setTheme("System")}
                className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                  theme === "System"
                    ? "border-rose-500 bg-rose-50/50 shadow-2xs"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <Laptop className="h-5 w-5 text-slate-600" />
                <span className="font-bold text-slate-800">System Sync</span>
              </div>

              <div
                onClick={() => setTheme("Dark")}
                className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 opacity-60 cursor-not-allowed ${
                  theme === "Dark"
                    ? "border-rose-500 bg-rose-50/50 shadow-2xs"
                    : "border-slate-200 bg-white"
                }`}
              >
                <Moon className="h-5 w-5 text-slate-400" />
                <span className="font-medium text-slate-400">Dark (Coming soon)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Security & Access Box */}
          <div className="bg-white rounded-2xl p-5 border border-rose-100/70 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-rose-50">
              <Shield className="h-4 w-4 text-rose-600" />
              <h3 className="text-xs font-bold text-slate-900">Session Security</h3>
            </div>
            <div className="space-y-2 text-xs text-slate-600">
              <p>Authentication utilizes HTTP-only secure cookie tokens.</p>
              <div className="pt-2 border-t border-rose-50">
                <span className="text-[11px] text-slate-400 block">Current User Role:</span>
                <span className="font-bold text-slate-800">{user?.role}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Assigned Branch:</span>
                <span className="font-bold text-slate-800">{user?.branch || "Main Office"}</span>
              </div>
            </div>
          </div>

          {/* Software Info */}
          <div className="bg-white rounded-2xl p-5 border border-rose-100/70 shadow-2xs space-y-2 text-xs">
            <span className="font-bold text-slate-900 block">DesignDec OMS Suite</span>
            <p className="text-[11px] text-slate-500">
              Version 2.4.0 • Enterprise Edition
            </p>
            <p className="text-[11px] text-slate-400 pt-2 border-t border-rose-50">
              © 2026 DesignDec. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
