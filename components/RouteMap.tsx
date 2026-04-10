"use client";

import { useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Route } from '@/types';

// Fix for default markers in react-leaflet
const iconDefaultPrototype = L.Icon.Default.prototype as { _getIconUrl?: string };
delete iconDefaultPrototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface RouteMapProps {
  route: Route;
}

export default function RouteMap({ route }: RouteMapProps) {
  useEffect(() => {
    // Initialize map
    const map = L.map('route-map').setView([33.6844, 73.0479], 10); // Default to Islamabad

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Add markers for stops
    const markers: L.Marker[] = [];
    const latlngs: [number, number][] = [];

    route.stops.forEach((stop, index) => {
      const marker = L.marker([stop.coordinates.latitude, stop.coordinates.longitude])
        .addTo(map)
        .bindPopup(`<b>${stop.stopName}</b><br/>Stop ${index + 1}`);

      markers.push(marker);
      latlngs.push([stop.coordinates.latitude, stop.coordinates.longitude]);
    });

    // Draw polyline connecting stops
    if (latlngs.length > 1) {
      L.polyline(latlngs, {
        color: 'blue',
        weight: 3,
        opacity: 0.7
      }).addTo(map);
    }

    // Fit map to show all markers
    if (markers.length > 0) {
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.1));
    }

    // Cleanup function
    return () => {
      map.remove();
    };
  }, [route]);

  return <div id="route-map" className="h-full w-full" />;
}