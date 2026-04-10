"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users,
  Download,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Minus,
  Car,
  User,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { COLLECTIONS } from "@/lib/collections";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
} from "firebase/firestore";
import { format, addDays, isAfter, setHours, setMinutes } from "date-fns";
import { Availability, Route } from "@/types";

interface RouteAvailability {
  route: Route;
  driverAvailability?: Availability;
  studentAvailabilities: Availability[];
  totalStudents: number;
}

interface SummaryStats {
  totalStudents: number;
  availableStudents: number;
  notAvailableStudents: number;
  noResponseStudents: number;
  availableDrivers: number;
  totalDrivers: number;
}

export default function AvailabilityPage() {
  const todayDate = format(new Date(), "yyyy-MM-dd");
  const tomorrowDate = format(addDays(new Date(), 1), "yyyy-MM-dd");
  const [customDate, setCustomDate] = useState(todayDate);
  const [selectedDate, setSelectedDate] = useState(todayDate);
  const [activeTab, setActiveTab] = useState<"today" | "tomorrow" | "custom">("today");
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(!!db);

  const handleTabChange = (tab: "today" | "tomorrow" | "custom") => {
    setActiveTab(tab);

    if (tab === "today") {
      setSelectedDate(todayDate);
    } else if (tab === "tomorrow") {
      setSelectedDate(tomorrowDate);
    } else {
      setSelectedDate(customDate);
    }
  };

  const handleCustomDateChange = (value: string) => {
    setCustomDate(value);
    setSelectedDate(value);
    setActiveTab("custom");
  };

  // Check if Firebase is configured
  const isFirebaseConfigured = !!db;

  // Fetch routes
  useEffect(() => {
    if (!db) return;

    const unsubscribe = onSnapshot(
      query(collection(db, COLLECTIONS.ROUTES), where("isActive", "==", true)),
      (snapshot) => {
        const routesData = snapshot.docs.map(doc => doc.data() as Route);
        setRoutes(routesData);
      },
      (error) => {
        console.error("Error fetching routes:", error);
      }
    );

    return unsubscribe;
  }, []);

  // Fetch availabilities for selected date
  useEffect(() => {
    if (!db || !selectedDate) return;

    const unsubscribe = onSnapshot(
      query(
        collection(db, COLLECTIONS.AVAILABILITY),
        where("date", "==", selectedDate),
        orderBy("markedAt", "desc")
      ),
      (snapshot) => {
        const availabilitiesData = snapshot.docs.map(doc => doc.data() as Availability);
        setAvailabilities(availabilitiesData);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching availabilities:", error);
      }
    );

    return unsubscribe;
  }, [selectedDate]);

  const routeAvailabilities = useMemo<RouteAvailability[]>(() => {
    return routes.map(route => {
      const routeAvailabilities = availabilities.filter(a => a.routeId === route.routeId);
      const driverAvailability = routeAvailabilities.find(a => a.role === "driver");
      const studentAvailabilities = routeAvailabilities.filter(a => a.role === "student");

      return {
        route,
        driverAvailability,
        studentAvailabilities,
        totalStudents: route.studentIds?.length || 0,
      };
    });
  }, [routes, availabilities]);

  const summaryStats = useMemo<SummaryStats>(() => {
    const allStudents = routeAvailabilities.reduce((sum, ra) => sum + ra.totalStudents, 0);
    const availableStudents = availabilities.filter(a => a.role === "student" && a.isAvailable).length;
    const notAvailableStudents = availabilities.filter(a => a.role === "student" && !a.isAvailable).length;
    const noResponseStudents = allStudents - availableStudents - notAvailableStudents;
    const totalDrivers = routes.filter(r => r.assignedDriverId).length;
    const availableDrivers = availabilities.filter(
      a => a.role === "driver" && a.isAvailable && a.vehicleAvailable
    ).length;

    return {
      totalStudents: allStudents,
      availableStudents,
      notAvailableStudents,
      noResponseStudents,
      availableDrivers,
      totalDrivers,
    };
  }, [routes, availabilities, routeAvailabilities]);

  const getAvailabilityBadge = (availability?: Availability) => {
    if (!availability) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          <Minus className="w-3 h-3 mr-1" />
          Not Marked
        </span>
      );
    }

    if (availability.role === "driver") {
      if (availability.isAvailable && availability.vehicleAvailable) {
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Available
          </span>
        );
      } else {
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Not Available
          </span>
        );
      }
    }

    if (availability.isAvailable) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Available
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <XCircle className="w-3 h-3 mr-1" />
          Not Available
        </span>
      );
    }
  };

  const getStudentAvailability = (studentId: string, routeAvailabilities: Availability[]) => {
    return routeAvailabilities.find(a => a.userId === studentId);
  };

  const shouldShowDriverWarning = (driverAvailability?: Availability) => {
    if (!driverAvailability) {
      const now = new Date();
      const tenPM = setMinutes(setHours(new Date(), 22), 0);
      return isAfter(now, tenPM);
    }
    return false;
  };

  const exportRouteCSV = (routeAvailability: RouteAvailability) => {
    const csvData = [
      ["Student Name", "Availability", "Note", "Marked At"],
      ...routeAvailability.studentAvailabilities.map(availability => [
        availability.userName,
        availability.isAvailable ? "Available" : "Not Available",
        availability.note || "",
        availability.markedAt ? format(new Date(availability.markedAt.seconds * 1000), "MMM dd, yyyy HH:mm") : "",
      ])
    ];

    const csvContent = csvData.map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${routeAvailability.route.routeName}_availability_${selectedDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatMarkedTime = (markedAt: Availability["markedAt"]) => {
    if (!markedAt) return "";
    return format(new Date(markedAt.seconds * 1000), "HH:mm");
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading availability data...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Firebase Configuration Warning */}
      {!isFirebaseConfigured && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <XCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Firebase Not Configured
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>
                  Please add your Firebase configuration values to the <code>.env.local</code> file to enable database functionality.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Availability Dashboard</h1>
        <div className="text-sm text-gray-600">
          Real-time updates • Last updated: {format(new Date(), "HH:mm:ss")}
        </div>
      </div>

      {/* Date Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="flex space-x-2">
              <button
                onClick={() => handleTabChange("today")}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  activeTab === "today"
                    ? "bg-blue-100 text-blue-800 border border-blue-200"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Today
              </button>
              <button
                onClick={() => handleTabChange("tomorrow")}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  activeTab === "tomorrow"
                    ? "bg-blue-100 text-blue-800 border border-blue-200"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Tomorrow
              </button>
              <button
                onClick={() => handleTabChange("custom")}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  activeTab === "custom"
                    ? "bg-blue-100 text-blue-800 border border-blue-200"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Custom Date
              </button>
            </div>

            {activeTab === "custom" && (
              <Input
                type="date"
                value={customDate}
                onChange={(e) => handleCustomDateChange(e.target.value)}
                className="w-40"
              />
            )}

            <div className="text-lg font-semibold">
              {format(new Date(selectedDate), "EEEE, MMMM dd, yyyy")}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Students</p>
                <p className="text-2xl font-bold">{summaryStats.totalStudents}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Available</p>
                <p className="text-2xl font-bold text-green-600">{summaryStats.availableStudents}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-sm text-gray-600">Not Available</p>
                <p className="text-2xl font-bold text-red-600">{summaryStats.notAvailableStudents}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Minus className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-sm text-gray-600">No Response</p>
                <p className="text-2xl font-bold text-gray-600">{summaryStats.noResponseStudents}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Car className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Drivers Available</p>
                <p className="text-2xl font-bold text-green-600">{summaryStats.availableDrivers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <User className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Drivers</p>
                <p className="text-2xl font-bold">{summaryStats.totalDrivers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Route Availability Cards */}
      <div className="space-y-4">
        {routeAvailabilities.map((routeAvailability) => {
          const availableCount = routeAvailability.studentAvailabilities.filter(a => a.isAvailable).length;
          const progressPercentage = routeAvailability.totalStudents > 0
            ? (availableCount / routeAvailability.totalStudents) * 100
            : 0;

          return (
            <Card key={routeAvailability.route.routeId}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <CardTitle className="text-lg">{routeAvailability.route.routeName}</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Car className="w-4 h-4" />
                      <span className="text-sm text-gray-600">Driver:</span>
                      {getAvailabilityBadge(routeAvailability.driverAvailability)}
                    </div>
                  </div>
                  <Button
                    onClick={() => exportRouteCSV(routeAvailability)}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </div>

                {/* Driver Warning */}
                {shouldShowDriverWarning(routeAvailability.driverAvailability) && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3">
                    <div className="flex items-center">
                      <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                      <span className="text-sm text-red-800 font-medium">
                        Driver has not marked availability yet (past 10 PM)
                      </span>
                    </div>
                  </div>
                )}

                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span>Student Availability Progress</span>
                    <span>{availableCount} of {routeAvailability.totalStudents} available</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progressPercentage}%` }}
                    ></div>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="space-y-3">
                  {routeAvailability.route.studentIds?.map((studentId) => {
                    const studentAvailability = getStudentAvailability(studentId, routeAvailability.studentAvailabilities);
                    const studentName = studentAvailability?.userName || `Student ${studentId.slice(-4)}`;

                    return (
                      <div key={studentId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <User className="w-4 h-4 text-gray-600" />
                          <div>
                            <p className="font-medium">{studentName}</p>
                            {studentAvailability?.note && (
                              <p className="text-sm text-gray-600">{studentAvailability.note}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getAvailabilityBadge(studentAvailability)}
                          {studentAvailability?.markedAt && (
                            <span className="text-xs text-gray-500">
                              {formatMarkedTime(studentAvailability.markedAt)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {(!routeAvailability.route.studentIds || routeAvailability.route.studentIds.length === 0) && (
                    <div className="text-center py-8 text-gray-500">
                      No students assigned to this route
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {routeAvailabilities.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              No active routes found
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
