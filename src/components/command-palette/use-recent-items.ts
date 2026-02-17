"use client";

import { useCallback, useSyncExternalStore } from "react";

export type RecentItem = {
  id: string;
  type: string;
  label: string;
  href: string;
  icon: string;
  timestamp: number;
};

const STORAGE_KEY = "velvet:cmd-recent";
const MAX_ITEMS = 8;

let listeners: Array<() => void> = [];

function emitChange() {
  for (const listener of listeners) listener();
}

function getSnapshot(): RecentItem[] {
  if (typeof window === "undefined") return SERVER_SNAPSHOT;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RecentItem[]) : SERVER_SNAPSHOT;
  } catch {
    return SERVER_SNAPSHOT;
  }
}

function subscribe(listener: () => void) {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

const SERVER_SNAPSHOT: RecentItem[] = [];
const UNINITIALIZED = Symbol();

let cachedSnapshot: RecentItem[] = SERVER_SNAPSHOT;
let cachedRaw: string | null | typeof UNINITIALIZED = UNINITIALIZED;

function getSnapshotStable(): RecentItem[] {
  if (typeof window === "undefined") return SERVER_SNAPSHOT;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedSnapshot = getSnapshot();
  }
  return cachedSnapshot;
}

function getServerSnapshot(): RecentItem[] {
  return SERVER_SNAPSHOT;
}

export function addRecentItem(item: Omit<RecentItem, "timestamp">) {
  const items = getSnapshot().filter((i) => i.id !== item.id);
  items.unshift({ ...item, timestamp: Date.now() });
  const trimmed = items.slice(0, MAX_ITEMS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  cachedRaw = null;
  emitChange();
}

export function useRecentItems(): RecentItem[] {
  return useSyncExternalStore(subscribe, getSnapshotStable, getServerSnapshot);
}

export function useAddRecent() {
  return useCallback((item: Omit<RecentItem, "timestamp">) => {
    addRecentItem(item);
  }, []);
}
