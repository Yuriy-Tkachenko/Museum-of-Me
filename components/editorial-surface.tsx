"use client";
import { useEffect, useState, type ReactNode } from "react";

// Translation must wait for this page's React tree to finish hydrating.
export function EditorialSurface({ children, className }: { children: ReactNode; className: string }) {
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);
  return <main className={className} data-locale-ready={ready ? "true" : "false"}>{children}</main>;
}
