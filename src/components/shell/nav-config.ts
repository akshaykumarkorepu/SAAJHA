import type { DemoRole } from "@/lib/types";

export interface NavLink {
  href: string;
  label: string;
}

const EXPLORE = { href: "/explore", label: "Explore" };

export const NAV_BY_ROLE: Record<DemoRole, NavLink[]> = {
  student: [EXPLORE, { href: "/bookings", label: "My bookings" }, { href: "/passport", label: "Skill Passport" }],
  student2: [EXPLORE, { href: "/bookings", label: "My bookings" }, { href: "/passport", label: "Skill Passport" }],
  partner: [EXPLORE, { href: "/bookings", label: "My bookings" }],
  owner: [EXPLORE, { href: "/owner", label: "Owner console" }],
  manager: [EXPLORE, { href: "/manager", label: "Manager desk" }],
  admin: [EXPLORE, { href: "/admin", label: "Admin & ledger" }],
};

export const ROLE_LABEL: Record<DemoRole, string> = {
  student: "Student",
  student2: "Student 2",
  partner: "Partner college",
  owner: "Owner",
  manager: "Manager",
  admin: "Admin",
};
