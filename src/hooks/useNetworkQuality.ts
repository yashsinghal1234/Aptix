"use client";

import { useState, useEffect, useCallback } from "react";

export interface NetworkQuality {
  isLowNetwork: boolean;
  isOffline: boolean;
  effectiveType: "slow-2g" | "2g" | "3g" | "4g" | "unknown";
  saveData: boolean;
  rtt?: number;
  downlink?: number;
  manualLiteMode: boolean;
  toggleLiteMode: () => void;
}

export function useNetworkQuality(): NetworkQuality {
  const [effectiveType, setEffectiveType] = useState<NetworkQuality["effectiveType"]>("unknown");
  const [saveData, setSaveData] = useState<boolean>(false);
  const [rtt, setRtt] = useState<number | undefined>(undefined);
  const [downlink, setDownlink] = useState<number | undefined>(undefined);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [manualLiteMode, setManualLiteMode] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Check saved user preference for Lite Mode
    try {
      const savedPref = localStorage.getItem("aptix_lite_mode");
      if (savedPref === "true") {
        setManualLiteMode(true);
      }
    } catch (e) {}

    // 2. Initial offline check
    setIsOffline(!navigator.onLine);

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // 3. Network Information API (Chrome, Edge, Opera, Samsung Internet, Android)
    const nav = navigator as any;
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;

    const updateConnectionInfo = () => {
      if (connection) {
        setEffectiveType(connection.effectiveType || "unknown");
        setSaveData(Boolean(connection.saveData));
        setRtt(connection.rtt);
        setDownlink(connection.downlink);
      }
    };

    updateConnectionInfo();

    if (connection) {
      connection.addEventListener?.("change", updateConnectionInfo);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (connection) {
        connection.removeEventListener?.("change", updateConnectionInfo);
      }
    };
  }, []);

  const toggleLiteMode = useCallback(() => {
    setManualLiteMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("aptix_lite_mode", String(next));
      } catch (e) {}
      return next;
    });
  }, []);

  // System is considered low network if:
  // - User manually toggled Lite Mode
  // - Browser reports saveData: true
  // - Effective type is 2G, slow-2G, or high latency 3G (>400ms RTT or <0.5 Mbps downlink)
  const isAutoLowNetwork =
    saveData ||
    effectiveType === "slow-2g" ||
    effectiveType === "2g" ||
    effectiveType === "3g" ||
    (typeof rtt === "number" && rtt > 400) ||
    (typeof downlink === "number" && downlink < 0.6);

  const isLowNetwork = manualLiteMode || isAutoLowNetwork || isOffline;

  return {
    isLowNetwork,
    isOffline,
    effectiveType,
    saveData,
    rtt,
    downlink,
    manualLiteMode,
    toggleLiteMode,
  };
}
