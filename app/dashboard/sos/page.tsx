"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { formatDistanceToNow } from "date-fns";
import { COLLECTIONS } from "@/lib/collections";
import { db } from "@/lib/firebase";
import { SOSAlert } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Phone,
  CheckCircle,
  MapPin,
  Clock,
  User,
} from "lucide-react";

export default function SosPage() {
  const [alerts, setAlerts] = useState<SOSAlert[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<SOSAlert[]>([]);
  const [resolvedAlerts, setResolvedAlerts] = useState<SOSAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    const alertsQuery = query(
      collection(db, COLLECTIONS.SOS_ALERTS),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(alertsQuery, (snapshot) => {
      const allAlerts: SOSAlert[] = [];
      snapshot.forEach((doc) => {
        allAlerts.push({ ...doc.data(), alertId: doc.id } as SOSAlert);
      });

      setAlerts(allAlerts);
      setActiveAlerts(allAlerts.filter((alert) => alert.status === "active"));
      setResolvedAlerts(allAlerts.filter((alert) => alert.status === "resolved"));
      setLoading(false);

      // Check for new active alerts and show notifications
      const newActiveAlerts = allAlerts.filter(
        (alert) => alert.status === "active"
      );

      if (newActiveAlerts.length > 0) {
        showNotification(newActiveAlerts[0]);
        playAlertSound();
      }
    });

    return () => unsubscribe();
  }, []);

  const showNotification = (alert: SOSAlert) => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("🚨 SOS Alert!", {
        body: `${alert.studentName} sent an emergency alert on route ${alert.routeName}`,
        icon: "/favicon.ico",
        tag: `sos-${alert.alertId}`,
      });
    } else if ("Notification" in window && Notification.permission !== "denied") {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          new Notification("🚨 SOS Alert!", {
            body: `${alert.studentName} sent an emergency alert on route ${alert.routeName}`,
            icon: "/favicon.ico",
            tag: `sos-${alert.alertId}`,
          });
        }
      });
    }
  };

  const playAlertSound = () => {
    // Create a simple alert sound using Web Audio API
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.log("Audio not supported");
    }
  };

  const markResolved = async (alertId: string) => {
    if (!db) return;

    try {
      const alertRef = doc(db, COLLECTIONS.SOS_ALERTS, alertId);
      await updateDoc(alertRef, {
        status: "resolved",
        resolvedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error("Error marking alert as resolved:", error);
    }
  };

  const callStudent = (phone: string) => {
    window.open(`tel:${phone}`, "_blank");
  };

  const callDriver = (phone: string) => {
    window.open(`tel:${phone}`, "_blank");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-400 animate-pulse" />
          <p className="text-gray-600">Loading SOS alerts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active Alerts Banner */}
      {activeAlerts.length > 0 && (
        <div className="bg-red-600 text-white p-4 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
            <h2 className="text-lg font-semibold">
              {activeAlerts.length} Active Emergency Alert{activeAlerts.length > 1 ? "s" : ""}
            </h2>
          </div>
        </div>
      )}

      {/* Active Alerts Section */}
      {activeAlerts.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-gray-900">Active Emergency Alerts</h3>
          <div className="grid gap-4">
            {activeAlerts.map((alert) => (
              <Card key={alert.alertId} className="border-red-200 bg-red-50">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-red-600" />
                      </div>
                      <div className="space-y-2">
                        <div>
                          <h4 className="font-semibold text-gray-900">{alert.studentName}</h4>
                          <p className="text-sm text-gray-600">
                            Route: {alert.routeName} • Driver: {alert.driverName}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {formatDistanceToNow(alert.createdAt.toDate(), { addSuffix: true })}
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {alert.latitude.toFixed(6)}, {alert.longitude.toFixed(6)}
                          </div>
                        </div>
                        {alert.message && (
                          <p className="text-sm text-gray-700 bg-white p-2 rounded border">
                            "{alert.message}"
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Badge className="bg-red-100 text-red-800 border-red-200 animate-pulse">
                        <div className="w-2 h-2 bg-red-500 rounded-full mr-1"></div>
                        Active
                      </Badge>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => callStudent(alert.studentPhone)}
                          className="text-green-600 border-green-200 hover:bg-green-50"
                        >
                          <Phone className="w-4 h-4 mr-1" />
                          Call Student
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => callDriver(alert.driverPhone)}
                          className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        >
                          <Phone className="w-4 h-4 mr-1" />
                          Call Driver
                        </Button>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => markResolved(alert.alertId)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Mark Resolved
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Alert History */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-900">Alert History</h3>
        {resolvedAlerts.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-400" />
              <p className="text-gray-600">No resolved alerts yet</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Resolved Emergency Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Student</th>
                      <th className="text-left p-2">Route</th>
                      <th className="text-left p-2">Driver</th>
                      <th className="text-left p-2">Alert Time</th>
                      <th className="text-left p-2">Resolved Time</th>
                      <th className="text-left p-2">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resolvedAlerts.map((alert) => {
                      const alertTime = alert.createdAt.toDate();
                      const resolvedTime = alert.resolvedAt?.toDate();
                      const duration = resolvedTime
                        ? formatDistanceToNow(alertTime, { addSuffix: false })
                        : "Unknown";

                      return (
                        <tr key={alert.alertId} className="border-b hover:bg-gray-50">
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                <User className="w-4 h-4 text-gray-600" />
                              </div>
                              {alert.studentName}
                            </div>
                          </td>
                          <td className="p-2">{alert.routeName}</td>
                          <td className="p-2">{alert.driverName}</td>
                          <td className="p-2 text-sm">
                            {formatDistanceToNow(alertTime, { addSuffix: true })}
                          </td>
                          <td className="p-2 text-sm">
                            {resolvedTime
                              ? formatDistanceToNow(resolvedTime, { addSuffix: true })
                              : "N/A"}
                          </td>
                          <td className="p-2">
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              {duration}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
