"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS } from "@/lib/collections";

import { useMockData, mockPayments } from "@/lib/mock";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Payment = any;

const tabs = ["All", "Pending", "Verified"];

// ✅ Safe Date
const formatDate = (t: any) => {
  if (!t || !t.seconds) return "-";
  return new Date(t.seconds * 1000).toLocaleDateString();
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [activeTab, setActiveTab] = useState("All");
  const [selected, setSelected] = useState<Payment | null>(null);

  // 🔥 DATA SOURCE
  useEffect(() => {
    if (useMockData) {
      setPayments(
        mockPayments.map((p) => ({
          ...p,
          id: p.paymentId,
        }))
      );
      return;
    }

    const unsub = onSnapshot(
      collection(db, COLLECTIONS.FEE_PAYMENTS),
      (snap) => {
        const data = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setPayments(data);
      }
    );

    return () => unsub();
  }, []);

  // 🔥 FILTER
  const filtered = payments.filter((p) => {
    if (activeTab === "Pending") return p.paymentStatus === "pending";
    if (activeTab === "Verified") return p.paymentStatus === "verified";
    return true;
  });

  // 🔥 STATS
  const total = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const pending = payments.filter((p) => p.paymentStatus === "pending").length;
  const verified = payments.filter((p) => p.paymentStatus === "verified").length;

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="flex justify-between flex-wrap gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Payments</h1>

        <div className="flex gap-4 flex-wrap">
          <Card className="shadow-md hover:shadow-xl transition">
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">Total</p>
              <h2 className="text-xl font-bold">PKR {total}</h2>
            </CardContent>
          </Card>

          <Card className="shadow-md hover:shadow-xl transition">
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">Pending</p>
              <h2 className="text-xl font-bold">{pending}</h2>
            </CardContent>
          </Card>

          <Card className="shadow-md hover:shadow-xl transition">
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">Verified</p>
              <h2 className="text-xl font-bold">{verified}</h2>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* FILTER */}
      <div className="flex gap-2">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-2 rounded-full transition ${
              activeTab === t
                ? "bg-black text-white"
                : "bg-gray-200 hover:bg-gray-300"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* TABLE */}
      <Card className="shadow-md">
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-gray-500">
                <th className="p-2">Student</th>
                <th>Route</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => setSelected(p)}
                  className="border-b hover:bg-gray-50 cursor-pointer transition"
                >
                  <td className="p-2 font-medium">{p.studentName}</td>
                  <td>{p.routeId}</td>
                  <td>PKR {p.amount}</td>

                  <td>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        p.paymentStatus === "verified"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {p.paymentStatus}
                    </span>
                  </td>

                  <td>{formatDate(p.submittedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* MODAL */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl w-[90%] md:w-[500px] shadow-xl">
            <h2 className="text-lg font-bold mb-4">Payment Details</h2>

            <p><b>Name:</b> {selected.studentName}</p>
            <p><b>Amount:</b> PKR {selected.amount}</p>
            <p><b>Method:</b> {selected.paymentMethod}</p>
            <p><b>Date:</b> {formatDate(selected.submittedAt)}</p>

            <div className="mt-4 text-center text-gray-400">
              No receipt preview
            </div>

            <div className="flex gap-4 mt-6">
              <button className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700 transition">
                Verify
              </button>
              <button className="flex-1 bg-red-600 text-white py-2 rounded hover:bg-red-700 transition">
                Reject
              </button>
            </div>

            <button
              onClick={() => setSelected(null)}
              className="mt-4 text-sm text-gray-500"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* CHART */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Revenue</CardTitle>
        </CardHeader>

        <CardContent className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={payments}>
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="amount" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}