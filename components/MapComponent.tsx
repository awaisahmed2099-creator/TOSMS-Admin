"use client";

// Map component for displaying live location tracking
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface LocationData {
  id: string;
  latitude: number;
  longitude: number;
  driverName: string;
  vehicleId: string;
  timestamp: Date;
  status: string;
}

interface MapComponentProps {
  locations: LocationData[];
}

export default function MapComponent({ locations }: MapComponentProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">Loading map...</div>;
  }

  return (
    <div className="h-96 w-full rounded-lg overflow-hidden">
      <MapContainer
        center={[28.6139, 77.2090]} // Default to Delhi coordinates
        zoom={10}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {locations.map((location) => (
          <Marker
            key={location.id}
            position={[location.latitude, location.longitude]}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold">{location.driverName}</h3>
                <p className="text-sm text-gray-600">Vehicle: {location.vehicleId}</p>
                <p className="text-sm text-gray-600">Status: {location.status}</p>
                <p className="text-sm text-gray-600">
                  Last Updated: {location.timestamp.toLocaleString()}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}