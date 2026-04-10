'use client';

import Sidebar from "@/components/dashboard/Sidebar";
import Header from "@/components/dashboard/Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 ml-[260px] flex flex-col">
        <Header />
        <main className="flex-1 p-6 bg-[#F8F9FA]">
          {children}
        </main>
      </div>
    </div>
  );
}