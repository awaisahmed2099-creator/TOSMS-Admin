"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS } from "@/lib/collections";
import { useMockData, mockLiveLocations, mockRides } from "@/lib/mock";

// Types
type LiveLocation = {
  id: string;
  driverId: string;
  latitude: number;
  longitude: number;
  speed?: number;
  updatedAt?: any;
};

type Ride = {
  id: string;
  routeName: string;
  driverName: string;
  status: string;
};

type LocationData = {
  id: string;
  latitude: number;
  longitude: number;
  driverName: string;
  vehicleId: string;
  timestamp: Date;
  status: string;
};

// Dynamically import the map component to avoid SSR issues
const MapComponent = dynamic(() => import("@/components/MapComponent"), {
  ssr: false,
  loading: () => <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">Loading map...</div>
}) as React.ComponentType<{ locations: LocationData[] }>;

// Format time
function formatTime(timestamp: any) {
  if (!timestamp) return "N/A";
  const date = timestamp.toDate
    ? timestamp.toDate()
    : new Date(timestamp);
  return date.toLocaleTimeString();
}

export default function TrackingPage() {
  const [liveLocations, setLiveLocations] = useState<LiveLocation[]>([]);
  const [rides, setRides] = useState<Ride[]>([]);

  // 🔴 LIVE LOCATIONS (READ ONLY)
  useEffect(() => {
    if (useMockData) {
      setLiveLocations(
        mockLiveLocations.map((loc) => ({
          id: loc.locationId,
          driverId: loc.driverId,
          latitude: loc.latitude,
          longitude: loc.longitude,
          speed: loc.speed,
          updatedAt: loc.lastUpdated,
        }))
      );
      return;
    }

    const unsub = onSnapshot(
      collection(db, COLLECTIONS.LIVE_LOCATIONS),
      (snapshot) => {
        const data: LiveLocation[] = snapshot.docs.map((doc) => {
          const d = doc.data() as any;

          return {
            id: doc.id,
            driverId: d.driverId,
            latitude: d.latitude,
            longitude: d.longitude,
            speed: d.speed || 0,
            updatedAt: d.lastUpdated || null,
          };
        });

        setLiveLocations(data);
      }
    );

    return () => unsub();
  }, []);

  // 🟢 ACTIVE RIDES (READ ONLY)
  useEffect(() => {
    if (useMockData) {
      setRides(
        mockRides.map((ride) => ({
          id: ride.rideId,
          routeName: ride.routeName,
          driverName: ride.driverName,
          status: ride.status,
        }))
      );
      return;
    }

    const q = query(
      collection(db, COLLECTIONS.RIDES),
      where("status", "==", "active")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const data: Ride[] = snapshot.docs.map((doc) => {
        const d = doc.data() as any;

        return {
          id: doc.id,
          routeName: d.routeName,
          driverName: d.driverName,
          status: d.status,
        };
      });

      setRides(data);
    });

    return () => unsub();
  }, []);

  // Merge data safely
  const mergedData = liveLocations.map((loc) => {
    const ride = rides.find((r) => r.driverName === loc.driverId);

    return {
      id: loc.id,
      latitude: loc.latitude,
      longitude: loc.longitude,
      driverName: ride?.driverName || "Unknown Driver",
      vehicleId: loc.driverId,
      timestamp: loc.updatedAt ? (loc.updatedAt.toDate ? loc.updatedAt.toDate() : new Date(loc.updatedAt)) : new Date(),
      status: "Active",
    };
  });

  return (
    <div className="flex w-full h-[calc(100vh-64px)]">
      {/* SIDEBAR */}
      <div className="w-[300px] bg-white border-r overflow-y-auto z-[1000]">
        <div className="p-3 font-bold border-b">Live Rides</div>

        {mergedData.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            🚌 No active rides right now
          </div>
        ) : (
          mergedData.map((item) => (
            <div
              key={item.id}
              className="p-3 border-b hover:bg-gray-100"
            >
              <div className="font-semibold">{item.driverName}</div>
              <div className="text-sm text-gray-600">
                Vehicle: {item.vehicleId}
              </div>

              <div className="text-xs mt-1 text-gray-500">
                Last Updated: {formatTime(item.timestamp)}
              </div>

              <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full inline-block mt-1">
                Live
              </span>
            </div>
          ))
        )}
      </div>

      {/* MAP */}
      <div className="flex-1 p-4">
        <MapComponent locations={mergedData} />
      </div>
    </div>
  );
}