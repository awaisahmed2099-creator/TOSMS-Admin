"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  CreditCard,
  Smartphone,
  Building2,
  Eye,
  Check,
  X,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { COLLECTIONS } from "@/lib/collections";
import {
  collection,
  query,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  where,
  orderBy,
  addDoc,
} from "firebase/firestore";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { FeePayment, Route } from "@/types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import Image from "next/image";

type FilterType = "all" | "pending" | "verified" | "thisMonth" | "lastMonth";

interface PaymentWithRoute extends FeePayment {
  routeName?: string;
}

interface MonthlyRevenue {
  month: string;
  revenue: number;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentWithRoute[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedPayment, setSelectedPayment] = useState<PaymentWithRoute | null>(null);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenue[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const currentMonth = format(new Date(), "MMMM yyyy");

  useEffect(() => {
    if (!db) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Fetch routes for route names
    const routesQuery = query(collection(db, COLLECTIONS.ROUTES));
    const unsubscribeRoutes = onSnapshot(routesQuery, (snapshot) => {
      const routesData = snapshot.docs.map(doc => ({ ...doc.data(), routeId: doc.id } as Route));
      setRoutes(routesData);
    });

    return () => unsubscribeRoutes();
  }, []);

  useEffect(() => {
    if (!db) {
      setIsLoading(false);
      return;
    }

    // Fetch payments with real-time updates
    const paymentsQuery = query(
      collection(db, COLLECTIONS.FEE_PAYMENTS),
      orderBy("submittedAt", "desc")
    );
    const unsubscribePayments = onSnapshot(paymentsQuery, (snapshot) => {
      const paymentsData = snapshot.docs.map(doc => doc.data() as FeePayment);
      setPayments(paymentsData);
      setIsLoading(false);
    });

    return () => unsubscribePayments();
  }, []);

  useEffect(() => {
    if (!db) return;

    // Calculate monthly revenue for last 6 months
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const date = subMonths(new Date(), i);
      return {
        month: format(date, "MMM yyyy"),
        start: startOfMonth(date),
        end: endOfMonth(date),
      };
    }).reverse();

    const paymentsQuery = query(
      collection(db, COLLECTIONS.FEE_PAYMENTS),
      where("paymentStatus", "==", "verified")
    );

    const unsubscribeRevenue = onSnapshot(paymentsQuery, (snapshot) => {
      const verifiedPayments = snapshot.docs.map(doc => doc.data() as FeePayment);

      const revenueData = last6Months.map(({ month, start, end }) => {
        const monthPayments = verifiedPayments.filter(payment => {
          const paymentDate = payment.verifiedAt?.toDate();
          return paymentDate && paymentDate >= start && paymentDate <= end;
        });

        const revenue = monthPayments.reduce((sum, payment) => sum + payment.amount, 0);

        return { month, revenue };
      });

      setMonthlyRevenue(revenueData);
    });

    return () => unsubscribeRevenue();
  }, []);

  // Combine payments with route names
  const paymentsWithRoutes = payments.map(payment => ({
    ...payment,
    routeName: routes.find(r => r.routeId === payment.routeId)?.routeName || "Unknown Route",
  }));

  const filteredPayments = paymentsWithRoutes.filter(payment => {
    const now = new Date();
    const thisMonth = format(now, "yyyy-MM");
    const lastMonth = format(subMonths(now, 1), "yyyy-MM");

    switch (filter) {
      case "pending":
        return payment.paymentStatus === "pending";
      case "verified":
        return payment.paymentStatus === "verified";
      case "thisMonth":
        return payment.month === thisMonth;
      case "lastMonth":
        return payment.month === lastMonth;
      default:
        return true;
    }
  });

  const stats = {
    totalCollected: payments
      .filter(p => p.paymentStatus === "verified")
      .reduce((sum, p) => sum + p.amount, 0),
    pendingCount: payments.filter(p => p.paymentStatus === "pending").length,
    verifiedCount: payments.filter(p => p.paymentStatus === "verified").length,
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case "bank":
        return <Building2 className="w-4 h-4" />;
      case "easypaisa":
        return <Smartphone className="w-4 h-4" />;
      case "jazzcash":
        return <Smartphone className="w-4 h-4" />;
      default:
        return <CreditCard className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "verified":
        return <Badge variant="secondary" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Verified</Badge>;
      case "rejected":
        return <Badge variant="secondary" className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleVerifyPayment = async (payment?: PaymentWithRoute) => {
    const paymentToVerify = payment || selectedPayment;
    if (!paymentToVerify || !db) return;

    setIsProcessing(true);
    try {
      await updateDoc(doc(db, COLLECTIONS.FEE_PAYMENTS, paymentToVerify.paymentId), {
        paymentStatus: "verified",
        verifiedAt: serverTimestamp(),
      });
      setShowVerificationModal(false);
      setSelectedPayment(null);
    } catch (error) {
      console.error("Error verifying payment:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectPayment = async () => {
    if (!selectedPayment || !db) return;

    setIsProcessing(true);
    try {
      await updateDoc(doc(db, COLLECTIONS.FEE_PAYMENTS, selectedPayment.paymentId), {
        paymentStatus: "rejected",
        rejectionReason: rejectionReason || "Payment rejected by admin",
      });
      setShowVerificationModal(false);
      setSelectedPayment(null);
      setRejectionReason("");
    } catch (error) {
      console.error("Error rejecting payment:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const openVerificationModal = (payment: PaymentWithRoute) => {
    setSelectedPayment(payment);
    setShowVerificationModal(true);
    setRejectionReason("");
  };

  if (!db) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Firebase Configuration Required</h1>
          <p className="text-gray-600">Please check your environment variables for Firebase configuration.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-600">{currentMonth}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">PKR {stats.totalCollected.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Verified payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Verification</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingCount}</div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.verifiedCount}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Revenue (Last 6 Months)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyRevenue}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => [`PKR ${value}`, "Revenue"]} />
              <Bar dataKey="revenue" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Filter Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {[
          { key: "all", label: "All" },
          { key: "pending", label: "Pending Verification" },
          { key: "verified", label: "Verified" },
          { key: "thisMonth", label: "This Month" },
          { key: "lastMonth", label: "Last Month" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as FilterType)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === tab.key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Records</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading payment records...</p>
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No payments found</h3>
              <p className="text-gray-600 mb-6">
                {filter === "all"
                  ? "No payment records have been submitted yet."
                  : `No ${filter === "pending" ? "pending" : filter === "verified" ? "verified" : filter.toLowerCase()} payments found.`
                }
              </p>
              {process.env.NODE_ENV === "development" && (
                <div className="flex space-x-2 justify-center">
                  <Button
                    onClick={async () => {
                      if (!db) return;
                      try {
                        // Create sample route data first
                        const sampleRoutes = [
                          {
                            routeName: "Gulberg to LUMS",
                            description: "Morning route from Gulberg to LUMS University",
                            stops: [
                              { stopName: "Gulberg Chowk", order: 1, coordinates: { latitude: 31.5204, longitude: 74.3587 } },
                              { stopName: "Liberty Market", order: 2, coordinates: { latitude: 31.5224, longitude: 74.3607 } },
                              { stopName: "LUMS University", order: 3, coordinates: { latitude: 31.4704, longitude: 74.4067 } }
                            ],
                            assignedDriverId: "driver1",
                            assignedDriverName: "Muhammad Ahmed",
                            studentIds: ["student1", "student3"],
                            departureTime: "07:00",
                            returnTime: "15:00",
                            feeAmount: 2500,
                            isActive: true,
                            createdAt: serverTimestamp()
                          },
                          {
                            routeName: "Johar Town to PUCIT",
                            description: "Afternoon route from Johar Town to PUCIT",
                            stops: [
                              { stopName: "Johar Town", order: 1, coordinates: { latitude: 31.4697, longitude: 74.2728 } },
                              { stopName: "Model Town", order: 2, coordinates: { latitude: 31.4833, longitude: 74.3244 } },
                              { stopName: "PUCIT University", order: 3, coordinates: { latitude: 31.4815, longitude: 74.3035 } }
                            ],
                            assignedDriverId: "driver2",
                            assignedDriverName: "Ali Khan",
                            studentIds: ["student2"],
                            departureTime: "08:00",
                            returnTime: "16:00",
                            feeAmount: 2500,
                            isActive: true,
                            createdAt: serverTimestamp()
                          }
                        ];

                        for (const route of sampleRoutes) {
                          await addDoc(collection(db, COLLECTIONS.ROUTES), route);
                        }

                        alert("Sample route data added successfully!");
                      } catch (error) {
                        console.error("Error adding sample routes:", error);
                        alert("Error adding sample routes. Check console for details.");
                      }
                    }}
                    variant="outline"
                    className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                  >
                    Add Sample Routes
                  </Button>
                  <Button
                    onClick={async () => {
                      if (!db) return;
                      try {
                        // Create sample payment data for testing
                        const samplePayments = [
                          {
                            studentId: "student1",
                            studentName: "Ahmed Khan",
                            routeId: "route1",
                            month: format(new Date(), "yyyy-MM"),
                            amount: 2500,
                            paymentMethod: "bank",
                            paymentStatus: "pending",
                            challanNumber: "CH001234",
                            submittedAt: serverTimestamp(),
                            receiptImageUrl: "https://via.placeholder.com/400x600?text=Sample+Receipt"
                          },
                          {
                            studentId: "student2",
                            studentName: "Fatima Ali",
                            routeId: "route2",
                            month: format(subMonths(new Date(), 1), "yyyy-MM"),
                            amount: 2500,
                            paymentMethod: "easypaisa",
                            paymentStatus: "verified",
                            transactionId: "EP123456789",
                            submittedAt: serverTimestamp(),
                            verifiedAt: serverTimestamp()
                          },
                          {
                            studentId: "student3",
                          studentName: "Muhammad Usman",
                            routeId: "route1",
                            month: format(new Date(), "yyyy-MM"),
                            amount: 2500,
                            paymentMethod: "jazzcash",
                            paymentStatus: "pending",
                            transactionId: "JC987654321",
                            submittedAt: serverTimestamp()
                          }
                        ];

                        for (const payment of samplePayments) {
                          await addDoc(collection(db, COLLECTIONS.FEE_PAYMENTS), payment);
                        }

                        alert("Sample payment data added successfully!");
                      } catch (error) {
                        console.error("Error adding sample data:", error);
                        alert("Error adding sample data. Check console for details.");
                      }
                    }}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Add Sample Payments
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Month</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((payment) => (
                  <TableRow
                    key={payment.paymentId}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => openVerificationModal(payment)}
                  >
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
                          {payment.studentName.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </div>
                        <span className="font-medium">{payment.studentName}</span>
                      </div>
                    </TableCell>
                    <TableCell>{payment.routeName}</TableCell>
                    <TableCell>{format(new Date(payment.month + "-01"), "MMM yyyy")}</TableCell>
                    <TableCell>PKR {payment.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getPaymentMethodIcon(payment.paymentMethod)}
                        <span className="capitalize">{payment.paymentMethod}</span>
                      </div>
                    </TableCell>
                    <TableCell>{format(payment.submittedAt.toDate(), "MMM dd, yyyy")}</TableCell>
                    <TableCell>{getStatusBadge(payment.paymentStatus)}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {payment.paymentStatus === "pending" && (
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 border-green-600 hover:bg-green-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleVerifyPayment(payment);
                            }}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Verify
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-600 hover:bg-red-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPayment(payment);
                              setShowVerificationModal(true);
                            }}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Verification Modal */}
      <Dialog open={showVerificationModal} onOpenChange={setShowVerificationModal}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Payment Verification</DialogTitle>
          </DialogHeader>

          {selectedPayment && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Side - Payment Details */}
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Student Information</Label>
                  <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                    <p className="font-medium">{selectedPayment.studentName}</p>
                    <p className="text-sm text-gray-600">Route: {selectedPayment.routeName}</p>
                    <p className="text-sm text-gray-600">Month: {format(new Date(selectedPayment.month + "-01"), "MMMM yyyy")}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Payment Details</Label>
                  <div className="mt-2 space-y-2">
                    <div className="flex justify-between">
                      <span>Amount:</span>
                      <span className="font-medium">PKR {selectedPayment.amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Method:</span>
                      <span className="capitalize">{selectedPayment.paymentMethod}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Submitted:</span>
                      <span>{format(selectedPayment.submittedAt.toDate(), "MMM dd, yyyy HH:mm")}</span>
                    </div>
                    {selectedPayment.challanNumber && (
                      <div className="flex justify-between">
                        <span>Challan Number:</span>
                        <span>{selectedPayment.challanNumber}</span>
                      </div>
                    )}
                    {selectedPayment.transactionId && (
                      <div className="flex justify-between">
                        <span>Transaction ID:</span>
                        <span>{selectedPayment.transactionId}</span>
                      </div>
                    )}
                  </div>
                </div>

                {selectedPayment.paymentStatus === "rejected" && selectedPayment.rejectionReason && (
                  <div>
                    <Label className="text-sm font-medium">Rejection Reason</Label>
                    <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-800">{selectedPayment.rejectionReason}</p>
                    </div>
                  </div>
                )}

                {selectedPayment.paymentStatus === "pending" && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="rejectionReason" className="text-sm font-medium">
                        Rejection Reason (Optional)
                      </Label>
                      <Input
                        id="rejectionReason"
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Enter reason for rejection..."
                        className="mt-1"
                      />
                    </div>

                    <div className="flex space-x-3">
                      <Button
                        onClick={() => handleVerifyPayment()}
                        disabled={isProcessing}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        {isProcessing ? "Processing..." : "Verify Payment"}
                      </Button>
                      <Button
                        onClick={handleRejectPayment}
                        disabled={isProcessing}
                        variant="destructive"
                        className="flex-1"
                      >
                        <X className="w-4 h-4 mr-2" />
                        {isProcessing ? "Processing..." : "Reject Payment"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Side - Receipt/Transaction Details */}
              <div>
                <Label className="text-sm font-medium">Payment Proof</Label>
                <div className="mt-2">
                  {selectedPayment.paymentMethod.toLowerCase() === "bank" && selectedPayment.receiptImageUrl ? (
                    <div className="border rounded-lg overflow-hidden">
                      <Image
                        src={selectedPayment.receiptImageUrl}
                        alt="Payment Receipt"
                        width={400}
                        height={600}
                        className="w-full h-auto"
                      />
                    </div>
                  ) : selectedPayment.transactionId ? (
                    <div className="p-4 bg-gray-50 rounded-lg text-center">
                      <Smartphone className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600">Transaction ID</p>
                      <p className="text-lg font-mono font-medium">{selectedPayment.transactionId}</p>
                    </div>
                  ) : (
                    <div className="p-4 bg-gray-50 rounded-lg text-center">
                      <Eye className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600">No payment proof available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
