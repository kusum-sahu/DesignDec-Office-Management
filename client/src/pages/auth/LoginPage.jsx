import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { User, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";
import { loginSchema } from "../../schemas/auth.schema";
import useAuthStore from "../../stores/authStore";
import { toast } from "../../utils/toast";
import { cn } from "../../utils/cn";
import logoImg from "../../assets/designdec-logo.png";
import officeIllustration from "../../assets/office-illustration-transparent.png";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isActionLoading, error, clearError } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      employeeId: "",
      password: "",
    },
  });

  const onSubmit = async (data) => {
    clearError();
    const result = await login(data);

    if (result.success) {
      toast.success("Welcome back!", {
        description: `Logged in as ${result.user.name} (${result.user.role})`,
      });

      // If user is required to change password on first login
      if (result.forcePasswordChange) {
        navigate("/profile#security");
      } else {
        const from = location.state?.from?.pathname || "/";
        navigate(from, { replace: true });
      }
    }
  };

  return (
    <div className="h-screen max-h-screen w-full bg-[#FEF1F2] relative overflow-hidden flex items-center justify-center p-3 sm:p-5 lg:p-6 font-sans selection:bg-rose-100 selection:text-rose-900">
      {/* Ambient background glows */}
      <div
        className="absolute top-0 left-0 w-[450px] h-[450px] bg-rose-200/35 rounded-full blur-3xl pointer-events-none -translate-x-1/3 -translate-y-1/3"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-rose-100/50 rounded-full blur-3xl pointer-events-none translate-x-1/4 translate-y-1/4"
        aria-hidden="true"
      />

      {/* Subtle decorative curved line patterns matching reference */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none select-none opacity-40"
        viewBox="0 0 1200 900"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M-50 900 C 150 700, 300 520, 520 400 C 720 290, 880 150, 950 -50"
          stroke="#F43F5E"
          strokeWidth="1.5"
          strokeOpacity="0.25"
          strokeLinecap="round"
        />
        <path
          d="M-80 820 C 120 630, 270 470, 480 360 C 680 260, 840 120, 920 -80"
          stroke="#F43F5E"
          strokeWidth="1.2"
          strokeOpacity="0.2"
          strokeLinecap="round"
        />
        <path
          d="M-110 740 C 90 560, 240 420, 440 320 C 640 230, 800 90, 890 -110"
          stroke="#F43F5E"
          strokeWidth="1"
          strokeOpacity="0.15"
          strokeLinecap="round"
        />
        <path
          d="M-140 660 C 60 490, 210 370, 400 280 C 600 200, 760 60, 860 -140"
          stroke="#F43F5E"
          strokeWidth="0.8"
          strokeOpacity="0.1"
          strokeLinecap="round"
        />
        {/* Soft ripple circles on top-left */}
        <circle cx="20" cy="140" r="320" stroke="#F43F5E" strokeWidth="1" strokeOpacity="0.08" />
        <circle cx="20" cy="140" r="420" stroke="#F43F5E" strokeWidth="1" strokeOpacity="0.05" />
      </svg>

      {/* Main Two-Column Container - Perfectly fitted to 100vh */}
      <div className="w-full max-w-[1160px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center relative z-10 my-auto">

        {/* ==================================================
            LEFT COLUMN: BRANDING & OFFICE ILLUSTRATION
            ================================================== */}
        <div className="lg:col-span-6 flex flex-col justify-between h-full py-1 lg:py-2 px-2 sm:px-4 lg:pr-2">

          {/* Top Row: Official Logo & Decorative Dot Grid */}
          <div className="flex items-start justify-between">
            <Link
              to="/"
              className="inline-flex items-center select-none transition-opacity hover:opacity-95 focus:outline-none"
              aria-label="designdec.in - Design, Decoration & Deliver"
            >
              <img
                src={logoImg}
                alt="designdec.in - Design, Decoration & Deliver"
                className="h-8 sm:h-9 lg:h-9 w-auto object-contain"
              />
            </Link>

            {/* 4x4 Coral Dot Grid Pattern */}
            <div
              className="grid grid-cols-4 gap-2 pt-0.5 select-none"
              aria-hidden="true"
            >
              {Array.from({ length: 16 }).map((_, i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-rose-400/70"
                />
              ))}
            </div>
          </div>

          {/* Headline & Subtitle */}
          <div className="mt-4 sm:mt-5 lg:mt-6 space-y-2">
            <h1 className="font-heading font-extrabold text-2xl sm:text-3xl lg:text-[34px] xl:text-[38px] tracking-tight text-slate-900 leading-[1.16]">
              Smart Office.
              <br />
              <span className="text-[#E70100]">Better</span> Management.
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 font-normal leading-relaxed max-w-sm">
              Manage your employees, attendance, leaves and office operations seamlessly in one place.
            </p>
          </div>

          {/* 3D Office Management Team Illustration */}
          <div className="my-3 lg:my-4 flex justify-center lg:justify-start">
            <img
              src={officeIllustration}
              alt="DesignDec Office Team Collaboration"
              className="w-full max-w-[320px] sm:max-w-[360px] lg:max-w-[380px] max-h-[190px] sm:max-h-[220px] lg:max-h-[240px] object-contain drop-shadow-[0_10px_20px_rgba(225,29,72,0.06)] select-none"
              draggable="false"
            />
          </div>

          {/* Copyright Footer */}
          <div className="pt-1 text-left">
            <p className="text-[11px] text-slate-400 font-medium tracking-wide">
              © 2026 DesignDec. All rights reserved.
            </p>
          </div>
        </div>

        {/* ==================================================
            RIGHT COLUMN: LARGE WHITE ROUNDED LOGIN PANEL
            ================================================== */}
        <div className="lg:col-span-6 w-full max-w-[460px] lg:max-w-[480px] mx-auto lg:ml-auto">
          <div className="bg-white rounded-[24px] sm:rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.02)] border border-rose-100/50 p-6 sm:p-8 lg:p-9 xl:p-10 transition-all">

            {/* Header */}
            <div className="text-center mb-6">
              <h2 className="font-heading font-bold text-2xl sm:text-[28px] text-slate-900 tracking-tight">
                Welcome Back!
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 font-normal">
                Sign in to continue to your account
              </p>
            </div>

            {/* Backend API Error Banner */}
            {error && (
              <div
                role="alert"
                className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/90 p-3 text-xs text-red-700 animate-in fade-in-50"
              >
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                <span className="flex-1 font-medium leading-relaxed">{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>

              {/* Employee ID Field */}
              <div className="space-y-1.5">
                <label
                  htmlFor="employeeId"
                  className="block text-xs sm:text-sm font-medium text-slate-800"
                >
                  Employee ID
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <input
                    id="employeeId"
                    type="text"
                    autoComplete="username"
                    placeholder="Enter your employee ID"
                    {...register("employeeId")}
                    className={cn(
                      "w-full rounded-xl border bg-white pl-10 pr-4 py-2.5 sm:py-3 text-sm text-slate-900 placeholder:text-slate-400",
                      "transition-all duration-150 outline-none",
                      "border-slate-200 hover:border-slate-300 focus:border-[#E70100] focus:ring-4 focus:ring-red-500/10",
                      errors.employeeId && "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                    )}
                  />
                </div>
                {errors.employeeId && (
                  <p className="text-xs font-medium text-red-600 mt-1">
                    {errors.employeeId.message}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs sm:text-sm font-medium text-slate-800"
                >
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    {...register("password")}
                    className={cn(
                      "w-full rounded-xl border bg-white pl-10 pr-10 py-2.5 sm:py-3 text-sm text-slate-900 placeholder:text-slate-400",
                      "transition-all duration-150 outline-none",
                      "border-slate-200 hover:border-slate-300 focus:border-[#E70100] focus:ring-4 focus:ring-red-500/10",
                      errors.password && "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" />
                    ) : (
                      <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs font-medium text-red-600 mt-1">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Remember Me & Forgot Password Row */}
              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs sm:text-sm text-slate-600 font-normal">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#E70100] focus:ring-[#E70100] accent-[#E70100] cursor-pointer"
                  />
                  <span>Remember Me</span>
                </label>

                <Link
                  to="/forgot-password"
                  className="text-xs sm:text-sm font-semibold text-[#E70100] hover:text-[#C00100] hover:underline transition-colors"
                >
                  Forgot Password?
                </Link>
              </div>

              {/* Login Button (DesignDec Red Primary CTA)"bg-[#E70100] */}
              <button
                type="submit"
                disabled={isActionLoading}
                className={cn(
                  "w-full mt-3 py-3 px-6 rounded-xl font-bold text-sm sm:text-base text-white",
                  "bg-[#E70100] hover:bg-[#D00100] active:scale-[0.99]",
                  "shadow-lg shadow-red-600/20 transition-all duration-150",
                  "flex items-center justify-center cursor-pointer",
                  "disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100"
                )}
              >
                {isActionLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </span>
                ) : (
                  "SignIn"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
