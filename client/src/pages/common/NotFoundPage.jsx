import { Link } from "react-router-dom";
import { AlertCircle, Home, ArrowLeft } from "lucide-react";
import Button from "../../components/ui/Button";

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-8 ring-rose-50/50 mb-4">
          <AlertCircle className="h-7 w-7" />
        </div>

        <span className="text-xs font-bold uppercase tracking-wider text-rose-600">
          404 Error
        </span>
        <h1 className="text-2xl font-bold text-slate-900 mt-1 mb-2 font-heading">
          Page Not Found
        </h1>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          The page you requested could not be found or has been moved. Please return to the dashboard.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="outline"
            onClick={() => window.history.back()}
            leftIcon={<ArrowLeft className="h-4 w-4" />}
          >
            Go Back
          </Button>
          <Link to="/">
            <Button
              variant="primary"
              className="w-full sm:w-auto"
              leftIcon={<Home className="h-4 w-4" />}
            >
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default NotFoundPage;
