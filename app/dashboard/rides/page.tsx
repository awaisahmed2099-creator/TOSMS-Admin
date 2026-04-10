"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle,
  X,
  Eye,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { COLLECTIONS } from "@/lib/collections";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
} from "firebase/firestore";
import { format } from "date-fns";
import { Ride, Route, User } from "@/types";

interface RideWithDetails extends Ride {
  availableStudents?: number;
  reachedStopsCount?: number;
}

export default function RidesPage() {
  const [rides, setRides] = useState<RideWithDetails[]>([]);
  const [todaysRides, setTodaysRides] = useState<RideWithDetails[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedRide, setSelectedRide] = useState<RideWithDetails | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    routeId: "",
    date: format(new Date(), "yyyy-MM-dd"),
    departureTime: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if Firebase is configured
  const isFirebaseConfigured = !!db;

  useEffect(() => {
    if (!db) return;

    const today = format(new Date(), "yyyy-MM-dd");

    // Fetch all rides ordered by date desc
    const ridesQuery = query(
      collection(db, COLLECTIONS.RIDES),
      orderBy("date", "desc")
    );
    const unsubscribeRides = onSnapshot(ridesQuery, (snapshot) => {
      const ridesData = snapshot.docs.map(doc => ({
        ...doc.data(),
        rideId: doc.id
      } as RideWithDetails));

      setRides(ridesData);

      // Filter today's rides
      const todays = ridesData.filter(ride => ride.date === today);
      setTodaysRides(todays);
    });

    // Fetch routes
    const routesQuery = query(
      collection(db, COLLECTIONS.ROUTES),
      where("isActive", "==", true)
    );
    const unsubscribeRoutes = onSnapshot(routesQuery, (snapshot) => {
      const routesData = snapshot.docs.map(doc => doc.data() as Route);
      setRoutes(routesData);
    });

    return () => {
      unsubscribeRides();
      unsubscribeRoutes();
    };
  }, []);

  const selectedRoute = routes.find(r => r.routeId === formData.routeId);

  useEffect(() => {
    // Auto-fill departure time when route is selected
    if (selectedRoute?.departureTime) {
      setFormData(prev => ({ ...prev, departureTime: selectedRoute.departureTime! }));
    }
  }, [selectedRoute]);

  const handleScheduleRide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !selectedRoute) {
      console.error("Firebase database not initialized or route not selected.");
      alert("Database not connected or route not selected.");
      return;
    }

    setIsSubmitting(true);
    try {
      const newRide = {
        routeId: selectedRoute.routeId,
        routeName: selectedRoute.routeName,
        assignedDriverId: selectedRoute.assignedDriverId || "",
        driverName: selectedRoute.assignedDriverName || "",
        status: "scheduled" as const,
        date: formData.date,
        departureTime: formData.departureTime,
        studentIds: selectedRoute.studentIds || [],
        reachedStops: [],
        boardedStudents: [],
        createdAt: serverTimestamp(),
      };

      console.log("Scheduling ride:", newRide);
      const docRef = await addDoc(collection(db, COLLECTIONS.RIDES), newRide);
      console.log("Ride scheduled successfully with ID:", docRef.id);

      // Reset form
      setFormData({
        routeId: "",
        date: format(new Date(), "yyyy-MM-dd"),
        departureTime: "",
      });
      setShowScheduleModal(false);
      alert("Ride scheduled successfully!");
    } catch (error) {
      console.error("Error scheduling ride:", error);
      alert(`Error scheduling ride: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Scheduled
          </span>
        );
      case "active":
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Active
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Completed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Unknown
          </span>
        );
    }
  };

  const handleViewDetails = (ride: RideWithDetails) => {
    setSelectedRide(ride);
    setShowDetailsModal(true);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Firebase Configuration Warning */}
      {!isFirebaseConfigured && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <X className="h-5 w-5 text-red-400" />
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
        <div className="flex items-center space-x-2">
          <h1 className="text-2xl font-bold">Rides</h1>
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {rides.length}
          </span>
        </div>
        <Button onClick={() => setShowScheduleModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Schedule Ride
        </Button>
      </div>

      {/* Today's Rides Section */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Today's Rides</h2>
        {todaysRides.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-gray-500">
              No rides scheduled for today
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {todaysRides.map((ride) => (
              <Card key={ride.rideId} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-lg">{ride.routeName}</h3>
                    {getStatusBadge(ride.status)}
                  </div>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-2" />
                      Driver: {ride.driverName || "Not assigned"}
                    </div>
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-2" />
                      Departure: {ride.departureTime || "Not set"}
                    </div>
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-2" />
                      Available Students: {ride.studentIds?.length || 0}
                    </div>
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-2" />
                      Stops Completed: {ride.reachedStops?.length || 0}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Rides History Table */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Rides History</h2>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Students Available</TableHead>
                  <TableHead>Stops Completed</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rides.map((ride) => (
                  <TableRow
                    key={ride.rideId}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleViewDetails(ride)}
                  >
                    <TableCell>{format(new Date(ride.date), "MMM dd, yyyy")}</TableCell>
                    <TableCell>{ride.routeName}</TableCell>
                    <TableCell>{ride.driverName || "Not assigned"}</TableCell>
                    <TableCell>{getStatusBadge(ride.status)}</TableCell>
                    <TableCell>{ride.studentIds?.length || 0}</TableCell>
                    <TableCell>{ride.reachedStops?.length || 0}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetails(ride);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Schedule Ride Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Schedule Ride</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowScheduleModal(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <form onSubmit={handleScheduleRide} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Route *
                  </label>
                  <select
                    required
                    value={formData.routeId}
                    onChange={(e) => setFormData(prev => ({ ...prev, routeId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a route</option>
                    {routes.map((route) => (
                      <option key={route.routeId} value={route.routeId}>
                        {route.routeName} - Driver: {route.assignedDriverName || "Not assigned"}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date *
                  </label>
                  <Input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Departure Time
                  </label>
                  <Input
                    type="time"
                    value={formData.departureTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, departureTime: e.target.value }))}
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowScheduleModal(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Scheduling..." : "Schedule Ride"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Ride Details Modal */}
      {showDetailsModal && selectedRide && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Ride Details</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDetailsModal(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Route</label>
                    <p className="text-lg font-medium">{selectedRide.routeName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Status</label>
                    <div className="mt-1">{getStatusBadge(selectedRide.status)}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Date</label>
                    <p>{format(new Date(selectedRide.date), "MMMM dd, yyyy")}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Departure Time</label>
                    <p>{selectedRide.departureTime || "Not set"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Driver</label>
                    <p>{selectedRide.driverName || "Not assigned"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Students Available</label>
                    <p>{selectedRide.studentIds?.length || 0}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Stops Reached</label>
                  {selectedRide.reachedStops && selectedRide.reachedStops.length > 0 ? (
                    <div className="space-y-2">
                      {selectedRide.reachedStops.map((stop: any, index: number) => (
                        <div key={index} className="flex items-center p-2 bg-green-50 rounded">
                          <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                          <span>{stop.stopName || `Stop ${index + 1}`}</span>
                          <span className="ml-auto text-sm text-gray-500">
                            {stop.timestamp ? format(new Date(stop.timestamp), "HH:mm") : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No stops reached yet</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Boarded Students</label>
                  {selectedRide.boardedStudents && selectedRide.boardedStudents.length > 0 ? (
                    <div className="space-y-2">
                      {selectedRide.boardedStudents.map((studentId: string, index: number) => (
                        <div key={index} className="flex items-center p-2 bg-blue-50 rounded">
                          <Users className="w-4 h-4 text-blue-600 mr-2" />
                          <span>Student ID: {studentId}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No students boarded yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
