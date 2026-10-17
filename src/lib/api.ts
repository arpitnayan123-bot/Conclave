"use client";

import { useMemberStore } from "@/lib/store";

export type ApiOptions = {
  method?: string;
  body?: unknown;
  /** Explicit bearer token override (e.g. admin token) */
  token?: string;
};

export async function api<T = unknown>(path: string, opts: ApiOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const memberToken = useMemberStore.getState().token;
  const adminToken =
    typeof window !== "undefined" ? window.localStorage.getItem("conclave-admin-token") : null;
  // Admin-only routes must never be shadowed by a member token (fixes 401 loop
  // when a logged-in member opens the admin console in the same browser).
  const isAdminPath =
    path.startsWith("/admin") || path.startsWith("/applications") || path.startsWith("/invites");
  const token =
    opts.token || (isAdminPath ? adminToken || memberToken : memberToken || adminToken);
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`/api${path}`, {
    method: opts.method || (opts.body !== undefined ? "POST" : "GET"),
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  }
  return data as T;
}

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("conclave-admin-token");
}
