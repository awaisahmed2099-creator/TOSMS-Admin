"use client";

import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

const pageNames: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/drivers": "Drivers",
  "/dashboard/students": "Students",
  "/dashboard/routes": "Routes",
  "/dashboard/rides": "Rides",
  "/dashboard/availability": "Availability",
  "/dashboard/payments": "Payments",
  "/dashboard/tracking": "Live Tracking",
  "/dashboard/sos": "SOS Alerts",
};

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const pageTitle = pageNames[pathname] || "Dashboard";

  const handleLogout = () => {
    // Clear any auth tokens/session
    localStorage.removeItem("adminToken");
    router.push("/login");
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-40">
      {/* Page Title */}
      <h2 className="text-2xl font-bold text-gray-800">{pageTitle}</h2>

      {/* Admin Info & Logout */}
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
          <span className="text-gray-700 font-semibold text-sm">A</span>
        </div>

        {/* Admin Name */}
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-800">Admin</span>
          <span className="text-xs text-gray-500">admin@test.com</span>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="ml-4 p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900"
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
