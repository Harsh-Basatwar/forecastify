"use client";

export interface LocalActivity {
  id: string;
  userId: string;
  activityType: string;
  title: string;
  description?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

const MAX_ACTIVITIES = 80;

function storageKey(userId: string) {
  return `forecastify-local-activity:${userId}`;
}

function canUseStorage() {
  return typeof window !== "undefined" && !!window.localStorage;
}

export function getLocalActivities(userId: string, hours = 24): LocalActivity[] {
  if (!userId || !canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    return parsed
      .filter((item: LocalActivity) => item?.createdAt && new Date(item.createdAt).getTime() >= cutoff)
      .sort((a: LocalActivity, b: LocalActivity) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch {
    return [];
  }
}

export function recordLocalActivity(
  userId: string,
  activity: Omit<LocalActivity, "id" | "userId" | "createdAt"> & { createdAt?: string }
) {
  if (!userId || !canUseStorage()) return null;
  const entry: LocalActivity = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    userId,
    createdAt: activity.createdAt || new Date().toISOString(),
    activityType: activity.activityType,
    title: activity.title,
    description: activity.description,
    metadata: activity.metadata,
  };
  const existing = getLocalActivities(userId, 24);
  const next = [entry, ...existing].slice(0, MAX_ACTIVITIES);
  window.localStorage.setItem(storageKey(userId), JSON.stringify(next));
  return entry;
}
