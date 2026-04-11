"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { collection, onSnapshot } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { COLLECTIONS } from "@/lib/collections";

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

const tabs = [
  "All",
  "Pending Verification",
  "Verified",
  "This Month",
  "Last Month",
];

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [activeTab, setActiveTab] = useState("All");
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  // 🔥 REALTIME FIREBASE (READ ONLY)
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, COLLECTIONS.FEE_PAYMENTS),
      (snapshot) => {
        const data = snapshot.docs.map((doc) => {
  const d = doc.data();

  return {
    id: doc.id,
    studentName: d.studentName || "Unknown",
    routeId: d.routeId || "-",
    month: d.month || "-",
    amount: d.amount || 0,
    paymentMethod: d.paymentMethod || "-",
    submittedAt: d.submittedAt || "-",
    paymentStatus: d.paymentStatus || "pending",
    transactionId: d.transactionId || "",
    receiptImageUrl: d.receiptImageUrl || "",
  };
});
        setPayments(data);
      }
    );

    return () => unsub();
  }, []);

  // 🔥 FILTER LOGIC
const filtered = payments.filter((p) => {
  if (!p) return false;

  if (activeTab === "Pending Verification") {
    return p?.paymentStatus === "pending";
  }

  if (activeTab === "Verified") {
    return p?.paymentStatus === "verified";
  }

  return true;
});

  // 🔥 STATS
  const totalCollected = payments
    .filter((p) => p.paymentStatus === "verified")
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const pendingCount = payments.filter(
    (p) => p.paymentStatus === "pending"
  ).length;

  const verifiedCount = payments.filter(
    (p) => p.paymentStatus === "verified"
  ).length;

  // ✅ READ-ONLY VERIFY
  const handleVerify = async (p: Payment) => {
    console.log("Verify clicked:", p);
    setSelectedPayment(null);
  };

  // ✅ READ-ONLY REJECT
  const handleReject = async (p: Payment) => {
    console.log("Reject clicked:", p);
    setSelectedPayment(null);
  };

  // 🔥 CHART DATA
  const chartData = Object.values(
    payments
      .filter((p) => p.paymentStatus === "verified")
      .reduce((acc: any, p) => {
        const month = p.month || "Unknown";
        if (!acc[month]) acc[month] = { month, total: 0 };
        acc[month].total += p.amount || 0;
        return acc;
      }, {})
  );

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          Payments — {new Date().toLocaleString("default", { month: "long" })}
        </h1>

        <div className="flex gap-4">
          <Card>
            <CardContent className="p-4">PKR {totalCollected}</CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">Pending {pendingCount}</CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">Verified {verifiedCount}</CardContent>
          </Card>
        </div>
      </div>

      {/* FILTER */}
      <div className="flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded ${
              activeTab === tab ? "bg-black text-white" : "bg-gray-200"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* TABLE */}
      <Card>
        <CardHeader>
          <CardTitle>Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="p-2">Student</th>
                <th className="p-2">Route</th>
                <th className="p-2">Month</th>
                <th className="p-2">Amount</th>
                <th className="p-2">Method</th>
                <th className="p-2">Submitted</th>
                <th className="p-2">Status</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  className="border-b cursor-pointer"
                  onClick={() => setSelectedPayment(p)}
                >
                  <td className="p-2 flex items-center gap-2">
                    <div className="w-8 h-8 bg-gray-300 rounded-full" />
                    {p.studentName}
                  </td>
                  <td className="p-2">{p.routeId}</td>
                  <td className="p-2">{p.month}</td>
                  <td className="p-2">PKR {p.amount}</td>
                  <td className="p-2">{p.paymentMethod}</td>
                  <td className="p-2">{p.submittedAt}</td>
                  <td className="p-2">{p.paymentStatus}</td>

                  <td className="p-2">
                    {p.paymentStatus === "pending" && (
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleVerify(p);
                          }}
                          className="text-green-600"
                        >
                          Verify
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReject(p);
                          }}
                          className="text-red-600"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* MODAL */}
      {selectedPayment && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl w-[700px]">
            <h2 className="text-lg font-bold mb-4">Payment Verification</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p><b>Student:</b> {selectedPayment.studentName}</p>
                <p><b>Amount:</b> PKR {selectedPayment.amount}</p>
                <p><b>Method:</b> {selectedPayment.paymentMethod}</p>
                <p><b>Transaction ID:</b> {selectedPayment.transactionId}</p>
              </div>

              <div>
                {selectedPayment.receiptImageUrl ? (
                  <Image
                    src={selectedPayment.receiptImageUrl}
                    alt="receipt"
                    width={300}
                    height={200}
                    className="rounded"
                  />
                ) : (
                  <p>No image</p>
                )}
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={() => handleVerify(selectedPayment)}
                className="bg-green-600 text-white px-4 py-2 rounded"
              >
                Verify Payment
              </button>

              <button
                onClick={() => handleReject(selectedPayment)}
                className="bg-red-600 text-white px-4 py-2 rounded"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHART */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Revenue</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}