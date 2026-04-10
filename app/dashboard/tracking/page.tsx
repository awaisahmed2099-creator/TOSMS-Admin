"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { onSnapshot, query, where, collection } from "firebase/firestore";
import { COLLECTIONS } from "@/lib/collections";
import { db } from "@/lib/firebase";
import { LiveLocation, Ride } from "@/types";
import { format } from "date-fns";
import { Bus } from "lucide-react";

// Dynamically import the map component to avoid SSR issues
const FleetMap = dynamic(() => import("@/components/FleetMap"), { ssr: false });

interface ActiveRide extends LiveLocation {
  rideId: string;
}

export default function TrackingPage() {
  const [liveLocations, setLiveLocations] = useState<LiveLocation[]>([]);
  const [activeRides, setActiveRides] = useState<ActiveRide[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<LiveLocation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    let locations: LiveLocation[] = [];
    let rides: Ride[] = [];

    // Listen to live locations
    const liveLocationsUnsubscribe = onSnapshot(
      query(collection(db, COLLECTIONS.LIVE_LOCATIONS), where("isActive", "==", true)),
      (snapshot) => {
        locations = [];
        snapshot.forEach((doc) => {
          locations.push({ ...doc.data(), locationId: doc.id } as LiveLocation);
        });
        setLiveLocations(locations);

        // Update combined data
        updateActiveRides(locations, rides);
      }
    );

    // Listen to active rides
    const activeRidesUnsubscribe = onSnapshot(
      query(collection(db, COLLECTIONS.RIDES), where("status", "==", "active")),
      (snapshot) => {
        rides = [];
        snapshot.forEach((doc) => {
          rides.push({ ...doc.data(), rideId: doc.id } as Ride);
        });

        // Update combined data
        updateActiveRides(locations, rides);
      }
    );

    const updateActiveRides = (currentLocations: LiveLocation[], currentRides: Ride[]) => {
      const combined: ActiveRide[] = currentLocations.map(location => {
        const ride = currentRides.find(r => r.assignedDriverId === location.driverId);
        return {
          ...location,
          rideId: ride?.rideId || "",
        };
      });
      setActiveRides(combined);
      setLoading(false);
    };

    return () => {
      liveLocationsUnsubscribe();
      activeRidesUnsubscribe();
    };
  }, []);

  const handleRideClick = (location: LiveLocation) => {
    setSelectedLocation(location);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Bus className="w-12 h-12 mx-auto mb-4 text-gray-400 animate-pulse" />
          <p className="text-gray-600">Loading fleet tracking...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen">
      {/* Left Sidebar */}
      <div className="absolute left-0 top-0 z-10 w-80 h-full bg-white shadow-lg overflow-y-auto">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Active Rides</h2>
          <p className="text-sm text-gray-600">{activeRides.length} rides in progress</p>
        </div>

        <div className="p-4 space-y-3">
          {activeRides.length === 0 ? (
            <div className="text-center py-8">
              <Bus className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">No active rides right now</p>
            </div>
          ) : (
            activeRides.map((ride) => (
              <div
                key={ride.locationId}
                onClick={() => handleRideClick(ride)}
                className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">{ride.routeName}</h3>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-1 animate-pulse"></div>
                    Live
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-1">{ride.driverName}</p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{ride.speed.toFixed(1)} km/h</span>
                  <span>{format(ride.lastUpdated.toDate(), "HH:mm:ss")}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Map Container */}
      <div className="absolute right-0 top-0 h-full" style={{ width: "calc(100% - 320px)" }}>
        <FleetMap liveLocations={liveLocations} selectedLocation={selectedLocation} />
      </div>

      {/* Empty State Overlay */}
      {activeRides.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 z-20">
          <div className="text-center">
            <Bus className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Active Rides</h3>
            <p className="text-gray-600">All vehicles are currently parked</p>
          </div>
        </div>
      )}
    </div>
  );
}
