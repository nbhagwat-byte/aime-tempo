import type { Language, User, UserRole, Project, TimeLog, TimeCorrection, PendingProject, WorkNotification } from '@/app/types';
import { supabase } from '@/app/utils/supabaseClient';

function assertOk<T>(res: { data: T | null; error: unknown }, fallbackMsg: string): T {
  if (res.error || res.data == null) {
    const msg = res.error instanceof Error ? res.error.message : fallbackMsg;
    throw new Error(msg);
  }
  return res.data;
}

function mapProject(row: {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  radius: number;
  active: boolean;
  is_pending: boolean;
  notes: string | null;
  project_status: 'in_progress' | 'complete';
}): Project {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    location: { lat: Number(row.latitude ?? 0), lng: Number(row.longitude ?? 0) },
    radius: Number(row.radius ?? 0),
    active: Boolean(row.active),
    isPending: Boolean(row.is_pending),
    notes: row.notes ?? undefined,
    projectStatus: row.project_status,
  };
}

function mapTimeLog(row: {
  id: string;
  user_id: string;
  project_id: string;
  check_in: string;
  check_out: string | null;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  status: TimeLog['status'];
  sync_status: TimeLog['syncStatus'];
}): TimeLog {
  return {
    id: row.id,
    userId: row.user_id,
    projectId: row.project_id,
    checkIn: row.check_in,
    checkOut: row.check_out ?? undefined,
    location: {
      lat: Number(row.latitude ?? 0),
      lng: Number(row.longitude ?? 0),
      accuracy: Number(row.accuracy ?? 0),
    },
    status: row.status,
    syncStatus: row.sync_status,
  };
}

function mapCorrection(row: {
  id: string;
  time_log_id: string;
  user_id: string;
  requested_time: string;
  original_time: string;
  type: TimeCorrection['type'];
  reason: string;
  status: TimeCorrection['status'];
  created_at: string;
  denial_reason: string | null;
}): TimeCorrection {
  return {
    id: row.id,
    timeLogId: row.time_log_id,
    userId: row.user_id,
    requestedTime: row.requested_time,
    originalTime: row.original_time,
    type: row.type,
    reason: row.reason,
    status: row.status,
    createdAt: row.created_at,
    denialReason: row.denial_reason ?? undefined,
  };
}

function mapPendingProject(row: {
  id: string;
  name: string;
  address: string;
  radius: number;
  status: PendingProject['status'];
  requested_by: string;
  created_at: string;
}): PendingProject {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    radius: Number(row.radius ?? 0),
    status: row.status,
    requestedBy: row.requested_by,
    createdAt: row.created_at,
  };
}

// --- Profiles (team) ---
export async function getUsers(): Promise<User[]> {
  const res = await supabase
    .from('profiles')
    .select('id, full_name, role, hourly_rate, language, created_at');
  const rows = assertOk(res, 'Unable to load team');
  return rows.map((r) => ({
    id: r.id,
    email: '', // email is from auth.users; not selectable with anon key
    name: r.full_name ?? 'User',
    role: r.role as UserRole,
    hourlyRate: Number(r.hourly_rate ?? 0),
    language: (r.language ?? 'en') as Language,
  }));
}

export async function saveUser(user: Pick<User, 'id' | 'name' | 'role' | 'hourlyRate' | 'language'>): Promise<void> {
  const { error } = await supabase.from('profiles').upsert({
    id: user.id,
    full_name: user.name,
    role: user.role,
    hourly_rate: user.hourlyRate,
    language: user.language,
  });
  if (error) throw error;
}

export async function deleteUser(id: string): Promise<void> {
  // Note: this only deletes the profile row. The auth user must be deleted via Supabase Dashboard (admin).
  const { error } = await supabase.from('profiles').delete().eq('id', id);
  if (error) throw error;
}

// --- Projects ---
export async function getProjects(): Promise<Project[]> {
  const res = await supabase
    .from('projects')
    .select('id, name, address, latitude, longitude, radius, active, is_pending, notes, project_status')
    .eq('is_pending', false)
    .order('created_at', { ascending: false });
  const rows = assertOk(res, 'Unable to load projects');
  return rows.map(mapProject);
}

export async function getProjectsForPainter(): Promise<Project[]> {
  const res = await supabase
    .from('projects')
    .select('id, name, address, latitude, longitude, radius, active, is_pending, notes, project_status')
    .eq('is_pending', false)
    .eq('active', true)
    .neq('project_status', 'complete')
    .order('created_at', { ascending: false });
  const rows = assertOk(res, 'Unable to load projects');
  return rows.map(mapProject);
}

export async function saveProject(project: Project): Promise<void> {
  const payload = {
    id: project.id,
    name: project.name,
    address: project.address,
    latitude: project.location.lat,
    longitude: project.location.lng,
    radius: project.radius,
    active: project.active,
    is_pending: Boolean(project.isPending),
    notes: project.notes ?? null,
    project_status: project.projectStatus ?? 'in_progress',
  };
  const { error } = await supabase.from('projects').upsert(payload);
  if (error) throw error;
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw error;
}

// --- Time logs ---
export async function getTimeLogs(): Promise<TimeLog[]> {
  const res = await supabase
    .from('time_logs')
    .select('id, user_id, project_id, check_in, check_out, latitude, longitude, accuracy, status, sync_status')
    .order('check_in', { ascending: false });
  const rows = assertOk(res, 'Unable to load time logs');
  return rows.map(mapTimeLog);
}

export async function getUserTimeLogs(userId: string): Promise<TimeLog[]> {
  const res = await supabase
    .from('time_logs')
    .select('id, user_id, project_id, check_in, check_out, latitude, longitude, accuracy, status, sync_status')
    .eq('user_id', userId)
    .order('check_in', { ascending: false });
  const rows = assertOk(res, 'Unable to load time logs');
  return rows.map(mapTimeLog);
}

export async function getActiveTimeLog(userId: string): Promise<TimeLog | null> {
  const res = await supabase
    .from('time_logs')
    .select('id, user_id, project_id, check_in, check_out, latitude, longitude, accuracy, status, sync_status')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('check_in', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (res.error) throw res.error;
  return res.data ? mapTimeLog(res.data) : null;
}

export async function saveTimeLog(log: TimeLog): Promise<void> {
  const payload = {
    id: log.id,
    user_id: log.userId,
    project_id: log.projectId,
    check_in: log.checkIn,
    check_out: log.checkOut ?? null,
    latitude: log.location.lat,
    longitude: log.location.lng,
    accuracy: log.location.accuracy,
    status: log.status,
    sync_status: log.syncStatus,
  };
  const { error } = await supabase.from('time_logs').upsert(payload);
  if (error) throw error;
}

// --- Time corrections ---
export async function getTimeCorrections(): Promise<TimeCorrection[]> {
  const res = await supabase
    .from('time_corrections')
    .select('id, time_log_id, user_id, requested_time, original_time, type, reason, status, created_at, denial_reason')
    .order('created_at', { ascending: false });
  const rows = assertOk(res, 'Unable to load corrections');
  return rows.map(mapCorrection);
}

export async function saveTimeCorrection(correction: TimeCorrection): Promise<void> {
  const payload = {
    id: correction.id,
    time_log_id: correction.timeLogId,
    user_id: correction.userId,
    requested_time: correction.requestedTime,
    original_time: correction.originalTime,
    type: correction.type,
    reason: correction.reason,
    status: correction.status,
    denial_reason: correction.denialReason ?? null,
  };
  const { error } = await supabase.from('time_corrections').upsert(payload);
  if (error) throw error;
}

// --- Pending projects ---
export async function getPendingProjects(): Promise<PendingProject[]> {
  const res = await supabase
    .from('pending_projects')
    .select('id, name, address, radius, status, requested_by, created_at')
    .order('created_at', { ascending: false });
  const rows = assertOk(res, 'Unable to load pending projects');
  return rows.map(mapPendingProject);
}

export async function savePendingProject(project: PendingProject): Promise<void> {
  const payload = {
    id: project.id,
    name: project.name,
    address: project.address,
    radius: project.radius,
    status: project.status,
    requested_by: project.requestedBy,
  };
  const { error } = await supabase.from('pending_projects').upsert(payload);
  if (error) throw error;
}

export async function deletePendingProject(id: string): Promise<void> {
  const { error } = await supabase.from('pending_projects').delete().eq('id', id);
  if (error) throw error;
}

// --- Work notifications ---
export async function isWorkNotificationDismissed(userId: string): Promise<boolean> {
  const res = await supabase
    .from('work_notifications')
    .select('id, dismissed')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (res.error) throw res.error;
  return res.data?.dismissed ?? false;
}

export async function setWorkNotificationDismissed(userId: string, dismissed: boolean): Promise<void> {
  // Upsert a notification marker for the user.
  const payload: WorkNotification = {
    userId,
    dismissed,
    timestamp: new Date().toISOString(),
  };
  const { error } = await supabase.from('work_notifications').insert({
    user_id: payload.userId,
    dismissed: payload.dismissed,
    timestamp: payload.timestamp,
  });
  if (error) throw error;
}

export function calculateHours(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn).getTime();
  const b = new Date(checkOut).getTime();
  return (b - a) / (1000 * 60 * 60);
}

export function roundToQuarterHour(date: Date): Date {
  const ms = date.getTime();
  const quarter = 15 * 60 * 1000;
  return new Date(Math.round(ms / quarter) * quarter);
}

export function isWithinGeofence(
  userLoc: { lat: number; lng: number },
  projectLoc: { lat: number; lng: number },
  radius: number
): boolean {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (projectLoc.lat * Math.PI) / 180;
  const φ2 = (userLoc.lat * Math.PI) / 180;
  const Δφ = ((userLoc.lat - projectLoc.lat) * Math.PI) / 180;
  const Δλ = ((userLoc.lng - projectLoc.lng) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c <= radius;
}

export function getCurrentLocation(): Promise<{ lat: number; lng: number; accuracy: number }> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation is not available on this device/browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => reject(new Error(err.message || 'Unable to get current location')),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}

export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number }> {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
  );
  const data = await response.json();
  if (!Array.isArray(data) || data.length === 0) throw new Error('Address not found');
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}
