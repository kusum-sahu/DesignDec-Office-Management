import { Outlet, useLocation } from "react-router-dom";
import BrandLogo from "../components/layout/BrandLogo";

export function AuthLayout() {
  const location = useLocation();
  const isLoginPage = location.pathname === "/login";

  // Login page implements the complete standalone two-column reference layout
  if (isLoginPage) {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-gradient-to-br from-rose-50/50 via-white to-rose-50/30 selection:bg-rose-100 selection:text-rose-900">
      <header className="w-full px-6 py-5 flex items-center justify-between">
        <BrandLogo />
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </main>

      <footer className="w-full py-5 px-6 text-center text-xs text-slate-400">
        <p>© 2026 DesignDec. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default AuthLayout;
