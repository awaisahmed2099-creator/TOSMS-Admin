"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS } from "@/lib/collections";
import { formatDistanceToNow } from "date-fns";
import { useMockData, mockSOSAlerts } from "@/lib/mock";

type SOSAlert = {
  id: string;
  studentName: string;
  studentPhone: string;
  studentAvatar?: string;
  routeName: string;
  driverName: string;
  driverPhone: string;
  latitude: number;
  longitude: number;
  status: "active" | "resolved";
  createdAt: Date | any;
  resolvedAt?: Date | any;
};

function getDate(value: any) {
  if (!value) return null;
  if (typeof value?.toDate === "function") return value.toDate();
  if (value instanceof Date) return value;
  return new Date(value);
}


export default function SOSPage() {
  const [alerts, setAlerts] = useState<SOSAlert[]>([]);
  const prevCount = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 🔊 alert sound
  useEffect(() => {
    audioRef.current = new Audio(
      "https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg"
    );
  }, []);

  // 🔴 READ ONLY FIRESTORE LISTENER / MOCK DATA
  useEffect(() => {
    if (useMockData) {
      const mockAlerts = mockSOSAlerts.map((item) => ({
        id: item.alertId,
        studentName: item.studentName,
        studentPhone: item.studentPhone,
        studentAvatar: item.studentAvatar,
        routeName: item.routeName,
        driverName: item.driverName,
        driverPhone: item.driverPhone,
        latitude: item.latitude,
        longitude: item.longitude,
        status: item.status,
        createdAt: item.createdAt,
        resolvedAt: item.resolvedAt,
      }));
      setAlerts(mockAlerts);
      prevCount.current = mockAlerts.length;
      return;
    }

    const q = query(
      collection(db, COLLECTIONS.SOS_ALERTS),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const data: SOSAlert[] = snapshot.docs.map((doc) => {
        const d = doc.data() as any;

        return {
          id: doc.id,
          studentName: d.studentName,
          studentPhone: d.studentPhone,
          studentAvatar: d.studentAvatar,
          routeName: d.routeName,
          driverName: d.driverName,
          driverPhone: d.driverPhone,
          latitude: d.latitude,
          longitude: d.longitude,
          status: d.status,
          createdAt: d.createdAt,
          resolvedAt: d.resolvedAt,
        };
      });

      // 🚨 detect new alerts (NO WRITE)
      if (data.length > prevCount.current) {
        triggerNotification(data[0]);
        audioRef.current?.play();
      }

      prevCount.current = data.length;
      setAlerts(data);
    });

    return () => unsub();
  }, []);

  // 🔔 Browser notification
  const triggerNotification = (alert: SOSAlert) => {
    if (Notification.permission === "granted") {
      new Notification("🚨 SOS Alert", {
        body: `${alert.studentName} sent an emergency alert`,
      });
    }
  };

  // ask permission once
  useEffect(() => {
    if (Notification.permission !== "granted") {
      Notification.requestPermission();
    }
  }, []);

  // 🔴 ACTIVE
  const activeAlerts = useMemo(
    () => alerts.filter((a) => a.status === "active"),
    [alerts]
  );

  // 🟢 HISTORY
  const resolvedAlerts = useMemo(
    () => alerts.filter((a) => a.status === "resolved"),
    [alerts]
  );

  return (
    <div className="p-4 space-y-6">
      {useMockData && (
        <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-yellow-800">
          Mock SOS data is enabled for local testing.
        </div>
      )}

      {/* 🚨 ACTIVE BANNER */}
      {activeAlerts.length > 0 && (
        <div className="bg-red-600 text-white p-4 rounded-lg flex items-center justify-between animate-pulse">
          <div className="font-bold">
            🔴 {activeAlerts.length} Active Emergency Alerts
          </div>
          <div className="w-3 h-3 bg-white rounded-full animate-ping"></div>
        </div>
      )}

      {/* 🔴 ACTIVE ALERTS */}
      <div>
        <h2 className="text-xl font-bold mb-3">Active Alerts</h2>

        {activeAlerts.length === 0 ? (
          <p className="text-gray-500">No active SOS alerts</p>
        ) : (
          <div className="space-y-3">
            {activeAlerts.map((a) => (
              <div key={a.id} className="border p-4 rounded-lg bg-red-50">
                
                <div className="flex items-center gap-3">
                  <img
                    src={a.studentAvatar || "https://via.placeholder.com/40"}
                    className="w-10 h-10 rounded-full"
                  />

                  <div>
                    <div className="font-bold">{a.studentName}</div>
                    <div className="text-sm text-gray-600">
                      {a.routeName} • {a.driverName}
                    </div>
                  </div>

                  <span className="ml-auto text-xs bg-red-500 text-white px-2 py-1 rounded-full animate-pulse">
                    ACTIVE
                  </span>
                </div>

                <div className="text-sm mt-2 text-gray-600">
                  📍 {a.latitude}, {a.longitude}
                </div>

                <div className="text-xs text-gray-500">
                  {a.createdAt &&
                    formatDistanceToNow(getDate(a.createdAt)!, {
                      addSuffix: true,
                    })}
                </div>

                {/* CALL ONLY (SAFE) */}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() =>
                      window.open(`tel:${a.studentPhone}`)
                    }
                    className="px-3 py-1 bg-blue-500 text-white rounded"
                  >
                    Call Student
                  </button>

                  <button
                    onClick={() =>
                      window.open(`tel:${a.driverPhone}`)
                    }
                    className="px-3 py-1 bg-purple-500 text-white rounded"
                  >
                    Call Driver
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 🟢 HISTORY */}
      <div>
        <h2 className="text-xl font-bold mb-3">
          Resolved Alerts
        </h2>

        {resolvedAlerts.length === 0 ? (
          <p className="text-gray-500">No resolved alerts</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 text-left">Student</th>
                  <th>Route</th>
                  <th>Driver</th>
                  <th>Time</th>
                </tr>
              </thead>

              <tbody>
                {resolvedAlerts.map((a) => (
                  <tr key={a.id} className="border-t">
                    <td className="p-2">{a.studentName}</td>
                    <td>{a.routeName}</td>
                    <td>{a.driverName}</td>
                    <td>
                      {a.resolvedAt &&
                        formatDistanceToNow(
                          getDate(a.resolvedAt)!,
                          { addSuffix: true }
                        )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}