"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Truck,
  GraduationCap,
  Map,
  Navigation,
  Calendar,
  CreditCard,
  Radio,
  AlertTriangle,
  Bus,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Drivers", href: "/dashboard/drivers", icon: Truck },
  { label: "Students", href: "/dashboard/students", icon: GraduationCap },
  { label: "Routes", href: "/dashboard/routes", icon: Map },
  { label: "Rides", href: "/dashboard/rides", icon: Navigation },
  { label: "Availability", href: "/dashboard/availability", icon: Calendar },
  { label: "Payments", href: "/dashboard/payments", icon: CreditCard },
  { label: "Live Tracking", href: "/dashboard/tracking", icon: Radio },
  { label: "SOS Alerts", href: "/dashboard/sos", icon: AlertTriangle },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="fixed left-0 top-0 h-screen w-[260px] bg-[#1A3C5E] overflow-y-auto">
      {/* Logo Section */}
      <div className="p-6 flex items-center gap-3 border-b border-white border-opacity-10">
        <Bus className="w-8 h-8 text-white" />
        <h1 className="text-white font-bold text-lg">TOSMS Admin</h1>
      </div>

      {/* Navigation Items */}
      <nav className="p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? "bg-white bg-opacity-15 text-white"
                  : "text-white text-opacity-70 hover:bg-white hover:bg-opacity-8"
              }`}
            >
              <Icon className="w-[18px] h-[18px]" />
              <span className={isActive ? "font-medium" : ""}>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
