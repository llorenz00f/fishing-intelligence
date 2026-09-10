"use client";

import { useEffect, useRef, useState } from "react";
import { OfflineIndicator } from "@/components/ui/ProductPrimitives";

export function PwaController() {
  const [offline, setOffline] = useState(false);
  const banner = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = banner.current;
    if (!element) return;
    const measure = () => document.documentElement.style.setProperty("--offline-banner-height", `${element.getBoundingClientRect().height}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => { observer.disconnect(); document.documentElement.style.removeProperty("--offline-banner-height"); };
  }, [offline]);

  useEffect(() => {
    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    const initialCheck = window.setTimeout(() => setOffline(!navigator.onLine), 0);

    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
    }

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.clearTimeout(initialCheck);
    };
  }, []);

  if (!offline) return null;
  return <div ref={banner}><OfflineIndicator /></div>;
}
