import { create } from "zustand";

const THEME_STORAGE_KEY = "designdec-theme";

export const applyThemeToDocument = (theme) => {
  if (typeof window === "undefined") return;
  const root = document.documentElement;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = theme === "Dark" || (theme === "System" && prefersDark);

  if (isDark) {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
};

const getInitialTheme = () => {
  if (typeof window === "undefined") return "Light";
  return localStorage.getItem(THEME_STORAGE_KEY) || "Light";
};

// Apply initial theme on load
if (typeof window !== "undefined") {
  const initial = getInitialTheme();
  applyThemeToDocument(initial);

  // Listen to OS system color changes
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  mediaQuery.addEventListener("change", () => {
    const currentStored = localStorage.getItem(THEME_STORAGE_KEY) || "Light";
    if (currentStored === "System") {
      applyThemeToDocument("System");
    }
  });
}

export const useUIStore = create((set) => ({
  isSidebarCollapsed: false,
  isMobileDrawerOpen: false,
  activeBranch: null, // null means "All Branches" for Admin
  theme: getInitialTheme(),

  toggleSidebar: () =>
    set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),

  setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),

  toggleMobileDrawer: () =>
    set((state) => ({ isMobileDrawerOpen: !state.isMobileDrawerOpen })),

  setMobileDrawerOpen: (open) => set({ isMobileDrawerOpen: open }),

  setActiveBranch: (branch) => set({ activeBranch: branch }),

  setTheme: (theme) => {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    applyThemeToDocument(theme);
    set({ theme });
  },
}));

export default useUIStore;
