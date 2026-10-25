import {
  Bot,
  CalendarClock,
  FileBarChart,
  LayoutGrid,
  Megaphone,
  Settings,
  Sparkles,
  Swords,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV: { section: string; items: NavItem[] }[] = [
  { section: "Home", items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutGrid }] },
  {
    section: "Analytics",
    items: [
      { href: "/clients", label: "Clients", icon: Users },
      { href: "/campaigns", label: "Campaigns", icon: Megaphone },
      { href: "/ads", label: "Ads", icon: Sparkles },
    ],
  },
  {
    section: "Research",
    items: [
      { href: "/creative-intelligence", label: "Creative Intelligence", icon: Bot },
      { href: "/competitors", label: "Competitors", icon: Swords },
    ],
  },
  {
    section: "Operations",
    items: [
      { href: "/reports", label: "Reports", icon: FileBarChart },
      { href: "/automations", label: "Automations", icon: CalendarClock },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
