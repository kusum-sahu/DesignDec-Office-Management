import { create } from "zustand";

export const useUIStore = create((set) => ({
  isSidebarCollapsed: false,
  isMobileDrawerOpen: false,
  activeBranch: null, // null means "All Branches" for Admin

  toggleSidebar: () =>
    set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),

  setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),

  toggleMobileDrawer: () =>
    set((state) => ({ isMobileDrawerOpen: !state.isMobileDrawerOpen })),

  setMobileDrawerOpen: (open) => set({ isMobileDrawerOpen: open }),

  setActiveBranch: (branch) => set({ activeBranch: branch }),
}));

export default useUIStore;
