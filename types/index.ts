export type Role = "student" | "driver" | "admin";

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
  createdAt: any;
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
  createdAt: any;
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
  markedAt?: any;
}

export interface FeePayment {
  paymentId: string;
  studentId: string;
  studentName: string;
  routeId: string;
  month: string;
  amount: number;
  paymentMethod: string;
  paymentStatus: "pending" | "paid" | "failed";
  challanNumber?: string;
  transactionId?: string;
  submittedAt: any;
  verifiedAt?: any;
  receiptImageUrl?: string;
}

export interface Ride {
  rideId: string;
  routeId: string;
  routeName: string;
  assignedDriverId: string;
  driverName: string;
  status: "ongoing" | "completed" | "cancelled";
  date: string;
  departureTime?: string;
  reachedStops?: any[];
}