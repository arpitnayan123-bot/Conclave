"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import Landing from "@/components/landing/Landing";
import ClubView from "@/components/club/ClubView";
import SubmitView from "@/components/submit/SubmitView";
import AdminView from "@/components/admin/AdminView";
import JoinView from "@/components/join/JoinView";
import PlatformView from "@/components/platform/PlatformView";

export type RouteInfo = {
  view: string;
  params: URLSearchParams;
};

function subscribeHash(callback: () => void) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}

function parseHashFrom(hash: string): RouteInfo {
  const clean = hash.replace(/^#\/?/, "");
  const [path, qs] = clean.split("?");
  return { view: path || "landing", params: new URLSearchParams(qs || "") };
}

export default function Home() {
  const hash = useSyncExternalStore(
    subscribeHash,
    () => window.location.hash,
    () => ""
  );

  const route = useMemo(() => parseHashFrom(hash), [hash]);

  // Scroll to top whenever the view changes (no state updates here).
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [route.view]);

  return (
    <div key={route.view} className="animate-view-in">
      {renderView(route)}
    </div>
  );
}

function renderView(route: RouteInfo) {
  switch (route.view) {
    case "submit":
      return <SubmitView />;
    case "admin":
      return <AdminView />;
    case "join":
      return <JoinView token={route.params.get("token") || ""} />;
    case "platform":
      return <PlatformView initialIdeaId={route.params.get("idea")} />;
    case "club":
      return <ClubView />;
    default:
      return <Landing />;
  }
}
