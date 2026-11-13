import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { ScreeningResult, HistoryItem, ScreeningInput, DeviceConnection, DeviceMetrics } from '@/lib/types';

interface StoredScreening {
  id: string;
  created_at: string;
  health_score: number;
  risk_category: string;
  result: ScreeningResult;
}

export interface PendingScreening {
  local_id: string;
  created_at: string;
  input: ScreeningInput;
}

interface DriDB extends DBSchema {
  screenings: {
    key: string;
    value: StoredScreening;
    indexes: { 'by-created': string };
  };
  pending: {
    key: string;
    value: PendingScreening;
    indexes: { 'by-created': string };
  };
}

let dbPromise: Promise<IDBPDatabase<DriDB>> | null = null;

function getDb() {
  if (typeof indexedDB === 'undefined') return null;
  if (!dbPromise) {
    dbPromise = openDB<DriDB>('dri-offline', 2, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('screenings')) {
          const store = db.createObjectStore('screenings', { keyPath: 'id' });
          store.createIndex('by-created', 'created_at');
        }
        if (!db.objectStoreNames.contains('pending')) {
          const pending = db.createObjectStore('pending', { keyPath: 'local_id' });
          pending.createIndex('by-created', 'created_at');
        }
      },
    });
  }
  return dbPromise;
}

function newLocalId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function saveLocalScreening(result: ScreeningResult): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.put('screenings', {
    id: result.id,
    created_at: result.created_at,
    health_score: result.health_score,
    risk_category: result.risk_category,
    result,
  });
}

export async function listLocalScreenings(): Promise<HistoryItem[]> {
  const db = await getDb();
  if (!db) return [];
  const all = await db.getAllFromIndex('screenings', 'by-created');
  return all
    .reverse()
    .map((s) => ({
      id: s.id,
      created_at: s.created_at,
      health_score: s.health_score,
      risk_category: s.risk_category,
      glucose_mg_dl: s.result?.input?.glucose_mg_dl ?? undefined,
      sbp: s.result?.input?.sbp ?? undefined,
      dbp: s.result?.input?.dbp ?? undefined,
    }));
}

export async function getLocalScreening(id: string): Promise<ScreeningResult | null> {
  const db = await getDb();
  if (!db) return null;
  const row = await db.get('screenings', id);
  return row?.result ?? null;
}

export async function clearLocalScreenings(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.clear('screenings');
}

// --- Offline queue ---------------------------------------------------------

export async function enqueuePending(input: ScreeningInput): Promise<PendingScreening | null> {
  const db = await getDb();
  if (!db) return null;
  const item: PendingScreening = {
    local_id: newLocalId(),
    created_at: new Date().toISOString(),
    input,
  };
  await db.put('pending', item);
  return item;
}

export async function listPending(): Promise<PendingScreening[]> {
  const db = await getDb();
  if (!db) return [];
  const all = await db.getAllFromIndex('pending', 'by-created');
  return all;
}

export async function countPending(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  return db.count('pending');
}

export async function removePending(localId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete('pending', localId);
}


// --- Local device simulation & storage --------------------------------------

const LOCAL_DEVICES_KEY = 'dri_local_devices';

function getInitialDeviceMetrics(provider: string): DeviceMetrics {
  switch (provider) {
    case 'dexcom':
      return {
        glucose_mg_dl: 104,
        glucose_trend: '→',
        time_in_range_pct: 92,
        sensor_days_left: 7,
      };
    case 'libre':
      return {
        glucose_mg_dl: 98,
        glucose_trend: '↘',
        time_in_range_pct: 95,
        sensor_days_left: 11,
      };
    case 'apple_health':
      return {
        sbp: 118,
        dbp: 76,
        steps: 8420,
        resting_hr: 66,
        sleep_hours: 7.5,
      };
    case 'google_fit':
      return {
        sbp: 122,
        dbp: 78,
        steps: 7890,
        resting_hr: 68,
        sleep_hours: 7.2,
      };
    default:
      return {};
  }
}

function refreshDeviceMetrics(provider: string, prev?: DeviceMetrics): DeviceMetrics {
  switch (provider) {
    case 'dexcom': {
      const delta = Math.floor(Math.random() * 9) - 4;
      const newG = Math.max(85, Math.min(135, (prev?.glucose_mg_dl ?? 104) + delta));
      const trend = delta > 2 ? '↗' : delta < -2 ? '↘' : '→';
      return {
        glucose_mg_dl: newG,
        glucose_trend: trend,
        time_in_range_pct: Math.min(100, Math.max(80, (prev?.time_in_range_pct ?? 92) + (delta > 0 ? -1 : 1))),
        sensor_days_left: prev?.sensor_days_left ?? 7,
      };
    }
    case 'libre': {
      const delta = Math.floor(Math.random() * 7) - 3;
      const newG = Math.max(80, Math.min(130, (prev?.glucose_mg_dl ?? 98) + delta));
      const trend = delta > 2 ? '↗' : delta < -2 ? '↘' : '→';
      return {
        glucose_mg_dl: newG,
        glucose_trend: trend,
        time_in_range_pct: 95,
        sensor_days_left: prev?.sensor_days_left ?? 11,
      };
    }
    case 'apple_health': {
      const stepBump = Math.floor(Math.random() * 350) + 50;
      return {
        sbp: Math.floor(Math.random() * 6) + 116,
        dbp: Math.floor(Math.random() * 4) + 74,
        steps: (prev?.steps ?? 8420) + stepBump,
        resting_hr: Math.floor(Math.random() * 5) + 64,
        sleep_hours: 7.5,
      };
    }
    case 'google_fit': {
      const stepBump = Math.floor(Math.random() * 300) + 40;
      return {
        sbp: Math.floor(Math.random() * 6) + 120,
        dbp: Math.floor(Math.random() * 4) + 76,
        steps: (prev?.steps ?? 7890) + stepBump,
        resting_hr: Math.floor(Math.random() * 5) + 66,
        sleep_hours: 7.2,
      };
    }
    default:
      return prev ?? {};
  }
}

export function listLocalDevices(): DeviceConnection[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_DEVICES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalDevice(provider: string): DeviceConnection {
  const list = listLocalDevices();
  const existing = list.find((d) => d.provider === provider);
  if (existing) {
    existing.is_active = true;
    existing.last_sync_at = new Date().toISOString();
    existing.metrics = refreshDeviceMetrics(provider, existing.metrics);
    localStorage.setItem(LOCAL_DEVICES_KEY, JSON.stringify(list));
    return existing;
  }
  const newDev: DeviceConnection = {
    id: 'local-dev-' + provider + '-' + Date.now(),
    user_id: 'local-user',
    provider,
    is_active: true,
    created_at: new Date().toISOString(),
    last_sync_at: new Date().toISOString(),
    metrics: getInitialDeviceMetrics(provider),
  };
  list.push(newDev);
  localStorage.setItem(LOCAL_DEVICES_KEY, JSON.stringify(list));
  return newDev;
}

export function deleteLocalDevice(id: string): void {
  const list = listLocalDevices().filter((d) => d.id !== id);
  localStorage.setItem(LOCAL_DEVICES_KEY, JSON.stringify(list));
}

export function syncLocalDevice(id: string): { status: string; synced_records: number; device: DeviceConnection } {
  const list = listLocalDevices();
  const dev = list.find((d) => d.id === id);
  if (!dev) {
    return { status: 'not_found', synced_records: 0, device: {} as DeviceConnection };
  }
  dev.last_sync_at = new Date().toISOString();
  dev.metrics = refreshDeviceMetrics(dev.provider, dev.metrics);
  localStorage.setItem(LOCAL_DEVICES_KEY, JSON.stringify(list));
  return { status: 'success', synced_records: Math.floor(Math.random() * 8) + 8, device: dev };
}

const PREFILL_KEY = 'dri_biometric_prefill';

export function setBiometricPrefill(data: { glucose_mg_dl?: number; sbp?: number; dbp?: number; source?: string }): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PREFILL_KEY, JSON.stringify(data));
}

export function getBiometricPrefill(): { glucose_mg_dl?: number; sbp?: number; dbp?: number; source?: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PREFILL_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearBiometricPrefill(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(PREFILL_KEY);
}
