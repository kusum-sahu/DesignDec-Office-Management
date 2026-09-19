import { Outlet } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import MobileDrawer from "../components/layout/MobileDrawer";

export function DashboardLayout() {
  return (
    <div className="h-screen w-screen bg-[#FED7DE] bg-gradient-to-br from-[#FED9E0] via-[#FDE0E6] to-[#FCD3DC] flex overflow-hidden selection:bg-rose-200 selection:text-rose-900">
      {/* Desktop Collapsible Sidebar (Fixed full height on left) */}
      <Sidebar />

      {/* Mobile / Tablet Drawer */}
      <MobileDrawer />

      {/* Main App Container (Scrollable area with pinned Header) */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto overflow-x-hidden relative">
        <Header />

        {/* Ambient background glows matching Login visual language with deeper soft pink radiance */}
        <div
          className="fixed top-0 right-0 w-[650px] h-[650px] bg-gradient-to-bl from-rose-300/40 via-rose-200/30 to-transparent rounded-full blur-3xl pointer-events-none -translate-y-1/4 translate-x-1/4 z-0"
          aria-hidden="true"
        />
        <div
          className="fixed bottom-0 right-1/4 w-[520px] h-[520px] bg-rose-200/40 rounded-full blur-3xl pointer-events-none translate-y-1/3 z-0"
          aria-hidden="true"
        />
        <div
          className="fixed top-1/4 left-64 w-[420px] h-[420px] bg-rose-300/25 rounded-full blur-3xl pointer-events-none -translate-x-1/2 z-0"
          aria-hidden="true"
        />

        {/* Subtle decorative curved line patterns matching Login page */}
        <svg
          className="fixed inset-0 w-full h-full pointer-events-none select-none opacity-30 z-0"
          viewBox="0 0 1200 900"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M-50 900 C 150 700, 300 520, 520 400 C 720 290, 880 150, 950 -50"
            stroke="#F43F5E"
            strokeWidth="1.8"
            strokeOpacity="0.3"
            strokeLinecap="round"
          />
          <path
            d="M-80 820 C 120 630, 270 470, 480 360 C 680 260, 840 120, 920 -80"
            stroke="#F43F5E"
            strokeWidth="1.4"
            strokeOpacity="0.25"
            strokeLinecap="round"
          />
          <path
            d="M-110 740 C 90 560, 240 420, 440 320 C 640 230, 800 90, 890 -110"
            stroke="#F43F5E"
            strokeWidth="1.2"
            strokeOpacity="0.2"
            strokeLinecap="round"
          />
          <path
            d="M-140 660 C 60 490, 210 370, 400 280 C 600 200, 760 60, 860 -140"
            stroke="#F43F5E"
            strokeWidth="1"
            strokeOpacity="0.15"
            strokeLinecap="round"
          />
          {/* Soft ripple circles on top-left */}
          <circle cx="20" cy="140" r="320" stroke="#F43F5E" strokeWidth="1.2" strokeOpacity="0.12" />
          <circle cx="20" cy="140" r="420" stroke="#F43F5E" strokeWidth="1" strokeOpacity="0.08" />
        </svg>

        {/* Dashboard Content Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto relative z-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
