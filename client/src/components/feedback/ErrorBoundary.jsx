import { Component } from "react";
import { AlertOctagon, RefreshCw } from "lucide-react";
import Button from "../ui/Button";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("DesignDec UI Error Boundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600 ring-8 ring-red-50/50 mb-4">
              <AlertOctagon className="h-7 w-7" />
            </div>

            <h2 className="text-xl font-bold text-slate-900 mb-2">
              Application Render Error
            </h2>
            <p className="text-sm text-slate-500 mb-4 leading-relaxed">
              An unexpected error occurred in the user interface. You can reload the page or return to the dashboard.
            </p>
            {import.meta.env.DEV && this.state.error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-mono rounded text-left overflow-auto max-h-48 whitespace-pre-wrap">
                <strong>Error: </strong>{this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                leftIcon={<RefreshCw className="h-4 w-4" />}
              >
                Reload Page
              </Button>
              <Button variant="primary" onClick={this.handleReset}>
                Go to Dashboard
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
