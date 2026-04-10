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
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Search,
  MapPin,
  UserCheck,
  UserX,
  Route,
  X,
  CheckSquare,
  Square,
  UserPlus,
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
  arrayUnion,
  arrayRemove,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { User, Route as RouteType, FeePayment } from "@/types";
import { format } from "date-fns";

interface StudentWithRoute extends User {
  routeName?: string;
  feeStatus?: "paid" | "pending" | "due";
}

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentWithRoute[]>([]);
  const [routes, setRoutes] = useState<RouteType[]>([]);
  const [feePayments, setFeePayments] = useState<FeePayment[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState("");
  const [selectedStop, setSelectedStop] = useState("");
  const [isBulkAction, setIsBulkAction] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);

  // Add student form state
  const [studentFormData, setStudentFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
  });
  const [isSubmittingStudent, setIsSubmittingStudent] = useState(false);

  const currentMonth = format(new Date(), "yyyy-MM");

  // Check if Firebase is configured
  const isFirebaseConfigured = !!db;

  useEffect(() => {
    if (!db) return;

    // Fetch students
    const studentsQuery = query(
      collection(db, COLLECTIONS.USERS),
      where("role", "==", "student")
    );
    const unsubscribeStudents = onSnapshot(studentsQuery, (snapshot) => {
      const studentsData = snapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as User));
      setStudents(studentsData);
    });

    // Fetch routes
    const routesQuery = query(collection(db, COLLECTIONS.ROUTES));
    const unsubscribeRoutes = onSnapshot(routesQuery, (snapshot) => {
      const routesData = snapshot.docs.map(doc => doc.data() as RouteType);
      setRoutes(routesData);
    });

    // Fetch fee payments for current month
    const feeQuery = query(
      collection(db, COLLECTIONS.FEE_PAYMENTS),
      where("month", "==", currentMonth)
    );
    const unsubscribeFees = onSnapshot(feeQuery, (snapshot) => {
      const feeData = snapshot.docs.map(doc => doc.data() as FeePayment);
      setFeePayments(feeData);
    });

    return () => {
      unsubscribeStudents();
      unsubscribeRoutes();
      unsubscribeFees();
    };
  }, [currentMonth]);

  // Process students with route and fee information
  const processedStudents = students.map(student => {
    const route = routes.find(r => r.routeId === student.routeId);
    const feePayment = feePayments.find(f => f.studentId === student.uid);

    let feeStatus: "paid" | "pending" | "due" = "due";
    if (feePayment) {
      if (feePayment.paymentStatus === "paid") {
        feeStatus = "paid";
      } else if (feePayment.paymentStatus === "pending") {
        feeStatus = "pending";
      }
    }

    return {
      ...student,
      routeName: route?.routeName,
      feeStatus,
    };
  });

  // Filter students based on search
  const filteredStudents = processedStudents.filter(student =>
    student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAssignRoute = async (studentId: string, routeId: string, stopName: string) => {
    if (!db) return;

    try {
      // Update student
      const studentRef = doc(db, COLLECTIONS.USERS, studentId);
      await updateDoc(studentRef, {
        routeId,
        pickupStop: stopName,
      });

      // Add student to route's studentIds
      const routeRef = doc(db, COLLECTIONS.ROUTES, routeId);
      await updateDoc(routeRef, {
        studentIds: arrayUnion(studentId),
      });

      setShowAssignModal(false);
      setSelectedRouteId("");
      setSelectedStop("");
    } catch (error) {
      console.error("Error assigning route:", error);
    }
  };

  const handleRemoveFromRoute = async (studentId: string) => {
    if (!db) return;

    const student = students.find(s => s.uid === studentId);
    if (!student?.routeId) return;

    try {
      // Update student
      const studentRef = doc(db, COLLECTIONS.USERS, studentId);
      await updateDoc(studentRef, {
        routeId: null,
        pickupStop: null,
      });

      // Remove student from route's studentIds
      const routeRef = doc(db, COLLECTIONS.ROUTES, student.routeId);
      await updateDoc(routeRef, {
        studentIds: arrayRemove(studentId),
      });
    } catch (error) {
      console.error("Error removing from route:", error);
    }
  };

  const handleSuspend = async (studentId: string) => {
    if (!db) return;

    const studentRef = doc(db, COLLECTIONS.USERS, studentId);
    await updateDoc(studentRef, {
      status: "suspended",
    });
  };

  const handleBulkAssign = async () => {
    if (!db || !selectedRouteId || !selectedStop || selectedStudents.length === 0) return;

    try {
      const batch = [];

      for (const studentId of selectedStudents) {
        // Update student
        const studentRef = doc(db, COLLECTIONS.USERS, studentId);
        batch.push(updateDoc(studentRef, {
          routeId: selectedRouteId,
          pickupStop: selectedStop,
        }));
      }

      // Update route with all student IDs
      const routeRef = doc(db, COLLECTIONS.ROUTES, selectedRouteId);
      batch.push(updateDoc(routeRef, {
        studentIds: arrayUnion(...selectedStudents),
      }));

      await Promise.all(batch);

      setSelectedStudents([]);
      setShowAssignModal(false);
      setSelectedRouteId("");
      setSelectedStop("");
      setIsBulkAction(false);
    } catch (error) {
      console.error("Error bulk assigning routes:", error);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) {
      alert("Database not connected. Please check your Firebase configuration.");
      return;
    }

    setIsSubmittingStudent(true);
    try {
      const newStudent = {
        fullName: studentFormData.fullName,
        email: studentFormData.email,
        phone: studentFormData.phone,
        role: "student" as const,
        status: "active" as const,
        createdAt: serverTimestamp(),
        profileComplete: true,
      };

      console.log("Adding student:", newStudent);
      const docRef = await addDoc(collection(db, COLLECTIONS.USERS), newStudent);
      console.log("Student added successfully with ID:", docRef.id);

      // Reset form
      setStudentFormData({
        fullName: "",
        email: "",
        phone: "",
      });
      setShowAddStudentModal(false);
      alert("Student added successfully!");
    } catch (error) {
      console.error("Error adding student:", error);
      alert(`Error adding student: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmittingStudent(false);
    }
  };

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const toggleAllSelection = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map(s => s.uid));
    }
  };

  const getFeeStatusBadge = (status: "paid" | "pending" | "due") => {
    switch (status) {
      case "paid":
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Paid
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            Under Review
          </span>
        );
      case "due":
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Due
          </span>
        );
    }
  };

  const selectedRoute = routes.find(r => r.routeId === selectedRouteId);

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
          <h1 className="text-2xl font-bold">Students</h1>
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {students.length}
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <Button onClick={() => setShowAddStudentModal(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Add Student
          </Button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          {selectedStudents.length > 0 && (
            <Button
              onClick={() => {
                setShowAssignModal(true);
                setIsBulkAction(true);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Assign to Route ({selectedStudents.length})
            </Button>
          )}
        </div>
      </div>

      {/* Students Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <button
                    onClick={toggleAllSelection}
                    className="flex items-center justify-center"
                  >
                    {selectedStudents.length === filteredStudents.length && filteredStudents.length > 0 ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Assigned Route</TableHead>
                <TableHead>Pickup Stop</TableHead>
                <TableHead>Fee Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow key={student.uid}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedStudents.includes(student.uid)}
                      onChange={() => toggleStudentSelection(student.uid)}
                      className="rounded border-gray-300"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
                        {student.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </div>
                      <span className="font-medium">{student.fullName}</span>
                    </div>
                  </TableCell>
                  <TableCell>{student.email}</TableCell>
                  <TableCell>{student.phone}</TableCell>
                  <TableCell>{student.routeName || "Not assigned"}</TableCell>
                  <TableCell>{student.pickupStop || "Not set"}</TableCell>
                  <TableCell>{getFeeStatusBadge(student.feeStatus!)}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setShowAssignModal(true);
                          setIsBulkAction(false);
                          setSelectedStudents([student.uid]);
                        }}
                      >
                        <Route className="w-4 h-4 mr-1" />
                        Assign Route
                      </Button>
                      {student.routeId && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-orange-600 border-orange-600 hover:bg-orange-50"
                          onClick={() => handleRemoveFromRoute(student.uid)}
                        >
                          <UserX className="w-4 h-4 mr-1" />
                          Remove
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-600 hover:bg-red-50"
                        onClick={() => handleSuspend(student.uid)}
                      >
                        <UserX className="w-4 h-4 mr-1" />
                        Suspend
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Assign Route Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">
                  {isBulkAction ? `Assign Route to ${selectedStudents.length} Students` : "Assign Route"}
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedRouteId("");
                    setSelectedStop("");
                    if (!isBulkAction) setSelectedStudents([]);
                    setIsBulkAction(false);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Route *
                  </label>
                  <select
                    value={selectedRouteId}
                    onChange={(e) => {
                      setSelectedRouteId(e.target.value);
                      setSelectedStop("");
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Choose a route</option>
                    {routes.filter(r => r.isActive).map((route) => (
                      <option key={route.routeId} value={route.routeId}>
                        {route.routeName}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedRoute && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select Pickup Stop *
                    </label>
                    <select
                      value={selectedStop}
                      onChange={(e) => setSelectedStop(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Choose a stop</option>
                      {selectedRoute.stops.map((stop) => (
                        <option key={stop.stopName} value={stop.stopName}>
                          {stop.stopName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAssignModal(false);
                      setSelectedRouteId("");
                      setSelectedStop("");
                      if (!isBulkAction) setSelectedStudents([]);
                      setIsBulkAction(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={isBulkAction ? handleBulkAssign : () => handleAssignRoute(selectedStudents[0], selectedRouteId, selectedStop)}
                    disabled={!selectedRouteId || !selectedStop}
                  >
                    {isBulkAction ? `Assign ${selectedStudents.length} Students` : "Assign Route"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showAddStudentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Add New Student</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddStudentModal(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <form onSubmit={handleAddStudent} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <Input
                    type="text"
                    required
                    value={studentFormData.fullName}
                    onChange={(e) => setStudentFormData(prev => ({ ...prev, fullName: e.target.value }))}
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
                    value={studentFormData.email}
                    onChange={(e) => setStudentFormData(prev => ({ ...prev, email: e.target.value }))}
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
                    value={studentFormData.phone}
                    onChange={(e) => setStudentFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Enter phone number"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddStudentModal(false)}
                    disabled={isSubmittingStudent}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmittingStudent}
                  >
                    {isSubmittingStudent ? "Adding Student..." : "Add Student"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
