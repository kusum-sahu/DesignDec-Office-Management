import { useState, useEffect, useMemo } from "react";
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
import { changePasswordSchema } from "../../schemas/auth.schema";
import { formatDate } from "../../utils/formatters";
import { BRANCHES } from "../../constants/branches";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Badge from "../../components/ui/Badge";
import plantImg from "../../assets/plant-illustration.png";
import { toast } from "../../utils/toast";

import { EditPersonalInfoModal } from "../../components/profile/EditPersonalInfoModal";
import { EditEmergencyContactModal } from "../../components/profile/EditEmergencyContactModal";
import { UpdateProfilePhotoModal } from "../../components/profile/UpdateProfilePhotoModal";
import { UploadDocumentModal } from "../../components/profile/UploadDocumentModal";
import { ChangePasswordModal } from "../../components/profile/ChangePasswordModal";

export function ProfilePage() {
  const location = useLocation();
  const { user, setUser, forcePasswordChange } = useAuthStore();
  const isAdmin = user?.role === "Admin";
  const mustChangePassword = Boolean(forcePasswordChange || user?.isPasswordChanged === false);

  // Modals state
  const [isEditPersonalOpen, setIsEditPersonalOpen] = useState(false);
  const [isEditEmergencyOpen, setIsEditEmergencyOpen] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState("addressProof");
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

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
    phone: user?.phone || "",
    branch: user?.branch || "Main Office",
    department: user?.department || "Management",
  });

  useEffect(() => {
    if (user) {
      setAdminFormData({
        name: user.name || "DesignDec Admin",
        phone: user.phone || "",
        branch: user.branch || "Main Office",
        department: user.department || "Management",
      });
    }
  }, [user]);

  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [reportFrequency, setReportFrequency] = useState("Weekly");

  // Change Password Form inside Security Tab
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
      const res = await authApi.updateProfile(adminFormData);
      toast.success("Profile Updated Successfully!");
      if (res?.user) {
        setUser(res.user);
      }
      setIsEditingAdmin(false);
    } catch (err) {
      toast.error("Failed to update profile", {
        description: err.response?.data?.message || "Something went wrong.",
      });
    }
  };

  // Dynamic Profile Completion Calculation
  const completionStats = useMemo(() => {
    const hasBasic = Boolean(user?.name && user?.email);
    const hasWork = Boolean(user?.employeeId && user?.role);
    const personalFilled = [user?.phone, user?.dateOfBirth, user?.gender, user?.address].filter(Boolean).length;
    const hasPersonal = personalFilled >= 2;
    const hasPhoto = Boolean(user?.profileImage);
    const hasEmergency = Boolean(user?.emergencyContact?.name && user?.emergencyContact?.phone);
    const hasDocs = Boolean(user?.documents?.aadhaar || user?.documents?.pan || user?.documents?.addressProof);

    let score = 0;
    if (hasBasic) score += 20;
    if (hasWork) score += 20;
    if (hasPersonal) score += 20;
    if (hasPhoto) score += 20;
    if (hasEmergency && hasDocs) score += 20;
    else if (hasEmergency || hasDocs) score += 10;

    return {
      score: Math.min(score, 100),
      hasBasic,
      hasWork,
      hasPersonal,
      hasPhoto,
      hasEmergency,
      hasDocs,
    };
  }, [user]);

  const handleOpenDocModal = (type) => {
    setSelectedDocType(type);
    setIsDocModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rose-100/70 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 font-heading">
            My Profile
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isAdmin
              ? "Manage your personal information, preferences and account settings."
              : "View and manage your personal information and documents."}
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
          <div className="font-script text-2xl text-rose-400 dark:text-rose-300 font-bold hidden sm:block">
            “Good People Build Great Spaces.” —
          </div>
        )}
      </div>

      {/* Hero Summary Card */}
      {isAdmin ? (
        /* Admin Hero Card */
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-rose-100/70 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-6 transition-colors">
          <div className="flex items-center gap-4">
            <div className="relative">
              {user?.profileImage ? (
                <img
                  src={user.profileImage}
                  alt={user?.name || "Admin"}
                  className="h-16 w-16 rounded-full object-cover shadow-md border-2 border-rose-500/20"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-600 font-extrabold text-xl text-white shadow-md">
                  {user?.name ? user.name.slice(0, 2).toUpperCase() : "AD"}
                </div>
              )}
              <button
                type="button"
                onClick={() => setIsPhotoModalOpen(true)}
                title="Update Profile Photo"
                className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:text-rose-600 dark:hover:text-rose-400 shadow-xs cursor-pointer transition-colors"
              >
                <Camera className="h-3 w-3" />
              </button>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{user?.name || "DesignDec Admin"}</h2>
                <Badge variant="success" size="sm">Active</Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Administrator • {user?.branch || "Main Office"}</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>Member since {formatDate(user?.joiningDate || user?.createdAt || "2024-01-12")}</span>
              </p>
            </div>
          </div>

          {/* 3 Stat Counters */}
          <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-rose-50 dark:border-slate-800 pt-4 md:pt-0 md:pl-6">
            <div className="text-center">
              <span className="text-xl font-bold text-slate-900 dark:text-slate-100 block font-heading">24</span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">Total Orders</span>
            </div>
            <div className="text-center">
              <span className="text-xl font-bold text-slate-900 dark:text-slate-100 block font-heading">18</span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">Team Members</span>
            </div>
            <div className="text-center">
              <span className="text-xl font-bold text-slate-900 dark:text-slate-100 block font-heading">120</span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">Days Active</span>
            </div>
          </div>
        </div>
      ) : (
        /* Employee Hero Card */
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-rose-100/70 dark:border-slate-800 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-6 transition-colors">
          <div className="flex items-center gap-4">
            <div className="relative">
              {user?.profileImage ? (
                <img
                  src={user.profileImage}
                  alt={user?.name || "User"}
                  className="h-16 w-16 rounded-2xl object-cover shadow-md border-2 border-rose-500/20"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-600 font-extrabold text-xl text-white shadow-md">
                  {user?.name ? user.name.slice(0, 2).toUpperCase() : "DD"}
                </div>
              )}
              <button
                type="button"
                onClick={() => setIsPhotoModalOpen(true)}
                title="Update Profile Photo"
                className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:text-rose-600 dark:hover:text-rose-400 shadow-xs cursor-pointer transition-colors"
              >
                <Camera className="h-3 w-3" />
              </button>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{user?.name || "Employee"}</h2>
                <Badge variant={user?.status === "Inactive" ? "destructive" : "success"} size="sm">
                  {user?.status || "Active"}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {user?.designation || user?.role || "Employee"} • {user?.employeeId || "DD-EMP-001"}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400 pt-0.5">
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3 text-slate-400 dark:text-slate-500" /> {user?.email}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3 text-slate-400 dark:text-slate-500" /> {user?.phone || "No phone added"}
                </span>
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3 text-slate-400 dark:text-slate-500" /> {user?.branch || "Main Office"}
                </span>
              </div>
            </div>
          </div>

          {/* Inspirational Branding Card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-50/90 via-pink-50/60 to-rose-100/40 dark:from-slate-800/80 dark:via-rose-950/30 dark:to-slate-900/80 p-4 border border-rose-100/80 dark:border-slate-700/60 min-w-[240px] shadow-2xs">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug max-w-[130px]">
              Designing spaces, building happier lives.
            </p>
            <div className="font-script text-xl text-rose-500 dark:text-rose-400 font-bold mt-1">DesignDec —</div>
            <div className="absolute -right-2 -bottom-2 w-16 h-20 pointer-events-none flex items-end justify-end">
              <img src={plantImg} alt="plant" className="w-full h-full object-contain opacity-90" />
            </div>
          </div>
        </div>
      )}

      {/* Tabs Row */}
      <div className="flex items-center gap-2 border-b border-rose-100/70 dark:border-slate-800 pb-3 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab("personal")}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
            activeTab === "personal"
              ? "bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 shadow-2xs"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
          }`}
        >
          Personal Information
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("security")}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
            activeTab === "security"
              ? "bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 shadow-2xs"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
          }`}
        >
          {isAdmin ? "Change Password" : "Security"}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("preferences")}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
            activeTab === "preferences"
              ? "bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 shadow-2xs"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
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
                ? "bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
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
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-rose-100/70 dark:border-slate-800 shadow-2xs transition-colors">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4 pb-2 border-b border-rose-50 dark:border-slate-800">
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
                      placeholder="e.g. 9876543210"
                    />
                    <Select
                      label="Branch"
                      value={adminFormData.branch}
                      onChange={(e) => setAdminFormData({ ...adminFormData, branch: e.target.value })}
                      options={BRANCHES.map((b) => ({ value: b, label: b }))}
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-rose-50 dark:border-slate-800">
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
              /* Employee 4 Info Cards Grid with REAL MongoDB user data */
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4.5">
                  {/* Personal Information */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-rose-100/70 dark:border-slate-800 shadow-2xs space-y-3 transition-colors">
                    <div className="flex items-center justify-between pb-2 border-b border-rose-50 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                        <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">Personal Information</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsEditPersonalOpen(true)}
                        className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <Edit2 className="h-3 w-3" /> Edit
                      </button>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Full Name</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{user?.name || "Not Provided"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Email Address</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{user?.email || "Not Provided"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Phone Number</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{user?.phone || "Not Provided"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Date of Birth</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {user?.dateOfBirth ? formatDate(user.dateOfBirth) : "Not Provided"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Gender</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{user?.gender || "Not Provided"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Address</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 text-right max-w-[170px] truncate" title={user?.address}>
                          {user?.address || "Not Provided"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Work Information */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-rose-100/70 dark:border-slate-800 shadow-2xs space-y-3 transition-colors">
                    <div className="flex items-center justify-between pb-2 border-b border-rose-50 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                        <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">Work Information</h3>
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Official Record</span>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Employee ID</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{user?.employeeId || "DD-EMP-001"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Role</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{user?.role || "Employee"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Branch</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{user?.branch || "Main Office"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Department</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{user?.department || "Operations"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Date of Joining</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {formatDate(user?.joiningDate || user?.createdAt || "2024-06-01")}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 dark:text-slate-400">Status</span>
                        <Badge variant={user?.status === "Inactive" ? "destructive" : "success"} size="sm">
                          {user?.status || "Active"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4.5">
                  {/* Emergency Contact */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-rose-100/70 dark:border-slate-800 shadow-2xs space-y-3 transition-colors">
                    <div className="flex items-center justify-between pb-2 border-b border-rose-50 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                        <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">Emergency Contact</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsEditEmergencyOpen(true)}
                        className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <Edit2 className="h-3 w-3" /> Edit
                      </button>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Contact Name</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {user?.emergencyContact?.name || "Not Provided"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Phone Number</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {user?.emergencyContact?.phone || "Not Provided"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Relationship</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {user?.emergencyContact?.relationship || "Not Provided"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Address / City</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 text-right max-w-[170px] truncate" title={user?.emergencyContact?.address}>
                          {user?.emergencyContact?.address || "Not Provided"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Documents Checklist */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-rose-100/70 dark:border-slate-800 shadow-2xs space-y-3 transition-colors">
                    <div className="flex items-center justify-between pb-2 border-b border-rose-50 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                        <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">Documents</h3>
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">ID Verification</span>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      {/* Aadhaar Card */}
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-slate-700 dark:text-slate-300 font-medium block">Aadhaar Card</span>
                          {user?.documents?.aadhaar && (
                            <span className="text-[10px] text-slate-400 font-mono">{user.documents.aadhaar}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {user?.documents?.aadhaar ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                              Uploaded
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
                              Pending
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenDocModal("aadhaar")}
                            className="text-rose-600 dark:text-rose-400 font-semibold cursor-pointer hover:underline text-xs"
                          >
                            {user?.documents?.aadhaar ? "Edit" : "Upload"}
                          </button>
                        </div>
                      </div>

                      {/* PAN Card */}
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-slate-700 dark:text-slate-300 font-medium block">PAN Card</span>
                          {user?.documents?.pan && (
                            <span className="text-[10px] text-slate-400 font-mono">{user.documents.pan}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {user?.documents?.pan ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                              Uploaded
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
                              Pending
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenDocModal("pan")}
                            className="text-rose-600 dark:text-rose-400 font-semibold cursor-pointer hover:underline text-xs"
                          >
                            {user?.documents?.pan ? "Edit" : "Upload"}
                          </button>
                        </div>
                      </div>

                      {/* Address Proof */}
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-slate-700 dark:text-slate-300 font-medium block">Address Proof</span>
                          {user?.documents?.addressProof && (
                            <span className="text-[10px] text-slate-400 font-mono">{user.documents.addressProof}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {user?.documents?.addressProof ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                              Uploaded
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                              Optional
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenDocModal("addressProof")}
                            className="text-rose-600 dark:text-rose-400 font-semibold cursor-pointer hover:underline text-xs"
                          >
                            {user?.documents?.addressProof ? "Edit" : "Upload"}
                          </button>
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
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-rose-100/70 dark:border-slate-800 shadow-2xs space-y-4 transition-colors">
              <div className="flex items-center gap-2 pb-3 border-b border-rose-50 dark:border-slate-800">
                <Lock className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Security & Password</h3>
              </div>
              {mustChangePassword && (
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold block text-sm text-amber-950 dark:text-amber-100">
                      Temporary Password Detected
                    </strong>
                    <p className="mt-0.5 text-amber-800 dark:text-amber-300">
                      You are logged in with a temporary onboarding password. Please set a permanent password to complete your account setup and unlock full dashboard access.
                    </p>
                  </div>
                </div>
              )}
              {passwordError && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs border border-red-200 dark:border-red-900">
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
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-rose-100/70 dark:border-slate-800 shadow-2xs space-y-4 transition-colors">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 pb-2 border-b border-rose-50 dark:border-slate-800">
                System Preferences
              </h3>
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between py-2 border-b border-rose-50 dark:border-slate-800">
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block">Email Notifications</span>
                    <span className="text-slate-400 dark:text-slate-500 text-[11px]">Receive emails for urgent deadlines and bookings</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailNotifs}
                    onChange={(e) => setEmailNotifs(e.target.checked)}
                    className="accent-rose-600 h-4 w-4 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between py-2 border-b border-rose-50 dark:border-slate-800">
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block">Push Notifications</span>
                    <span className="text-slate-400 dark:text-slate-500 text-[11px]">Receive in-app popups and alerts</span>
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
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block">Report Frequency</span>
                    <span className="text-slate-400 dark:text-slate-500 text-[11px]">Weekly performance digest</span>
                  </div>
                  <select
                    value={reportFrequency}
                    onChange={(e) => setReportFrequency(e.target.value)}
                    className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs"
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
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-rose-100/70 dark:border-slate-800 shadow-2xs overflow-hidden transition-colors">
              <div className="p-5 border-b border-rose-50 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4.5 w-4.5 text-rose-600 dark:text-rose-400" />
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">Recent Login Activity</h3>
                </div>
                <span className="text-xs text-rose-600 dark:text-rose-400 font-semibold cursor-pointer">View All</span>
              </div>
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="bg-rose-50/40 dark:bg-slate-800/60 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase border-b border-rose-50 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">IP Address</th>
                    <th className="py-3 px-4">Device</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rose-50 dark:divide-slate-800">
                  <tr className="hover:bg-rose-50/20 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4">13 Sep 2025, 09:12 AM</td>
                    <td className="py-3 px-4 font-mono">117.203.45.12</td>
                    <td className="py-3 px-4">Windows • Chrome</td>
                    <td className="py-3 px-4"><span className="text-emerald-600 dark:text-emerald-400 font-bold">Success</span></td>
                  </tr>
                  <tr className="hover:bg-rose-50/20 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4">12 Sep 2025, 06:45 PM</td>
                    <td className="py-3 px-4 font-mono">117.203.45.12</td>
                    <td className="py-3 px-4">Windows • Chrome</td>
                    <td className="py-3 px-4"><span className="text-emerald-600 dark:text-emerald-400 font-bold">Success</span></td>
                  </tr>
                  <tr className="hover:bg-rose-50/20 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4">12 Sep 2025, 10:20 AM</td>
                    <td className="py-3 px-4 font-mono">117.203.45.12</td>
                    <td className="py-3 px-4">Android • Chrome</td>
                    <td className="py-3 px-4"><span className="text-emerald-600 dark:text-emerald-400 font-bold">Success</span></td>
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
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-rose-100/70 dark:border-slate-800 shadow-2xs space-y-3 transition-colors">
                <div className="flex items-center gap-2 pb-2 border-b border-rose-50 dark:border-slate-800">
                  <User className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">Quick Info</h3>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Employee ID</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{user?.employeeId || "DD-EMP-001"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Email</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{user?.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Role</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Administrator</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Branch</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{user?.branch || "Main Office"}</span>
                  </div>
                </div>
              </div>

              {/* Security guarantee */}
              <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-slate-800/80 border border-rose-100/80 dark:border-slate-700/70 text-xs flex items-center gap-3">
                <ShieldCheck className="h-6 w-6 text-rose-600 dark:text-rose-400 shrink-0" />
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">Your account is secure</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">HTTP-only cookie authentication active.</span>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Profile Completion Circular Ring (Dynamic from real data) */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-rose-100/70 dark:border-slate-800 shadow-2xs space-y-3 transition-colors">
                <div className="flex items-center gap-2 pb-2 border-b border-rose-50 dark:border-slate-800">
                  <CheckCircle2 className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">Profile Completion</h3>
                </div>

                <div className="flex items-center gap-4 pt-1">
                  {/* Circular SVG progress ring */}
                  <div className="relative h-16 w-16 shrink-0 flex items-center justify-center">
                    <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-rose-100 dark:text-slate-800"
                        strokeWidth="3.5"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-rose-600 dark:text-rose-500 transition-all duration-700 ease-out"
                        strokeDasharray={`${completionStats.score}, 100`}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <span className="absolute font-bold text-sm text-slate-900 dark:text-slate-100">
                      {completionStats.score}%
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {completionStats.score === 100
                      ? "Awesome! Your profile is 100% complete and up to date."
                      : "Complete your profile information and documents for the best experience."}
                  </p>
                </div>

                {/* Real checklist items */}
                <div className="space-y-1.5 pt-2 text-xs border-t border-rose-50 dark:border-slate-800">
                  <div className={`flex items-center gap-2 font-medium ${completionStats.hasBasic ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500"}`}>
                    {completionStats.hasBasic ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span className="h-3.5 w-3.5 rounded-full border border-slate-300 dark:border-slate-600" />}
                    <span>Basic Information</span>
                  </div>

                  <div className={`flex items-center gap-2 font-medium ${completionStats.hasWork ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500"}`}>
                    {completionStats.hasWork ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span className="h-3.5 w-3.5 rounded-full border border-slate-300 dark:border-slate-600" />}
                    <span>Work Details</span>
                  </div>

                  <div className={`flex items-center gap-2 font-medium ${completionStats.hasPersonal ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500"}`}>
                    {completionStats.hasPersonal ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span className="h-3.5 w-3.5 rounded-full border border-slate-300 dark:border-slate-600" />}
                    <span>Personal Info & Address</span>
                  </div>

                  <div className={`flex items-center gap-2 font-medium ${completionStats.hasPhoto ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500"}`}>
                    {completionStats.hasPhoto ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span className="h-3.5 w-3.5 rounded-full border border-slate-300 dark:border-slate-600" />}
                    <span>Profile Photo</span>
                  </div>

                  <div className={`flex items-center gap-2 font-medium ${completionStats.hasEmergency ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500"}`}>
                    {completionStats.hasEmergency ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span className="h-3.5 w-3.5 rounded-full border border-slate-300 dark:border-slate-600" />}
                    <span>Emergency Contact</span>
                  </div>

                  <div className={`flex items-center gap-2 font-medium ${completionStats.hasDocs ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500"}`}>
                    {completionStats.hasDocs ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span className="h-3.5 w-3.5 rounded-full border border-slate-300 dark:border-slate-600" />}
                    <span>Identity Documents</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-rose-100/70 dark:border-slate-800 shadow-2xs space-y-2.5 transition-colors">
                <div className="flex items-center gap-2 pb-2 border-b border-rose-50 dark:border-slate-800">
                  <span className="text-rose-600 dark:text-rose-400 font-bold">⚡</span>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">Quick Actions</h3>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(true)}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 hover:bg-rose-50/50 dark:hover:bg-rose-950/30 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                    <span>Change Password</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsPhotoModalOpen(true)}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 hover:bg-rose-50/50 dark:hover:bg-rose-950/30 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Camera className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                    <span>Update Profile Photo</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    toast.success("Employee ID Badge Ready", {
                      description: `${user?.name || "Employee"} (ID: ${user?.employeeId || "DD-EMP"}) downloaded.`,
                    });
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 hover:bg-rose-50/50 dark:hover:bg-rose-950/30 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Download className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                    <span>Download My ID Card</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Interactive Modals */}
      <EditPersonalInfoModal
        isOpen={isEditPersonalOpen}
        onClose={() => setIsEditPersonalOpen(false)}
      />

      <EditEmergencyContactModal
        isOpen={isEditEmergencyOpen}
        onClose={() => setIsEditEmergencyOpen(false)}
      />

      <UpdateProfilePhotoModal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
      />

      <UploadDocumentModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        initialDocType={selectedDocType}
      />

      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </div>
  );
}

export default ProfilePage;
