"use client";

// Mock "auth": which demo identity is active. Kept in localStorage (+ a cookie so the
// server can read it later). Replaced by Supabase Auth sessions in the next step.

import { useSyncExternalStore } from "react";
import type { DemoRole } from "./types";

const KEY = "saajha.demoRole";
const EVENT = "saajha:demo-role";
const ROLES: DemoRole[] = ["student", "student2", "partner", "owner", "manager", "admin"];

function read(): DemoRole | null {
  try {
    const v = localStorage.getItem(KEY);
    return ROLES.includes(v as DemoRole) ? (v as DemoRole) : null;
  } catch {
    return null;
  }
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function setDemoRole(role: DemoRole | null) {
  try {
    if (role) localStorage.setItem(KEY, role);
    else localStorage.removeItem(KEY);
  } catch {}
  document.cookie = role
    ? `${KEY}=${role}; path=/; max-age=604800; SameSite=Lax`
    : `${KEY}=; path=/; max-age=0; SameSite=Lax`;
  window.dispatchEvent(new Event(EVENT));
}

/** `undefined` until hydrated, then the stored role or `null`. */
export function useDemoRole(): DemoRole | null | undefined {
  return useSyncExternalStore(subscribe, read, () => undefined);
}
