"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Plus,
  Clock,
  DollarSign,
  Users,
  Truck,
  Edit,
  X,
  ToggleLeft,
  ToggleRight,
  UserMinus,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { COLLECTIONS } from "@/lib/collections";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { Route, User } from "@/types";
import dynamic from "next/dynamic";

// Dynamically import map component to avoid SSR issues
const RouteMap = dynamic(() => import("@/components/RouteMap"), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">Loading map...</div>
});

interface RouteWithStats extends Route {
  studentCount: number;
  driverName?: string;
  driverAvatar?: string;
}

export default function RoutesPage() {
  const [routes, setRoutes] = useState<RouteWithStats[]>([]);
  const [drivers, setDrivers] = useState<User[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<RouteWithStats | null>(null);

  // Create route form state
  const [routeFormData, setRouteFormData] = useState({
    routeName: "",
    description: "",
    departureTime: "",
    returnTime: "",
    feeAmount: "",
  });
  const [stops, setStops] = useState<Array<{ stopName: string; latitude: string; longitude: string }>>([
    { stopName: "", latitude: "", longitude: "" }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if Firebase is configured
  const isFirebaseConfigured = !!db;

  useEffect(() => {
    if (!db) return;

    // Fetch routes
    const routesQuery = query(collection(db, COLLECTIONS.ROUTES));
    const unsubscribeRoutes = onSnapshot(routesQuery, (snapshot) => {
      const routesData = snapshot.docs.map(doc => ({ ...doc.data(), routeId: doc.id } as Route));

      // Enrich routes with stats
      const enrichedRoutes = routesData.map(route => {
        const studentCount = route.studentIds?.length || 0;
        return {
          ...route,
          studentCount,
        } as RouteWithStats;
      });

      setRoutes(enrichedRoutes);
    });

    // Fetch drivers
    const driversQuery = query(
      collection(db, COLLECTIONS.USERS),
      where("role", "==", "driver"),
      where("approved", "==", true)
    );
    const unsubscribeDrivers = onSnapshot(driversQuery, (snapshot) => {
      const driversData = snapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as User));
      setDrivers(driversData);
    });

    // Fetch students
    const studentsQuery = query(
      collection(db, COLLECTIONS.USERS),
      where("role", "==", "student")
    );
    const unsubscribeStudents = onSnapshot(studentsQuery, (snapshot) => {
      const studentsData = snapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as User));
      setStudents(studentsData);
    });

    return () => {
      unsubscribeRoutes();
      unsubscribeDrivers();
      unsubscribeStudents();
    };
  }, []);

  // Update routes with driver information
  const routesWithDrivers = routes.map(route => {
    const driver = drivers.find(d => d.uid === route.assignedDriverId);
    return {
      ...route,
      driverName: driver?.fullName,
      driverAvatar: driver?.fullName?.split(' ').map(n => n[0]).join('').toUpperCase(),
    };
  });

  const handleCreateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) {
      alert("Database not connected. Please check your Firebase configuration.");
      return;
    }

    // Validate stops
    const validStops = stops.filter(stop =>
      stop.stopName.trim() && stop.latitude && stop.longitude
    );

    if (validStops.length === 0) {
      alert("Please add at least one stop with valid coordinates.");
      return;
    }

    setIsSubmitting(true);
    try {
      const newRoute = {
        routeName: routeFormData.routeName,
        description: routeFormData.description || undefined,
        stops: validStops.map(stop => ({
          stopName: stop.stopName,
          order: validStops.indexOf(stop),
          coordinates: {
            latitude: parseFloat(stop.latitude),
            longitude: parseFloat(stop.longitude),
          },
        })),
        departureTime: routeFormData.departureTime || undefined,
        returnTime: routeFormData.returnTime || undefined,
        feeAmount: parseFloat(routeFormData.feeAmount) || undefined,
        isActive: true,
        createdAt: serverTimestamp(),
        studentIds: [],
      };

      console.log("Creating route:", newRoute);
      const docRef = await addDoc(collection(db, COLLECTIONS.ROUTES), newRoute);
      console.log("Route created successfully with ID:", docRef.id);

      // Reset form
      setRouteFormData({
        routeName: "",
        description: "",
        departureTime: "",
        returnTime: "",
        feeAmount: "",
      });
      setStops([{ stopName: "", latitude: "", longitude: "" }]);
      setShowCreateModal(false);
      alert("Route created successfully!");
    } catch (error) {
      console.error("Error creating route:", error);
      alert(`Error creating route: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addStop = () => {
    setStops([...stops, { stopName: "", latitude: "", longitude: "" }]);
  };

  const updateStop = (index: number, field: string, value: string) => {
    const newStops = [...stops];
    newStops[index] = { ...newStops[index], [field]: value };
    setStops(newStops);
  };

  const removeStop = (index: number) => {
    if (stops.length > 1) {
      setStops(stops.filter((_, i) => i !== index));
    }
  };

  const handleToggleActive = async (routeId: string, isActive: boolean) => {
    if (!db) return;

    const routeRef = doc(db, COLLECTIONS.ROUTES, routeId);
    await updateDoc(routeRef, {
      isActive: !isActive,
    });
  };

  const handleAssignDriver = async (routeId: string, driverId: string) => {
    if (!db) return;

    const routeRef = doc(db, COLLECTIONS.ROUTES, routeId);
    const driver = drivers.find(d => d.uid === driverId);

    await updateDoc(routeRef, {
      assignedDriverId: driverId,
      assignedDriverName: driver?.fullName,
    });
  };

  const handleAddStudent = async (routeId: string, studentId: string) => {
    if (!db) return;

    const routeRef = doc(db, COLLECTIONS.ROUTES, routeId);
    await updateDoc(routeRef, {
      studentIds: arrayUnion(studentId),
    });

    // Update student
    const studentRef = doc(db, COLLECTIONS.USERS, studentId);
    await updateDoc(studentRef, {
      routeId,
    });
  };

  const handleRemoveStudent = async (routeId: string, studentId: string) => {
    if (!db) return;

    const routeRef = doc(db, COLLECTIONS.ROUTES, routeId);
    await updateDoc(routeRef, {
      studentIds: arrayRemove(studentId),
    });

    // Update student
    const studentRef = doc(db, COLLECTIONS.USERS, studentId);
    await updateDoc(studentRef, {
      routeId: null,
      pickupStop: null,
    });
  };

  const openRouteDetail = (route: RouteWithStats) => {
    setSelectedRoute(route);
    setShowDetailPanel(true);
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
        <h1 className="text-2xl font-bold">Routes</h1>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Route
        </Button>
      </div>

      {/* Routes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {routesWithDrivers.map((route) => (
          <Card
            key={route.routeId}
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => openRouteDetail(route)}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{route.routeName}</CardTitle>
                <div
                  className="flex items-center space-x-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleActive(route.routeId, route.isActive);
                  }}
                >
                  {route.isActive ? (
                    <ToggleRight className="w-6 h-6 text-green-500" />
                  ) : (
                    <ToggleLeft className="w-6 h-6 text-gray-400" />
                  )}
                  <span className={`text-sm ${route.isActive ? 'text-green-600' : 'text-gray-500'}`}>
                    {route.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Assigned Driver */}
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
                  {route.driverAvatar || <Truck className="w-4 h-4" />}
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {route.driverName || "No driver assigned"}
                  </p>
                  <p className="text-xs text-gray-500">Driver</p>
                </div>
              </div>

              {/* Student Count */}
              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium">{route.studentCount} students</p>
                  <p className="text-xs text-gray-500">Enrolled</p>
                </div>
              </div>

              {/* Times and Fee */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="font-medium">{route.departureTime || "Not set"}</p>
                    <p className="text-gray-500">Departure</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="font-medium">
                      {route.feeAmount ? `PKR ${route.feeAmount}` : "Not set"}
                    </p>
                    <p className="text-gray-500">Fee</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Route Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Create New Route</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <form onSubmit={handleCreateRoute} className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Route Name *
                    </label>
                    <Input
                      type="text"
                      required
                      value={routeFormData.routeName}
                      onChange={(e) => setRouteFormData(prev => ({ ...prev, routeName: e.target.value }))}
                      placeholder="Enter route name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fee Amount (PKR)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={routeFormData.feeAmount}
                      onChange={(e) => setRouteFormData(prev => ({ ...prev, feeAmount: e.target.value }))}
                      placeholder="Enter fee amount"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Departure Time
                    </label>
                    <Input
                      type="time"
                      value={routeFormData.departureTime}
                      onChange={(e) => setRouteFormData(prev => ({ ...prev, departureTime: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Return Time
                    </label>
                    <Input
                      type="time"
                      value={routeFormData.returnTime}
                      onChange={(e) => setRouteFormData(prev => ({ ...prev, returnTime: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    value={routeFormData.description}
                    onChange={(e) => setRouteFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter route description"
                  />
                </div>

                {/* Stops Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium">Route Stops</h3>
                    <Button type="button" variant="outline" size="sm" onClick={addStop}>
                      <Plus className="w-4 h-4 mr-1" />
                      Add Stop
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {stops.map((stop, index) => (
                      <div key={index} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
                        <span className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
                          {index + 1}
                        </span>
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                          <Input
                            placeholder="Stop name"
                            value={stop.stopName}
                            onChange={(e) => updateStop(index, 'stopName', e.target.value)}
                          />
                          <Input
                            type="number"
                            step="any"
                            placeholder="Latitude"
                            value={stop.latitude}
                            onChange={(e) => updateStop(index, 'latitude', e.target.value)}
                          />
                          <Input
                            type="number"
                            step="any"
                            placeholder="Longitude"
                            value={stop.longitude}
                            onChange={(e) => updateStop(index, 'longitude', e.target.value)}
                          />
                        </div>
                        {stops.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeStop(index)}
                            className="text-red-600 border-red-600 hover:bg-red-50"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-3 pt-6 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateModal(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Creating Route..." : "Create Route"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Route Detail Panel */}
      {showDetailPanel && selectedRoute && (
        <div className="fixed inset-y-0 right-0 bg-white shadow-lg w-full max-w-4xl z-50 overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold">{selectedRoute.routeName}</h2>
              <Button variant="outline" onClick={() => setShowDetailPanel(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-6">
              {/* Map Preview */}
              <div>
                <h3 className="text-lg font-medium mb-4">Route Map</h3>
                <div className="h-64 rounded-lg overflow-hidden">
                  <RouteMap route={selectedRoute} />
                </div>
              </div>

              {/* Route Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <Clock className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-medium">{selectedRoute.departureTime || "Not set"}</p>
                        <p className="text-sm text-gray-500">Departure</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <Clock className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-medium">{selectedRoute.returnTime || "Not set"}</p>
                        <p className="text-sm text-gray-500">Return</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <DollarSign className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-medium">
                          {selectedRoute.feeAmount ? `PKR ${selectedRoute.feeAmount}` : "Not set"}
                        </p>
                        <p className="text-sm text-gray-500">Fee</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Assigned Driver */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Assigned Driver
                    <select
                      className="px-3 py-1 border border-gray-300 rounded text-sm"
                      value={selectedRoute.assignedDriverId || ""}
                      onChange={(e) => handleAssignDriver(selectedRoute.routeId, e.target.value)}
                    >
                      <option value="">No driver assigned</option>
                      {drivers.map((driver) => (
                        <option key={driver.uid} value={driver.uid}>
                          {driver.fullName}
                        </option>
                      ))}
                    </select>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedRoute.driverName ? (
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
                        {selectedRoute.driverAvatar}
                      </div>
                      <div>
                        <p className="font-medium">{selectedRoute.driverName}</p>
                        <p className="text-sm text-gray-500">Assigned Driver</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500">No driver assigned</p>
                  )}
                </CardContent>
              </Card>

              {/* Students List */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Students ({selectedRoute.studentCount})
                    <select
                      className="px-3 py-1 border border-gray-300 rounded text-sm"
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAddStudent(selectedRoute.routeId, e.target.value);
                          e.target.value = "";
                        }
                      }}
                    >
                      <option value="">Add student</option>
                      {students
                        .filter(student => !selectedRoute.studentIds?.includes(student.uid))
                        .map((student) => (
                          <option key={student.uid} value={student.uid}>
                            {student.fullName}
                          </option>
                        ))}
                    </select>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedRoute.studentIds?.map((studentId) => {
                      const student = students.find(s => s.uid === studentId);
                      if (!student) return null;

                      return (
                        <div key={studentId} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-sm font-medium text-green-600">
                              {student.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium">{student.fullName}</p>
                              <p className="text-sm text-gray-500">{student.pickupStop || "No stop assigned"}</p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-600 hover:bg-red-50"
                            onClick={() => handleRemoveStudent(selectedRoute.routeId, studentId)}
                          >
                            <UserMinus className="w-4 h-4 mr-1" />
                            Remove
                          </Button>
                        </div>
                      );
                    })}
                    {(!selectedRoute.studentIds || selectedRoute.studentIds.length === 0) && (
                      <p className="text-gray-500 text-center py-4">No students assigned to this route</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex justify-between items-center pt-6 border-t">
                <div className="flex items-center space-x-4">
                  <Button variant="outline">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Route
                  </Button>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">Active</span>
                    <button
                      onClick={() => handleToggleActive(selectedRoute.routeId, selectedRoute.isActive)}
                      className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      style={{ backgroundColor: selectedRoute.isActive ? '#10B981' : '#D1D5DB' }}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          selectedRoute.isActive ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
