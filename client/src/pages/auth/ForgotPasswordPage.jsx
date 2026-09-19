import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { Mail, User, KeyRound, ArrowLeft, AlertCircle } from "lucide-react";
import authApi from "../../api/auth.api";
import { forgotPasswordSchema, resetPasswordSchema } from "../../schemas/auth.schema";
import { getErrorMessage } from "../../utils/errorHandler";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/Card";
import { toast } from "../../utils/toast";

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: request OTP, 2: reset password
  const [savedEmail, setSavedEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  // Form for requesting OTP
  const step1Form = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { employeeId: "", email: "" },
  });

  // Form for resetting password with OTP
  const step2Form = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: "",
      otp: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onStep1Submit = async (data) => {
    try {
      setLoading(true);
      setApiError("");
      const res = await authApi.forgotPassword(data);

      setSavedEmail(data.email);
      step2Form.setValue("email", data.email);
      setStep(2);

      toast.success("OTP Sent!", {
        description: res.message || "Please check your registered email address.",
      });
    } catch (err) {
      setApiError(getErrorMessage(err, "Failed to send OTP. Please check your details."));
    } finally {
      setLoading(false);
    }
  };

  const onStep2Submit = async (data) => {
    try {
      setLoading(true);
      setApiError("");
      const res = await authApi.resetPassword(data);

      toast.success("Password Reset Successful!", {
        description: res.message || "You can now log in with your new password.",
      });

      navigate("/login");
    } catch (err) {
      setApiError(getErrorMessage(err, "Failed to reset password."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full border-slate-200/90 shadow-xl bg-white rounded-2xl overflow-hidden">
      <CardHeader className="space-y-2 text-center pb-2 pt-8 sm:px-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-8 ring-rose-50/50">
          <KeyRound className="h-6 w-6" />
        </div>
        <CardTitle as="h1" className="text-2xl font-bold text-slate-900 tracking-tight">
          {step === 1 ? "Password Recovery" : "Enter Verification Code"}
        </CardTitle>
        <CardDescription className="text-sm text-slate-500">
          {step === 1
            ? "Enter your Employee ID and email to receive a recovery OTP"
            : `We sent a 6-digit code to ${savedEmail}`}
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6 sm:p-8 pt-4">
        {apiError && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50/80 p-3.5 text-xs text-red-700 animate-in fade-in-50">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
            <div className="flex-1 font-medium">{apiError}</div>
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={step1Form.handleSubmit(onStep1Submit)} className="space-y-4">
            <Input
              label="Employee ID"
              placeholder="e.g. DD001"
              leftIcon={<User className="h-4 w-4" />}
              error={step1Form.formState.errors.employeeId?.message}
              required
              {...step1Form.register("employeeId")}
            />

            <Input
              label="Registered Email"
              type="email"
              placeholder="name@designdec.in"
              leftIcon={<Mail className="h-4 w-4" />}
              error={step1Form.formState.errors.email?.message}
              required
              {...step1Form.register("email")}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={loading}
              className="w-full mt-2 font-semibold shadow-md shadow-rose-600/20"
            >
              Send Reset Code
            </Button>
          </form>
        ) : (
          <form onSubmit={step2Form.handleSubmit(onStep2Submit)} className="space-y-4">
            <Input
              label="6-Digit OTP"
              placeholder="123456"
              maxLength={6}
              error={step2Form.formState.errors.otp?.message}
              required
              className="text-center tracking-widest font-mono text-lg"
              {...step2Form.register("otp")}
            />

            <Input
              label="New Password"
              type="password"
              placeholder="At least 8 characters"
              error={step2Form.formState.errors.newPassword?.message}
              required
              {...step2Form.register("newPassword")}
            />

            <Input
              label="Confirm New Password"
              type="password"
              placeholder="Re-enter new password"
              error={step2Form.formState.errors.confirmPassword?.message}
              required
              {...step2Form.register("confirmPassword")}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={loading}
              className="w-full mt-2 font-semibold shadow-md shadow-rose-600/20"
            >
              Update Password
            </Button>

            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full text-center text-xs text-slate-500 hover:text-slate-800 transition-colors py-1 cursor-pointer"
            >
              Didn't get code? Send again
            </button>
          </form>
        )}

        <div className="mt-6 border-t border-slate-100 pt-4 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Sign In</span>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default ForgotPasswordPage;
