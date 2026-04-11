// Type declarations for components
declare module '@/components/MapComponent' {
  import { ComponentType } from 'react';

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

  const MapComponent: ComponentType<MapComponentProps>;
  export default MapComponent;
}