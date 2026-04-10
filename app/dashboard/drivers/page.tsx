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
  UserPlus,
  Star,
  Eye,
  Ban,
  CheckCircle,
  XCircle,
  MapPin,
  X,
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
  deleteDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { User, Route } from "@/types";

type FilterType = "all" | "pending" | "active" | "suspended";

interface DriverWithRoute extends User {
  routeName?: string;
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<DriverWithRoute[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<DriverWithRoute | null>(null);
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    cnic: "",
    vehicleType: "",
    vehiclePlate: "",
    vehicleCapacity: "",
    routeId: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if Firebase is configured
  const isFirebaseConfigured = !!db;

  useEffect(() => {
    if (!db) return;

    // Fetch drivers
    const driversQuery = query(
      collection(db, COLLECTIONS.USERS),
      where("role", "==", "driver")
    );
    const unsubscribeDrivers = onSnapshot(driversQuery, (snapshot) => {
      const driversData = snapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as User));
      setDrivers(driversData);
    });

    // Fetch routes
    const routesQuery = query(collection(db, COLLECTIONS.ROUTES));
    const unsubscribeRoutes = onSnapshot(routesQuery, (snapshot) => {
      const routesData = snapshot.docs.map(doc => doc.data() as Route);
      setRoutes(routesData);
    });

    return () => {
      unsubscribeDrivers();
      unsubscribeRoutes();
    };
  }, []);

  const filteredDrivers = drivers.filter(driver => {
    switch (filter) {
      case "pending":
        return !driver.approved;
      case "active":
        return driver.approved && driver.status === "active";
      case "suspended":
        return driver.status === "suspended";
      default:
        return true;
    }
  });

  const handleApprove = async (driverId: string) => {
    if (!db) return;
    const driverRef = doc(db, COLLECTIONS.USERS, driverId);
    await updateDoc(driverRef, {
      approved: true,
      status: "active",
    });
  };

  const handleReject = async (driverId: string) => {
    if (!db) return;
    const driverRef = doc(db, COLLECTIONS.USERS, driverId);
    await deleteDoc(driverRef);
  };

  const handleSuspend = async (driverId: string) => {
    if (!db) return;
    const driverRef = doc(db, COLLECTIONS.USERS, driverId);
    await updateDoc(driverRef, {
      status: "suspended",
    });
  };

  const handleAssignRoute = async (driverId: string, routeId: string) => {
    if (!db) return;
    const route = routes.find(r => r.routeId === routeId);
    if (!route) return;

    // Update route
    const routeRef = doc(db, COLLECTIONS.ROUTES, routeId);
    await updateDoc(routeRef, {
      assignedDriverId: driverId,
      assignedDriverName: drivers.find(d => d.uid === driverId)?.fullName,
    });

    // Update driver
    const driverRef = doc(db, COLLECTIONS.USERS, driverId);
    await updateDoc(driverRef, {
      routeId,
    });
  };

  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) {
      console.error("Firebase database not initialized. Please check your Firebase configuration.");
      alert("Database not connected. Please check your Firebase configuration.");
      return;
    }

    setIsSubmitting(true);
    try {
      const newDriver = {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        role: "driver" as const,
        status: "active" as const,
        cnic: formData.cnic || undefined,
        vehicleType: formData.vehicleType,
        vehiclePlate: formData.vehiclePlate,
        vehicleCapacity: parseInt(formData.vehicleCapacity) || 0,
        routeId: formData.routeId || undefined,
        approved: true, // Auto-approve for admin added drivers
        createdAt: serverTimestamp(),
        profileComplete: true,
      };

      console.log("Adding driver:", newDriver);
      const docRef = await addDoc(collection(db, COLLECTIONS.USERS), newDriver);
      console.log("Driver added successfully with ID:", docRef.id);

      // Reset form
      setFormData({
        fullName: "",
        email: "",
        phone: "",
        cnic: "",
        vehicleType: "",
        vehiclePlate: "",
        vehicleCapacity: "",
        routeId: "",
      });
      setShowAddModal(false);
      alert("Driver added successfully!");
    } catch (error) {
      console.error("Error adding driver:", error);
      alert(`Error adding driver: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (driver: User) => {
    if (!driver.approved) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          Pending
        </span>
      );
    }
    if (driver.status === "suspended") {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Suspended
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
        Active
      </span>
    );
  };

  const renderStars = (rating?: number) => {
    if (!rating) return null;
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? "text-yellow-400 fill-current" : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

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
        <div className="flex items-center space-x-2">
          <h1 className="text-2xl font-bold">Drivers</h1>
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {drivers.length}
          </span>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Add Driver
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {[
          { key: "all", label: "All" },
          { key: "pending", label: "Pending Approval" },
          { key: "active", label: "Active" },
          { key: "suspended", label: "Suspended" },
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

      {/* Drivers Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Driver</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Route Assigned</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDrivers.map((driver) => (
                <TableRow key={driver.uid}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
                        {driver.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </div>
                      <span className="font-medium">{driver.fullName}</span>
                    </div>
                  </TableCell>
                  <TableCell>{driver.email}</TableCell>
                  <TableCell>{driver.phone}</TableCell>
                  <TableCell>
                    {driver.vehicleType && driver.vehiclePlate
                      ? `${driver.vehicleType} - ${driver.vehiclePlate}`
                      : "Not set"
                    }
                  </TableCell>
                  <TableCell>
                    {driver.routeId
                      ? routes.find(r => r.routeId === driver.routeId)?.routeName || "Unknown"
                      : "Not assigned"
                    }
                  </TableCell>
                  <TableCell>{getStatusBadge(driver)}</TableCell>
                  <TableCell>{renderStars(driver.rating)}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {!driver.approved ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 border-green-600 hover:bg-green-50"
                            onClick={() => handleApprove(driver.uid)}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-600 hover:bg-red-50"
                            onClick={() => handleReject(driver.uid)}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedDriver(driver);
                              setShowDetailsPanel(true);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View Details
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-600 hover:bg-red-50"
                            onClick={() => handleSuspend(driver.uid)}
                          >
                            <Ban className="w-4 h-4 mr-1" />
                            Suspend
                          </Button>
                          <select
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                            onChange={(e) => handleAssignRoute(driver.uid, e.target.value)}
                            defaultValue=""
                          >
                            <option value="" disabled>Assign Route</option>
                            {routes.map((route) => (
                              <option key={route.routeId} value={route.routeId}>
                                {route.routeName}
                              </option>
                            ))}
                          </select>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Driver Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Add New Driver</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddModal(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <form onSubmit={handleAddDriver} className="space-y-6">
                {/* Personal Information */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Personal Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name *
                      </label>
                      <Input
                        type="text"
                        required
                        value={formData.fullName}
                        onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                        placeholder="Enter full name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email *
                      </label>
                      <Input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="Enter email address"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number *
                      </label>
                      <Input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="Enter phone number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        CNIC
                      </label>
                      <Input
                        type="text"
                        value={formData.cnic}
                        onChange={(e) => setFormData(prev => ({ ...prev, cnic: e.target.value }))}
                        placeholder="Enter CNIC number"
                      />
                    </div>
                  </div>
                </div>

                {/* Vehicle Information */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Vehicle Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Vehicle Type *
                      </label>
                      <select
                        required
                        value={formData.vehicleType}
                        onChange={(e) => setFormData(prev => ({ ...prev, vehicleType: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select vehicle type</option>
                        <option value="Bus">Bus</option>
                        <option value="Van">Van</option>
                        <option value="Car">Car</option>
                        <option value="Truck">Truck</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Vehicle Plate *
                      </label>
                      <Input
                        type="text"
                        required
                        value={formData.vehiclePlate}
                        onChange={(e) => setFormData(prev => ({ ...prev, vehiclePlate: e.target.value }))}
                        placeholder="e.g., ABC-123"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Vehicle Capacity *
                      </label>
                      <Input
                        type="number"
                        required
                        min="1"
                        value={formData.vehicleCapacity}
                        onChange={(e) => setFormData(prev => ({ ...prev, vehicleCapacity: e.target.value }))}
                        placeholder="Number of passengers"
                      />
                    </div>
                  </div>
                </div>

                {/* Route Assignment */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Route Assignment (Optional)</h3>
                  <div className="max-w-md">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Assign Route
                    </label>
                    <select
                      value={formData.routeId}
                      onChange={(e) => setFormData(prev => ({ ...prev, routeId: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">No route assigned</option>
                      {routes.map((route) => (
                        <option key={route.routeId} value={route.routeId}>
                          {route.routeName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-3 pt-6 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddModal(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Adding Driver..." : "Add Driver"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Details Panel Placeholder */}
      {showDetailsPanel && selectedDriver && (
        <div className="fixed inset-y-0 right-0 bg-white shadow-lg w-96 z-50">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Driver Details</h2>
              <Button variant="outline" onClick={() => setShowDetailsPanel(false)}>
                Close
              </Button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-lg font-medium text-blue-600">
                  {selectedDriver.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
                </div>
                <div>
                  <h3 className="font-medium">{selectedDriver.fullName}</h3>
                  <p className="text-sm text-gray-600">{selectedDriver.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Phone</label>
                  <p>{selectedDriver.phone}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">CNIC</label>
                  <p>{selectedDriver.cnic || "Not provided"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Vehicle</label>
                  <p>{selectedDriver.vehicleType} - {selectedDriver.vehiclePlate}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Capacity</label>
                  <p>{selectedDriver.vehicleCapacity} passengers</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Assigned Route</label>
                <p>{selectedDriver.routeId ? routes.find(r => r.routeId === selectedDriver.routeId)?.routeName : "Not assigned"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Rating</label>
                <div className="flex items-center mt-1">
                  {renderStars(selectedDriver.rating)}
                  <span className="ml-2 text-sm text-gray-600">({selectedDriver.rating || 0})</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
