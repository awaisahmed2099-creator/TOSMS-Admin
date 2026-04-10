"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { LiveLocation } from "@/types";
import { format } from "date-fns";

// Import Leaflet CSS
import "leaflet/dist/leaflet.css";

// Custom bus icon
const busIcon = new L.Icon({
  iconUrl: "data:image/svg+xml;base64," + btoa(`
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="8" width="28" height="16" rx="2" fill="#2563eb" stroke="#1e40af" stroke-width="2"/>
      <rect x="6" y="12" width="4" height="8" fill="#ffffff"/>
      <rect x="12" y="12" width="4" height="8" fill="#ffffff"/>
      <rect x="18" y="12" width="4" height="8" fill="#ffffff"/>
      <circle cx="6" cy="22" r="2" fill="#374151"/>
      <circle cx="26" cy="22" r="2" fill="#374151"/>
      <rect x="4" y="4" width="24" height="6" rx="1" fill="#1e40af"/>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

function MapController({ selectedLocation }: { selectedLocation: LiveLocation | null }) {
  const map = useMap();

  useEffect(() => {
    if (selectedLocation && map) {
      map.setView([selectedLocation.latitude, selectedLocation.longitude], 15);
    }
  }, [selectedLocation, map]);

  return null;
}

interface FleetMapProps {
  liveLocations: LiveLocation[];
  selectedLocation: LiveLocation | null;
}

export default function FleetMap({ liveLocations, selectedLocation }: FleetMapProps) {
  return (
    <MapContainer
      center={[31.5204, 74.3587]} // Default to Lahore coordinates
      zoom={12}
      style={{ height: "100%", width: "100%" }}
      className="z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {liveLocations.map((location) => (
        <Marker
          key={location.locationId}
          position={[location.latitude, location.longitude]}
          icon={busIcon}
        >
          <Popup>
            <div className="text-sm">
              <h3 className="font-semibold">{location.driverName}</h3>
              <p className="text-gray-600">{location.routeName}</p>
              <p className="text-gray-600">Speed: {location.speed.toFixed(1)} km/h</p>
              <p className="text-gray-600">
                Last updated: {format(location.lastUpdated.toDate(), "HH:mm:ss")}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}

      <MapController selectedLocation={selectedLocation} />
    </MapContainer>
  );
}