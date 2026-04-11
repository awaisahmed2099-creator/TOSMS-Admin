import { Timestamp } from "firebase/firestore";
import { Availability, FeePayment, Route, User, Ride, SOSAlert, LiveLocation } from "@/types";

export const useMockData = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

export const mockDashboardStats = {
  totalDrivers: 12,
  totalStudents: 152,
  activeRoutes: 8,
  todaysRides: 5,
};

export const mockAvailabilitySummary = [
  {
    routeId: "route-a",
    routeName: "Route A",
    available: 18,
    notAvailable: 3,
    noResponse: 2,
    total: 23,
  },
  {
    routeId: "route-b",
    routeName: "Route B",
    available: 14,
    notAvailable: 5,
    noResponse: 1,
    total: 20,
  },
];

export const mockRecentActivity: Array<{
  id: string;
  type: "payment" | "availability";
  description: string;
  timeAgo: string;
  initials: string;
}> = [
  {
    id: "act-1",
    type: "payment",
    description: "Ayesha submitted payment for April",
    timeAgo: "5 minutes ago",
    initials: "A",
  },
  {
    id: "act-2",
    type: "availability",
    description: "Driver Naveed marked available for tomorrow",
    timeAgo: "12 minutes ago",
    initials: "N",
  },
];

export const mockPendingActions = {
  unverifiedPayments: 4,
  pendingDrivers: 2,
};

export const mockRoutes: Route[] = [
  {
    routeId: "route-a",
    routeName: "Route A",
    description: "North campus loop",
    stops: [
      {
        stopName: "Gate 1",
        order: 1,
        coordinates: { latitude: 33.6844, longitude: 73.0479 },
      },
      {
        stopName: "Gate 2",
        order: 2,
        coordinates: { latitude: 33.6900, longitude: 73.0490 },
      },
    ],
    assignedDriverId: "driver-1",
    assignedDriverName: "Ibrahim Ali",
    studentIds: ["student-1", "student-2"],
    departureTime: "07:30",
    returnTime: "14:30",
    feeAmount: 1200,
    isActive: true,
    createdAt: Timestamp.fromDate(new Date(Date.now() - 86400000)),
  },
  {
    routeId: "route-b",
    routeName: "Route B",
    description: "South campus path",
    stops: [
      {
        stopName: "Block C",
        order: 1,
        coordinates: { latitude: 33.6920, longitude: 73.0500 },
      },
      {
        stopName: "Block D",
        order: 2,
        coordinates: { latitude: 33.6950, longitude: 73.0550 },
      },
    ],
    assignedDriverId: "driver-2",
    assignedDriverName: "Sana Yousaf",
    studentIds: ["student-3", "student-4"],
    departureTime: "08:00",
    returnTime: "15:00",
    feeAmount: 1300,
    isActive: true,
    createdAt: Timestamp.fromDate(new Date(Date.now() - 172800000)),
  },
];

export const mockDrivers: User[] = [
  {
    uid: "driver-1",
    fullName: "Ibrahim Ali",
    email: "ibrahim.ali@example.com",
    phone: "+923001112233",
    role: "driver",
    profileImageUrl: "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?auto=format&fit=crop&w=80&q=80",
    createdAt: Timestamp.fromDate(new Date(Date.now() - 86400000 * 30)),
    status: "active",
    vehicleType: "Mini Bus",
    vehiclePlate: "ABC-1234",
    vehicleCapacity: 30,
    approved: true,
    rating: 4,
    totalRides: 320,
  },
  {
    uid: "driver-2",
    fullName: "Sana Yousaf",
    email: "sana.yousaf@example.com",
    phone: "+923009998877",
    role: "driver",
    profileImageUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=80&q=80",
    createdAt: Timestamp.fromDate(new Date(Date.now() - 86400000 * 45)),
    status: "active",
    vehicleType: "Sedan",
    vehiclePlate: "XYZ-9876",
    vehicleCapacity: 20,
    approved: true,
    rating: 5,
    totalRides: 210,
  },
];

export const mockStudents: User[] = [
  {
    uid: "student-1",
    fullName: "Amina Khan",
    email: "amina.khan@example.com",
    phone: "+923001234567",
    role: "student",
    createdAt: Timestamp.fromDate(new Date(Date.now() - 86400000 * 60)),
    status: "active",
    routeId: "route-a",
  },
  {
    uid: "student-2",
    fullName: "Hassan Raza",
    email: "hassan.raza@example.com",
    phone: "+923002345678",
    role: "student",
    createdAt: Timestamp.fromDate(new Date(Date.now() - 86400000 * 70)),
    status: "active",
    routeId: "route-a",
  },
  {
    uid: "student-3",
    fullName: "Sara Ahmed",
    email: "sara.ahmed@example.com",
    phone: "+923003456789",
    role: "student",
    createdAt: Timestamp.fromDate(new Date(Date.now() - 86400000 * 50)),
    status: "active",
    routeId: "route-b",
  },
];

export const mockAvailability: Availability[] = [
  {
    availabilityId: "avail-1",
    userId: "driver-1",
    userName: "Ibrahim Ali",
    routeId: "route-a",
    date: new Date().toISOString().split("T")[0],
    isAvailable: true,
    role: "driver",
    vehicleAvailable: true,
    markedAt: Timestamp.fromDate(new Date(Date.now() - 3600000)),
  },
  {
    availabilityId: "avail-2",
    userId: "student-1",
    userName: "Amina Khan",
    routeId: "route-a",
    date: new Date().toISOString().split("T")[0],
    isAvailable: true,
    role: "student",
    markedAt: Timestamp.fromDate(new Date(Date.now() - 7200000)),
  },
  {
    availabilityId: "avail-3",
    userId: "student-2",
    userName: "Hassan Raza",
    routeId: "route-a",
    date: new Date().toISOString().split("T")[0],
    isAvailable: false,
    role: "student",
    markedAt: Timestamp.fromDate(new Date(Date.now() - 10800000)),
  },
];

export const mockPayments: FeePayment[] = [
  {
    paymentId: "pay-1",
    studentId: "student-1",
    studentName: "Amina Khan",
    routeId: "route-a",
    month: "2026-04",
    amount: 1200,
    paymentMethod: "Bank Transfer",
    paymentStatus: "verified",
    submittedAt: Timestamp.fromDate(new Date(Date.now() - 86400000 * 2)),
    receiptImageUrl: "https://via.placeholder.com/200",
  },
  {
    paymentId: "pay-2",
    studentId: "student-2",
    studentName: "Hassan Raza",
    routeId: "route-a",
    month: "2026-04",
    amount: 1200,
    paymentMethod: "Cash",
    paymentStatus: "pending",
    submittedAt: Timestamp.fromDate(new Date(Date.now() - 86400000)),
    receiptImageUrl: "",
  },
];

export const mockRides: Ride[] = [
  {
    rideId: "ride-1",
    routeId: "route-a",
    routeName: "Route A",
    assignedDriverId: "driver-1",
    driverName: "Ibrahim Ali",
    status: "active",
    date: new Date().toISOString().split("T")[0],
    departureTime: "07:30",
    studentIds: ["student-1", "student-2"],
    reachedStops: [{ stopName: "Gate 1", timestamp: Timestamp.fromDate(new Date(Date.now() - 3600000)) }],
    boardedStudents: ["student-1"],
  },
  {
    rideId: "ride-2",
    routeId: "route-b",
    routeName: "Route B",
    assignedDriverId: "driver-2",
    driverName: "Sana Yousaf",
    status: "scheduled",
    date: new Date().toISOString().split("T")[0],
    departureTime: "08:00",
    studentIds: ["student-3"],
  },
];

export const mockLiveLocations: LiveLocation[] = [
  {
    locationId: "loc-1",
    driverId: "driver-1",
    driverName: "Ibrahim Ali",
    routeId: "route-a",
    routeName: "Route A",
    latitude: 33.6844,
    longitude: 73.0479,
    speed: 32,
    heading: 90,
    accuracy: 10,
    lastUpdated: Timestamp.fromDate(new Date(Date.now() - 120000)),
    isActive: true,
  },
  {
    locationId: "loc-2",
    driverId: "driver-2",
    driverName: "Sana Yousaf",
    routeId: "route-b",
    routeName: "Route B",
    latitude: 33.6900,
    longitude: 73.0500,
    speed: 28,
    heading: 45,
    accuracy: 12,
    lastUpdated: Timestamp.fromDate(new Date(Date.now() - 300000)),
    isActive: true,
  },
];

export const mockSOSAlerts: SOSAlert[] = [
  {
    alertId: "sos-1",
    studentId: "student-1",
    studentName: "Amina Khan",
    studentPhone: "+923001234567",
    studentAvatar: "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?auto=format&fit=crop&w=80&q=80",
    routeId: "route-a",
    routeName: "Route A",
    driverId: "driver-1",
    driverName: "Ibrahim Ali",
    driverPhone: "+923009876543",
    latitude: 33.6844,
    longitude: 73.0479,
    status: "active",
    message: "Need immediate help",
    createdAt: Timestamp.fromDate(new Date(Date.now() - 600000)),
  },
  {
    alertId: "sos-2",
    studentId: "student-3",
    studentName: "Sara Ahmed",
    studentPhone: "+923002345678",
    routeId: "route-b",
    routeName: "Route B",
    driverId: "driver-2",
    driverName: "Sana Yousaf",
    driverPhone: "+923008765432",
    latitude: 33.6900,
    longitude: 73.0500,
    status: "resolved",
    message: "Resolved safely",
    createdAt: Timestamp.fromDate(new Date(Date.now() - 5400000)),
    resolvedAt: Timestamp.fromDate(new Date(Date.now() - 1800000)),
  },
];
