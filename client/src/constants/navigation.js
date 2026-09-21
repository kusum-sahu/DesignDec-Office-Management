import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  ShoppingBag,
  Bell,
  User,
  BarChart3,
  Settings,
} from "lucide-react";
import { ROLES } from "./roles";

export const NAVIGATION_ITEMS = [
  {
    title: "Dashboard",
    path: "/",
    icon: LayoutDashboard,
    roles: [ROLES.ADMIN, ROLES.BRANCH_ADMIN, ROLES.EMPLOYEE],
    badge: null,
  },
  {
    title: "Orders & Pipeline",
    employeeTitle: "Orders",
    path: "/orders",
    icon: ShoppingBag,
    roles: [ROLES.ADMIN, ROLES.BRANCH_ADMIN, ROLES.EMPLOYEE],
    badge: null,
  },
  {
    title: "Attendance",
    path: "/attendance",
    icon: CalendarCheck,
    roles: [ROLES.ADMIN, ROLES.BRANCH_ADMIN, ROLES.EMPLOYEE],
    badge: null,
  },
  {
    title: "Employees",
    path: "/employees",
    icon: Users,
    roles: [ROLES.ADMIN, ROLES.BRANCH_ADMIN],
    badge: null,
  },
  {
    title: "Notifications",
    path: "/notifications",
    icon: Bell,
    roles: [ROLES.ADMIN, ROLES.BRANCH_ADMIN, ROLES.EMPLOYEE],
    badge: "unread",
  },
  {
    title: "Reports",
    path: "/reports",
    icon: BarChart3,
    roles: [ROLES.ADMIN],
    badge: null,
  },
  {
    title: "My Profile",
    path: "/profile",
    icon: User,
    roles: [ROLES.ADMIN, ROLES.BRANCH_ADMIN, ROLES.EMPLOYEE],
    badge: null,
  },
  {
    title: "Settings",
    path: "/settings",
    icon: Settings,
    roles: [ROLES.ADMIN, ROLES.BRANCH_ADMIN, ROLES.EMPLOYEE],
    badge: null,
  },
];
