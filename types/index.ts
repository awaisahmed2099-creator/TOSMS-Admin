export type Role = "student" | "driver" | "admin";

import type { Timestamp } from "firebase/firestore";

export type Status = "active" | "suspended";

export interface User {
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  role: Role;
  profileImageUrl?: string;
  fcmToken?: string;
  expoPushToken?: string;
  createdAt: Timestamp;
  status: Status;
  routeId?: string;
  pickupStop?: string;

  // Driver extras
  vehicleType?: string;
  vehiclePlate?: string;
  vehicleCapacity?: number;
  cnic?: string;
  approved?: boolean;
  rating?: number;
  totalRides?: number;
  profileComplete?: boolean;
}

export interface Route {
  routeId: string;
  routeName: string;
  description?: string;
  stops: {
    stopName: string;
    order: number;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  }[];
  assignedDriverId?: string;
  assignedDriverName?: string;
  studentIds?: string[];
  departureTime?: string;
  returnTime?: string;
  feeAmount?: number;
  isActive: boolean;
  createdAt: Timestamp;
}

export interface Availability {
  availabilityId: string;
  userId: string;
  userName: string;
  routeId: string;
  date: string;
  isAvailable: boolean;
  note?: string;
  role: Role;
  vehicleAvailable?: boolean;
  boarded?: boolean;
  markedAt?: Timestamp;
}

export interface FeePayment {
  paymentId: string;
  studentId: string;
  studentName: string;
  routeId: string;
  month: string;
  amount: number;
  paymentMethod: string;
  paymentStatus: "pending" | "verified" | "rejected" | "paid" | "failed";
  challanNumber?: string;
  transactionId?: string;
  submittedAt: Timestamp;
  verifiedAt?: Timestamp;
  receiptImageUrl?: string;
  rejectionReason?: string;
}

export interface Ride {
  rideId: string;
  routeId: string;
  routeName: string;
  assignedDriverId: string;
  driverName: string;
  status: "scheduled" | "active" | "completed";
  date: string;
  departureTime?: string;
  reachedStops?: Array<{ stopName?: string; timestamp?: Timestamp }>;
  studentIds?: string[];
  boardedStudents?: string[];
}

export interface LiveLocation {
  locationId: string;
  driverId: string;
  driverName: string;
  routeId: string;
  routeName: string;
  latitude: number;
  longitude: number;
  speed: number; // in km/h
  heading?: number; // direction in degrees
  accuracy?: number;
  lastUpdated: Timestamp;
  isActive: boolean;
}

export interface SOSAlert {
  alertId: string;
  studentId: string;
  studentName: string;
  studentPhone: string;
  studentAvatar?: string;
  routeId: string;
  routeName: string;
  driverId: string;
  driverName: string;
  driverPhone: string;
  latitude: number;
  longitude: number;
  status: "active" | "resolved";
  message?: string;
  createdAt: Timestamp;
  resolvedAt?: Timestamp;
}