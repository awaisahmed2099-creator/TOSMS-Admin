"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
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
  Menu,
  X,
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

export default function Sidebar({ isHovered, setIsHovered }: { isHovered: boolean; setIsHovered: (hovered: boolean) => void }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const renderLabel = (label: string) => (
    <span
      className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out ${
        isHovered ? "max-w-[160px] opacity-100" : "max-w-0 opacity-0"
      }`}
    >
      {label}
    </span>
  );

  return (
    <>
      <aside
        className="hidden md:flex fixed left-0 top-0 h-screen flex-col bg-[#1A3C5E] text-white shadow-xl transition-all duration-300 ease-in-out overflow-hidden"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ width: isHovered ? 260 : 64 }}
      >
        <div className="flex items-center gap-3 p-6 border-b border-white/10">
          <Bus className="w-7 h-7 text-white" />
          {renderLabel("TOSMS Admin")}
        </div>

        <nav className="flex-1 p-3 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 rounded-xl px-3 py-3 transition-all duration-300 ease-in-out ${
                  isActive
                    ? "bg-white bg-opacity-15 text-white"
                    : "text-white text-opacity-80 hover:bg-white hover:bg-opacity-10"
                }`}
              >
                <Icon className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
                <span
                  className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out ${
                    isHovered || isActive ? "max-w-[140px] opacity-100" : "max-w-0 opacity-0"
                  } ${isActive ? "font-medium" : ""}`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="fixed left-4 top-4 z-50 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-900 shadow-lg transition hover:bg-gray-100"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {mobileOpen ? (
          <div className="fixed inset-0 z-40 flex">
            <div className="w-72 bg-[#1A3C5E] text-white shadow-2xl transition-transform duration-300 ease-in-out">
              <div className="flex items-center justify-between p-5 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <Bus className="w-6 h-6" />
                  <span className="text-lg font-semibold">TOSMS Admin</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-900 hover:bg-gray-100"
                  aria-label="Close navigation menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
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
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-300 ease-in-out ${
                        isActive
                          ? "bg-white bg-opacity-15 text-white"
                          : "text-white text-opacity-80 hover:bg-white hover:bg-opacity-10"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
            <button
              type="button"
              className="flex-1 bg-black/40"
              aria-label="Close navigation overlay"
              onClick={() => setMobileOpen(false)}
            />
          </div>
        ) : null}

        <nav className="fixed bottom-0 inset-x-0 z-30 flex items-center justify-between gap-2 border-t border-slate-200 bg-white px-3 py-2 shadow-t-lg">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex shrink-0 flex-col items-center justify-center gap-1 rounded-2xl px-3 py-2 text-xs transition-all duration-300 ease-in-out ${
                  isActive
                    ? "bg-blue-50 text-slate-900"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
                <span className="hidden">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
