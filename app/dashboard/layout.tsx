'use client';

import { useState } from 'react';
import Sidebar from "@/components/dashboard/Sidebar";
import Header from "@/components/dashboard/Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="flex min-h-screen">
      <Sidebar isHovered={isHovered} setIsHovered={setIsHovered} />
      <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${isHovered ? 'md:ml-[260px]' : 'md:ml-16'}`}>
        <Header />
        <main className="flex-1 p-6 pb-24 md:pb-6 bg-[#F8F9FA]">
          {children}
        </main>
      </div>
    </div>
  );
}
