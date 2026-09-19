import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  User,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Calendar,
  Lock,
  Camera,
  CheckCircle2,
  FileText,
  Clock,
  ShieldCheck,
  Edit2,
  ChevronRight,
  Download,
} from "lucide-react";
import useAuthStore from "../../stores/authStore";
import authApi from "../../api/auth.api";
import employeeApi from "../../api/employee.api";
import { changePasswordSchema } from "../../schemas/auth.schema";
import { formatDate } from "../../utils/formatters";
import { BRANCHES } from "../../constants/branches";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Badge from "../../components/ui/Badge";
import plantImg from "../../assets/plant-illustration.png";
import { toast } from "../../utils/toast";

export function ProfilePage() {
  const location = useLocation();
  const { user, setUser, forcePasswordChange } = useAuthStore();
  const isAdmin = user?.role === "Admin";
  const mustChangePassword = Boolean(forcePasswordChange || user?.isPasswordChanged === false);

  const [activeTab, setActiveTab] = useState(() => {
    if (location.hash === "#security" || location.search.includes("tab=security") || mustChangePassword) {
      return "security";
    }
    return "personal";
  });

  useEffect(() => {
    if (location.hash === "#security" || mustChangePassword) {
      setActiveTab("security");
    }
  }, [location.hash, mustChangePassword]);

  const [isEditingAdmin, setIsEditingAdmin] = useState(false);
  const [adminFormData, setAdminFormData] = useState({
    name: user?.name || "DesignDec Admin",
    phone: user?.phone || "9876543210",
    branch: user?.branch || "Main Office",
    department: user?.department || "Management",
  });

  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [reportFrequency, setReportFrequency] = useState("Weekly");

  // Change Password Form
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onPasswordSubmit = async (data) => {
    try {
      setPasswordLoading(true);
      setPasswordError("");
      const res = await authApi.changePassword(data);
      toast.success("Password Updated!", {
        description: res.message || "Your password was changed successfully.",
      });
      // Clear forced password change state upon success
      if (user) {
        setUser({ ...user, isPasswordChanged: true });
      }
      useAuthStore.setState({ forcePasswordChange: false });
      reset();
    } catch (err) {
      setPasswordError(err.response?.data?.message || "Failed to change password.");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleAdminProfileSave = async (e) => {
    e.preventDefault();
    try {
      const res = await employeeApi.updateEmployee(user?.employeeId, adminFormData);
      toast.success("Profile Updated Successfully!");
      if (res?.employee) {
        setUser({ ...user, ...res.employee });
      }
      setIsEditingAdmin(false);
    } catch (err) {
      toast.error("Failed to update profile", {
        description: err.response?.data?.message || "Something went wrong.",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rose-100/70 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-heading">
            My Profile
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isAdmin
              ? "Manage your personal information, preferences and account settings."
              : "View and manage your personal information."}
          </p>
        </div>

        {isAdmin ? (
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Edit2 className="h-3.5 w-3.5" />}
            onClick={() => setIsEditingAdmin(!isEditingAdmin)}
          >
            {isEditingAdmin ? "Close Edit" : "Edit Profile"}
          </Button>
        ) : (
          <div className="font-script text-2xl text-rose-400 font-bold hidden sm:block">
            “Good People Build Great Spaces.” —
          </div>
        )}
      </div>

      {/* Hero Summary Card */}
      {isAdmin ? (
        /* Admin Hero Card (Image 5 from Batch 2) */
        <div className="bg-white rounded-2xl p-6 border border-rose-100/70 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-600 font-extrabold text-xl text-white shadow-md">
                {user?.name ? user.name.slice(0, 2).toUpperCase() : "DE"}
              </div>
              <button
                type="button"
                className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-white border border-slate-200 text-slate-600 flex items-center justify-center hover:text-rose-600 shadow-xs"
              >
                <Camera className="h-3 w-3" />
              </button>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">{user?.name || "DesignDec Admin"}</h2>
                <Badge variant="success" size="sm">Active</Badge>
              </div>
              <p className="text-xs text-slate-500">Administrator • {user?.branch || "Main Office"}</p>
              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>Member since {formatDate(user?.joiningDate || "2024-01-12")}</span>
              </p>
            </div>
          </div>

          {/* 3 Stat Counters */}
          <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-rose-50 pt-4 md:pt-0 md:pl-6">
            <div className="text-center">
              <span className="text-xl font-bold text-slate-900 block font-heading">24</span>
              <span className="text-[11px] text-slate-400">Total Orders</span>
            </div>
            <div className="text-center">
              <span className="text-xl font-bold text-slate-900 block font-heading">18</span>
              <span className="text-[11px] text-slate-400">Team Members</span>
            </div>
            <div className="text-center">
              <span className="text-xl font-bold text-slate-900 block font-heading">120</span>
              <span className="text-[11px] text-slate-400">Days Active</span>
            </div>
          </div>
        </div>
      ) : (
        /* Employee Hero Card (Image 4 from Batch 2) */
        <div className="bg-white rounded-2xl p-6 border border-rose-100/70 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-600 font-extrabold text-xl text-white shadow-md">
                {user?.name ? user.name.slice(0, 2).toUpperCase() : "RS"}
              </div>
              <button
                type="button"
                className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-white border border-slate-200 text-slate-600 flex items-center justify-center hover:text-rose-600 shadow-xs"
              >
                <Camera className="h-3 w-3" />
              </button>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">{user?.name || "Rahul Sharma"}</h2>
                <Badge variant="success" size="sm">Active</Badge>
              </div>
              <p className="text-xs text-slate-500">{user?.designation || "Employee"} • {user?.employeeId || "DD-EMP-003"}</p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 pt-0.5">
                <span className="flex items-center gap-1"><Mail className="h-3 w-3 text-slate-400" /> {user?.email}</span>
                <span className="flex items-center gap-1"><Phone className="h-3 w-3 text-slate-400" /> {user?.phone || "+91 98765 43210"}</span>
                <span className="flex items-center gap-1"><Building2 className="h-3 w-3 text-slate-400" /> {user?.branch || "Main Office, Bhubaneswar"}</span>
              </div>
            </div>
          </div>

          {/* Inspirational Branding Card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-50/90 via-pink-50/60 to-rose-100/40 p-4 border border-rose-100/80 min-w-[240px] shadow-2xs">
            <p className="text-xs font-bold text-slate-800 leading-snug max-w-[130px]">
              Designing spaces, building happier lives.
            </p>
            <div className="font-script text-xl text-rose-400 font-bold mt-1">DesignDec —</div>
            <div className="absolute -right-2 -bottom-2 w-16 h-20 pointer-events-none flex items-end justify-end">
              <img src={plantImg} alt="plant" className="w-full h-full object-contain" />
            </div>
          </div>
        </div>
      )}

      {/* Tabs Row */}
      <div className="flex items-center gap-2 border-b border-rose-100/70 pb-3 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab("personal")}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
            activeTab === "personal"
              ? "bg-rose-50 text-rose-600 border border-rose-200 shadow-2xs"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          Personal Information
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("security")}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
            activeTab === "security"
              ? "bg-rose-50 text-rose-600 border border-rose-200 shadow-2xs"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          {isAdmin ? "Change Password" : "Security"}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("preferences")}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
            activeTab === "preferences"
              ? "bg-rose-50 text-rose-600 border border-rose-200 shadow-2xs"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          Preferences
        </button>

        {isAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab("activity")}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeTab === "activity"
                ? "bg-rose-50 text-rose-600 border border-rose-200 shadow-2xs"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            Login Activity
          </button>
        )}
      </div>

      {/* Main Tab Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          {activeTab === "personal" && (
            isAdmin ? (
              /* Admin Profile Edit Form */
              <div className="bg-white rounded-2xl p-6 border border-rose-100/70 shadow-2xs">
                <h3 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-rose-50">
                  Edit Admin Profile Details
                </h3>

                <form onSubmit={handleAdminProfileSave} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Full Name *"
                      value={adminFormData.name}
                      onChange={(e) => setAdminFormData({ ...adminFormData, name: e.target.value })}
                      required
                    />
                    <Input
                      label="Employee ID"
                      value={user?.employeeId || "DD-EMP-001"}
                      disabled
                      helperText="System assigned ID cannot be changed"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Email *"
                      value={user?.email || "admin@designdec.in"}
                      disabled
                      helperText="System login address"
                    />
                    <Input
                      label="Role"
                      value="Administrator"
                      disabled
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Phone Number"
                      value={adminFormData.phone}
                      onChange={(e) => setAdminFormData({ ...adminFormData, phone: e.target.value })}
                    />
                    <Select
                      label="Branch"
                      value={adminFormData.branch}
                      onChange={(e) => setAdminFormData({ ...adminFormData, branch: e.target.value })}
                      options={BRANCHES.map((b) => ({ value: b, label: b }))}
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-rose-50">
                    <Button variant="outline" type="button" onClick={() => setIsEditingAdmin(false)}>
                      Cancel
                    </Button>
                    <Button variant="primary" type="submit">
                      Save Changes
                    </Button>
                  </div>
                </form>
              </div>
            ) : (
              /* Employee 4 Info Cards Grid (Image 4 from Batch 2) */
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4.5">
                  {/* Personal Information */}
                  <div className="bg-white rounded-2xl p-5 border border-rose-100/70 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-rose-50">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-rose-600" />
                        <h3 className="text-xs font-bold text-slate-900">Personal Information</h3>
                      </div>
                      <span className="text-[11px] font-semibold text-rose-600 cursor-pointer">✏ Edit</span>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between"><span className="text-slate-500">Full Name</span><span className="font-semibold text-slate-800">{user?.name}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Email Address</span><span className="font-semibold text-slate-800">{user?.email}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Phone Number</span><span className="font-semibold text-slate-800">{user?.phone || "+91 98765 43210"}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Date of Birth</span><span className="font-semibold text-slate-800">15 March 1998</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Gender</span><span className="font-semibold text-slate-800">Male</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Address</span><span className="font-semibold text-slate-800 text-right max-w-[150px]">Plot No. 123, Saheed Nagar, Bhubaneswar</span></div>
                    </div>
                  </div>

                  {/* Work Information */}
                  <div className="bg-white rounded-2xl p-5 border border-rose-100/70 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-rose-50">
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-rose-600" />
                        <h3 className="text-xs font-bold text-slate-900">Work Information</h3>
                      </div>
                      <span className="text-[11px] font-semibold text-rose-600 cursor-pointer">✏ Edit</span>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between"><span className="text-slate-500">Employee ID</span><span className="font-semibold text-slate-800">{user?.employeeId}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Role</span><span className="font-semibold text-slate-800">{user?.role}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Branch</span><span className="font-semibold text-slate-800">{user?.branch || "Main Office"}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Department</span><span className="font-semibold text-slate-800">{user?.department || "Operations"}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Date of Joining</span><span className="font-semibold text-slate-800">{formatDate(user?.joiningDate || "2024-06-01")}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Status</span><Badge variant="success" size="sm">Active</Badge></div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4.5">
                  {/* Emergency Contact */}
                  <div className="bg-white rounded-2xl p-5 border border-rose-100/70 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-rose-50">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-rose-600" />
                        <h3 className="text-xs font-bold text-slate-900">Emergency Contact</h3>
                      </div>
                      <span className="text-[11px] font-semibold text-rose-600 cursor-pointer">✏ Edit</span>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between"><span className="text-slate-500">Contact Name</span><span className="font-semibold text-slate-800">Suresh Sharma (Father)</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Phone Number</span><span className="font-semibold text-slate-800">+91 98765 12345</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Relationship</span><span className="font-semibold text-slate-800">Father</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Address</span><span className="font-semibold text-slate-800">Bhubaneswar, Odisha</span></div>
                    </div>
                  </div>

                  {/* Documents Checklist */}
                  <div className="bg-white rounded-2xl p-5 border border-rose-100/70 shadow-2xs space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-rose-50">
                      <FileText className="h-4 w-4 text-rose-600" />
                      <h3 className="text-xs font-bold text-slate-900">Documents</h3>
                    </div>
                    <div className="space-y-2.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-700 font-medium">Aadhaar Card</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">Uploaded</span>
                          <span className="text-rose-600 font-semibold cursor-pointer">View</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-700 font-medium">PAN Card</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">Uploaded</span>
                          <span className="text-rose-600 font-semibold cursor-pointer">View</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-700 font-medium">Address Proof</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600">Not Uploaded</span>
                          <span className="text-rose-600 font-semibold cursor-pointer">Upload</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          )}

          {/* Change Password Tab */}
          {activeTab === "security" && (
            <div className="bg-white rounded-2xl p-6 border border-rose-100/70 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-rose-50">
                <Lock className="h-4 w-4 text-rose-600" />
                <h3 className="text-sm font-bold text-slate-900">Security & Password</h3>
              </div>
              {mustChangePassword && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold block text-sm text-amber-950">
                      Temporary Password Detected
                    </strong>
                    <p className="mt-0.5 text-amber-800">
                      You are logged in with a temporary onboarding password. Please set a permanent password to complete your account setup and unlock full dashboard access.
                    </p>
                  </div>
                </div>
              )}
              {passwordError && (
                <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200">
                  {passwordError}
                </div>
              )}
              <form onSubmit={handleSubmit(onPasswordSubmit)} className="space-y-4 max-w-md text-xs">
                <Input
                  label="Current Password"
                  type="password"
                  error={errors.currentPassword?.message}
                  {...register("currentPassword")}
                  required
                />
                <Input
                  label="New Password"
                  type="password"
                  error={errors.newPassword?.message}
                  {...register("newPassword")}
                  required
                />
                <Input
                  label="Confirm New Password"
                  type="password"
                  error={errors.confirmPassword?.message}
                  {...register("confirmPassword")}
                  required
                />
                <Button variant="primary" type="submit" isLoading={passwordLoading}>
                  Change Password
                </Button>
              </form>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === "preferences" && (
            <div className="bg-white rounded-2xl p-6 border border-rose-100/70 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-rose-50">System Preferences</h3>
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between py-2 border-b border-rose-50">
                  <div>
                    <span className="font-semibold text-slate-800 block">Email Notifications</span>
                    <span className="text-slate-400 text-[11px]">Receive emails for urgent deadlines and bookings</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailNotifs}
                    onChange={(e) => setEmailNotifs(e.target.checked)}
                    className="accent-rose-600 h-4 w-4 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between py-2 border-b border-rose-50">
                  <div>
                    <span className="font-semibold text-slate-800 block">Push Notifications</span>
                    <span className="text-slate-400 text-[11px]">Receive in-app popups and alerts</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={pushNotifs}
                    onChange={(e) => setPushNotifs(e.target.checked)}
                    className="accent-rose-600 h-4 w-4 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <span className="font-semibold text-slate-800 block">Report Frequency</span>
                    <span className="text-slate-400 text-[11px]">Weekly performance digest</span>
                  </div>
                  <select
                    value={reportFrequency}
                    onChange={(e) => setReportFrequency(e.target.value)}
                    className="px-2 py-1 rounded border border-slate-200 text-xs"
                  >
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Login Activity (Admin only) */}
          {activeTab === "activity" && isAdmin && (
            <div className="bg-white rounded-2xl border border-rose-100/70 shadow-2xs overflow-hidden">
              <div className="p-5 border-b border-rose-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4.5 w-4.5 text-rose-600" />
                  <h3 className="text-xs font-bold text-slate-900">Recent Login Activity</h3>
                </div>
                <span className="text-xs text-rose-600 font-semibold cursor-pointer">View All</span>
              </div>
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-rose-50/40 text-[11px] font-bold text-slate-500 uppercase border-b border-rose-50">
                  <tr>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">IP Address</th>
                    <th className="py-3 px-4">Device</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rose-50">
                  <tr className="hover:bg-rose-50/20">
                    <td className="py-3 px-4">13 Sep 2025, 09:12 AM</td>
                    <td className="py-3 px-4 font-mono">117.203.45.12</td>
                    <td className="py-3 px-4">Windows • Chrome</td>
                    <td className="py-3 px-4"><span className="text-emerald-600 font-bold">Success</span></td>
                  </tr>
                  <tr className="hover:bg-rose-50/20">
                    <td className="py-3 px-4">12 Sep 2025, 06:45 PM</td>
                    <td className="py-3 px-4 font-mono">117.203.45.12</td>
                    <td className="py-3 px-4">Windows • Chrome</td>
                    <td className="py-3 px-4"><span className="text-emerald-600 font-bold">Success</span></td>
                  </tr>
                  <tr className="hover:bg-rose-50/20">
                    <td className="py-3 px-4">12 Sep 2025, 10:20 AM</td>
                    <td className="py-3 px-4 font-mono">117.203.45.12</td>
                    <td className="py-3 px-4">Android • Chrome</td>
                    <td className="py-3 px-4"><span className="text-emerald-600 font-bold">Success</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          {isAdmin ? (
            <>
              {/* Quick Info */}
              <div className="bg-white rounded-2xl p-5 border border-rose-100/70 shadow-2xs space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-rose-50">
                  <User className="h-4 w-4 text-rose-600" />
                  <h3 className="text-xs font-bold text-slate-900">Quick Info</h3>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-slate-500">Employee ID</span><span className="font-semibold text-slate-800">{user?.employeeId}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Email</span><span className="font-semibold text-slate-800">{user?.email}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Role</span><span className="font-semibold text-slate-800">Administrator</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Branch</span><span className="font-semibold text-slate-800">{user?.branch || "Main Office"}</span></div>
                </div>
              </div>

              {/* Security guarantee */}
              <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-100/80 text-xs flex items-center gap-3">
                <ShieldCheck className="h-6 w-6 text-rose-600 shrink-0" />
                <div>
                  <span className="font-bold text-slate-800 block">Your account is secure</span>
                  <span className="text-[11px] text-slate-500">HTTP-only cookie authentication active.</span>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Profile Completion Circular Ring (Image 4 from Batch 2) */}
              <div className="bg-white rounded-2xl p-5 border border-rose-100/70 shadow-2xs space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-rose-50">
                  <CheckCircle2 className="h-4 w-4 text-rose-600" />
                  <h3 className="text-xs font-bold text-slate-900">Profile Completion</h3>
                </div>

                <div className="flex items-center gap-4 pt-1">
                  {/* Circular SVG progress ring */}
                  <div className="relative h-16 w-16 shrink-0 flex items-center justify-center">
                    <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-rose-100"
                        strokeWidth="3.5"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-rose-600"
                        strokeDasharray="80, 100"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <span className="absolute font-bold text-sm text-slate-900">80%</span>
                  </div>

                  <p className="text-xs text-slate-500">
                    Your profile is almost complete! Add remaining details for a better experience.
                  </p>
                </div>

                <div className="space-y-1.5 pt-2 text-xs border-t border-rose-50">
                  <div className="flex items-center gap-2 text-emerald-600 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" /> <span>Basic Information</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-600 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" /> <span>Work Information</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-600 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" /> <span>Contact Details</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="h-3.5 w-3.5 rounded-full border border-slate-300" /> <span>Add Profile Photo</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="h-3.5 w-3.5 rounded-full border border-slate-300" /> <span>Update Address Proof (Optional)</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-2xl p-5 border border-rose-100/70 shadow-2xs space-y-2.5">
                <div className="flex items-center gap-2 pb-2 border-b border-rose-50">
                  <span className="text-rose-600 font-bold">⚡</span>
                  <h3 className="text-xs font-bold text-slate-900">Quick Actions</h3>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab("security")}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-rose-50/50 text-xs font-semibold text-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-2"><Lock className="h-4 w-4 text-rose-600" /> <span>Change Password</span></div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </button>

                <button
                  type="button"
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-rose-50/50 text-xs font-semibold text-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-2"><Camera className="h-4 w-4 text-rose-600" /> <span>Update Profile Photo</span></div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </button>

                <button
                  type="button"
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-rose-50/50 text-xs font-semibold text-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-2"><Download className="h-4 w-4 text-rose-600" /> <span>Download My ID Card</span></div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
