"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Truck,
  GraduationCap,
  Map,
  Navigation,
  UserCheck,
  DollarSign,
} from "lucide-react";
import { COLLECTIONS } from "@/lib/collections";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
} from "firebase/firestore";
import { formatDistanceToNow, format } from "date-fns";
import { Route, Availability, FeePayment } from "@/types";
import { db } from "@/lib/firebase";
import {
  useMockData,
  mockDashboardStats,
  mockAvailabilitySummary,
  mockRecentActivity,
  mockPendingActions,
} from "@/lib/mock";

interface StatCardProps {
  title: string;
  value: number;
  subtitle: string;
  icon: React.ReactNode;
}

function StatCard({ title, value, subtitle, icon }: StatCardProps) {
  return (
    <Card className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-lg hover:scale-105 hover:bg-gray-50 transition-all duration-300 cursor-pointer">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
        </div>
        <div className="text-blue-600">{icon}</div>
      </div>
    </Card>
  );
}

interface AvailabilitySummary {
  routeId: string;
  routeName: string;
  available: number;
  notAvailable: number;
  noResponse: number;
  total: number;
}

interface ActivityItem {
  id: string;
  type: "payment" | "availability";
  description: string;
  timeAgo: string;
  initials: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalDrivers: 0,
    totalStudents: 0,
    activeRoutes: 0,
    todaysRides: 0,
  });

  const [availabilitySummary, setAvailabilitySummary] = useState<AvailabilitySummary[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [pendingActions, setPendingActions] = useState({
    unverifiedPayments: 0,
    pendingDrivers: 0,
  });

  useEffect(() => {
    if (!useMockData) return;
    setStats(mockDashboardStats);
    setAvailabilitySummary(mockAvailabilitySummary);
    setRecentActivity(mockRecentActivity);
    setPendingActions(mockPendingActions);
  }, []);

  const [[today, tomorrow]] = useState(() => {
    const now = new Date();
    const todayValue = now.toISOString().split("T")[0];
    const tomorrowValue = new Date(now.getTime() + 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    return [[todayValue, tomorrowValue]];
  });

  useEffect(() => {
    const firestore = db;
    if (useMockData) return;
    if (!firestore || !today) return;

    // Total Drivers
    const driversQuery = query(
      collection(firestore, COLLECTIONS.USERS),
      where("role", "==", "driver")
    );
    const unsubscribeDrivers = onSnapshot(driversQuery, (snapshot) => {
      setStats(prev => ({ ...prev, totalDrivers: snapshot.size }));
    });

    // Total Students
    const studentsQuery = query(
      collection(firestore, COLLECTIONS.USERS),
      where("role", "==", "student")
    );
    const unsubscribeStudents = onSnapshot(studentsQuery, (snapshot) => {
      setStats(prev => ({ ...prev, totalStudents: snapshot.size }));
    });

    // Active Routes
    const routesQuery = query(
      collection(firestore, COLLECTIONS.ROUTES),
      where("isActive", "==", true)
    );
    const unsubscribeRoutes = onSnapshot(routesQuery, (snapshot) => {
      setStats(prev => ({ ...prev, activeRoutes: snapshot.size }));
    });

    // Today's Rides
    const ridesQuery = query(
      collection(firestore, COLLECTIONS.RIDES),
      where("date", "==", today),
      where("status", "in", ["ongoing"])
    );
    const unsubscribeRides = onSnapshot(ridesQuery, (snapshot) => {
      setStats(prev => ({ ...prev, todaysRides: snapshot.size }));
    }, (error) => {
      console.error("Error fetching today's rides:", error);
    });

    return () => {
      unsubscribeDrivers();
      unsubscribeStudents();
      unsubscribeRoutes();
      unsubscribeRides();
    };
  }, [today]);

  useEffect(() => {
    const firestore = db;
    if (useMockData) return;
    if (!firestore || !tomorrow) return;

    // Availability Summary for tomorrow
    const availabilityQuery = query(
      collection(firestore, COLLECTIONS.AVAILABILITY),
      where("date", "==", tomorrow)
    );
    const unsubscribeAvailability = onSnapshot(availabilityQuery, (snapshot) => {
      const availabilities = snapshot.docs.map(doc => doc.data() as Availability);
      const routesQuery = query(collection(firestore, COLLECTIONS.ROUTES), where("isActive", "==", true));
      const unsubscribeRoutes = onSnapshot(routesQuery, (routesSnapshot) => {
        const routes = routesSnapshot.docs.map(doc => doc.data() as Route);
        const summary: AvailabilitySummary[] = routes.map(route => {
          const routeAvailabilities = availabilities.filter(a => a.routeId === route.routeId);
          const available = routeAvailabilities.filter(a => a.isAvailable).length;
          const notAvailable = routeAvailabilities.filter(a => !a.isAvailable).length;
          const noResponse = (route.studentIds?.length || 0) + (route.assignedDriverId ? 1 : 0) - routeAvailabilities.length;
          return {
            routeId: route.routeId,
            routeName: route.routeName,
            available,
            notAvailable,
            noResponse: Math.max(0, noResponse),
            total: (route.studentIds?.length || 0) + (route.assignedDriverId ? 1 : 0),
          };
        });
        setAvailabilitySummary(summary);
      }, (error) => {
        console.error("Error fetching routes for availability:", error);
      });

      return () => unsubscribeRoutes();
    }, (error) => {
      console.error("Error fetching availability:", error);
    });

    return () => unsubscribeAvailability();
  }, [tomorrow]);

  useEffect(() => {
    const firestore = db;
    if (useMockData) return;
    if (!firestore) return;

    // Recent Activity
    const paymentsQuery = query(
      collection(firestore, COLLECTIONS.FEE_PAYMENTS),
      orderBy("submittedAt", "desc"),
      limit(10)
    );
    const availabilityQuery = query(
      collection(firestore, COLLECTIONS.AVAILABILITY),
      orderBy("markedAt", "desc"),
      limit(5)
    );

    const unsubscribePayments = onSnapshot(paymentsQuery, (snapshot) => {
      const payments = snapshot.docs.map(doc => doc.data() as FeePayment);
      const paymentActivities: ActivityItem[] = payments.map(payment => ({
        id: payment.paymentId,
        type: "payment",
        description: `${payment.studentName} submitted payment for ${payment.month}`,
        timeAgo: formatDistanceToNow(payment.submittedAt.toDate(), { addSuffix: true }),
        initials: payment.studentName.split(' ').map(n => n[0]).join('').toUpperCase(),
      }));

      const unsubscribeAvailability = onSnapshot(availabilityQuery, (availSnapshot) => {
        const availabilities = availSnapshot.docs.map(doc => doc.data() as Availability);
        const availActivities: ActivityItem[] = availabilities.map(avail => ({
          id: avail.availabilityId,
          type: "availability",
          description: `${avail.userName} marked ${avail.isAvailable ? 'available' : 'unavailable'} for ${avail.date}`,
          timeAgo: formatDistanceToNow(avail.markedAt?.toDate() || new Date(), { addSuffix: true }),
          initials: avail.userName.split(' ').map(n => n[0]).join('').toUpperCase(),
        }));

        setRecentActivity([...paymentActivities, ...availActivities].slice(0, 15));
      });

      return () => unsubscribeAvailability();
    });

    return () => unsubscribePayments();
  }, []);

  useEffect(() => {
    const firestore = db;
    if (useMockData) return;
    if (!firestore) return;

    // Pending Actions
    const paymentsQuery = query(
      collection(firestore, COLLECTIONS.FEE_PAYMENTS),
      where("paymentStatus", "==", "pending")
    );
    const driversQuery = query(
      collection(firestore, COLLECTIONS.USERS),
      where("role", "==", "driver"),
      where("approved", "==", false)
    );

    const unsubscribePayments = onSnapshot(paymentsQuery, (snapshot) => {
      setPendingActions(prev => ({ ...prev, unverifiedPayments: snapshot.size }));
    });

    const unsubscribeDrivers = onSnapshot(driversQuery, (snapshot) => {
      setPendingActions(prev => ({ ...prev, pendingDrivers: snapshot.size }));
    });

    return () => {
      unsubscribePayments();
      unsubscribeDrivers();
    };
  }, []);

  return (
    <div className="space-y-6 p-6">
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Drivers"
          value={stats.totalDrivers}
          subtitle="Active drivers"
          icon={<Truck className="w-8 h-8" />}
        />
        <StatCard
          title="Total Students"
          value={stats.totalStudents}
          subtitle="Enrolled students"
          icon={<GraduationCap className="w-8 h-8" />}
        />
        <StatCard
          title="Active Routes"
          value={stats.activeRoutes}
          subtitle="Routes in operation"
          icon={<Map className="w-8 h-8" />}
        />
        <StatCard
          title="Today's Rides"
          value={stats.todaysRides}
          subtitle="Rides scheduled"
          icon={<Navigation className="w-8 h-8" />}
        />
      </div>

      {/* Availability Summary */}
      <Card className="bg-white border border-gray-200 rounded-lg shadow-sm hover:border-blue-300 transition-all duration-300 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Tomorrow&apos;s Availability Report - {format(new Date(), 'dd/MM/yyyy')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {availabilitySummary.map((route) => (
            <div key={route.routeId} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-medium">{route.routeName}</span>
                <span className="text-sm text-gray-600">
                  {route.available} available, {route.notAvailable} not available, {route.noResponse} no response
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${(route.available / route.total) * 100}%` }}
                ></div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card className="bg-white border border-gray-200 rounded-lg shadow-sm hover:border-blue-300 transition-all duration-300 animate-in fade-in-0 slide-in-from-left-4 duration-500">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((item) => (
                <div key={item.id} className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
                    {item.initials}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{item.description}</p>
                    <p className="text-xs text-gray-500">{item.timeAgo}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pending Actions */}
        <Card className="bg-white border border-gray-200 rounded-lg shadow-sm hover:border-blue-300 transition-all duration-300 animate-in fade-in-0 slide-in-from-right-4 duration-500">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Pending Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <DollarSign className="w-5 h-5 text-yellow-500" />
                <div>
                  <p className="font-medium">Unverified Payments</p>
                  <p className="text-sm text-gray-600">{pendingActions.unverifiedPayments} pending</p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="hover:bg-blue-50 hover:text-blue-700 transition-all duration-300" onClick={() => router.push('/dashboard/payments')}>
                Review
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <UserCheck className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="font-medium">Driver Approvals</p>
                  <p className="text-sm text-gray-600">{pendingActions.pendingDrivers} pending</p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="hover:bg-blue-50 hover:text-blue-700 transition-all duration-300" onClick={() => router.push('/dashboard/drivers')}>
                Approve
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}