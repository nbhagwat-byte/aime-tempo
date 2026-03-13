import type {
  User,
  Project,
  TimeLog,
  TimeCorrection,
  PendingProject,
  WorkNotification,
} from '@/app/types';

const PREFIX = 'aime_tempo_';
const USERS_KEY = PREFIX + 'users';
const PROJECTS_KEY = PREFIX + 'projects';
const TIMELOGS_KEY = PREFIX + 'timelogs';
const CORRECTIONS_KEY = PREFIX + 'corrections';
const PENDING_PROJECTS_KEY = PREFIX + 'pending_projects';
const WORK_NOTIFICATIONS_KEY = PREFIX + 'work_notifications';
const CURRENT_USER_KEY = PREFIX + 'current_user';
const INIT_FLAG_KEY = PREFIX + 'initialized';

// --- Mock data ---
function getMockUsers(): User[] {
  return [
    {
      id: 'u-supervisor',
      name: 'Maria Supervisor',
      email: 'supervisor@demo.com',
      password: 'demo123',
      role: 'supervisor',
      hourlyRate: 45,
      language: 'en',
    },
    ...Array.from({ length: 9 }, (_, i) => ({
      id: `u-painter-${i + 1}`,
      name: `Painter ${i + 1}`,
      email: i === 0 ? 'painter@demo.com' : `painter${i + 1}@demo.com`,
      password: 'demo123',
      role: 'painter' as const,
      hourlyRate: 28 + (i % 3) * 2,
      language: (i % 2 === 0 ? 'en' : 'es') as 'en' | 'es',
    })),
  ];
}

function getMockProjects(): Project[] {
  return [
    {
      id: 'proj-1',
      name: 'Manhattan Tower A',
      address: '350 5th Ave, New York, NY 10118',
      location: { lat: 40.7484, lng: -73.9857 },
      radius: 150,
      active: true,
      projectStatus: 'in_progress',
    },
    {
      id: 'proj-2',
      name: 'Brooklyn Heights Renovation',
      address: '1 Cadman Plaza W, Brooklyn, NY 11201',
      location: { lat: 40.6953, lng: -73.9896 },
      radius: 100,
      active: true,
      projectStatus: 'in_progress',
    },
    {
      id: 'proj-3',
      name: 'Queens Blvd Office',
      address: '1 Queens Blvd, Long Island City, NY 11101',
      location: { lat: 40.7424, lng: -73.9376 },
      radius: 200,
      active: true,
      projectStatus: 'in_progress',
    },
    {
      id: 'proj-4',
      name: 'Bronx Warehouse',
      address: '610 Exterior St, Bronx, NY 10451',
      location: { lat: 40.8236, lng: -73.9236 },
      radius: 120,
      active: true,
      projectStatus: 'in_progress',
    },
    {
      id: 'proj-5',
      name: 'Staten Island Mall',
      address: '2655 Richmond Ave, Staten Island, NY 10314',
      location: { lat: 40.5834, lng: -74.1596 },
      radius: 180,
      active: true,
      projectStatus: 'in_progress',
    },
  ];
}

function getMockTimeLogs(): TimeLog[] {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  return [
    {
      id: 'log-1',
      userId: 'u-painter-1',
      projectId: 'proj-1',
      checkIn: `${today}T08:00:00.000Z`,
      checkOut: `${today}T12:00:00.000Z`,
      location: { lat: 40.7484, lng: -73.9857, accuracy: 12 },
      status: 'completed',
      syncStatus: 'synced',
    },
    {
      id: 'log-2',
      userId: 'u-painter-1',
      projectId: 'proj-1',
      checkIn: `${today}T13:00:00.000Z`,
      checkOut: `${today}T17:30:00.000Z`,
      location: { lat: 40.7485, lng: -73.9856, accuracy: 15 },
      status: 'completed',
      syncStatus: 'synced',
    },
  ];
}

function initializeMockData(): void {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem(INIT_FLAG_KEY)) return;
  localStorage.setItem(USERS_KEY, JSON.stringify(getMockUsers()));
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(getMockProjects()));
  localStorage.setItem(TIMELOGS_KEY, JSON.stringify(getMockTimeLogs()));
  localStorage.setItem(CORRECTIONS_KEY, JSON.stringify([]));
  localStorage.setItem(PENDING_PROJECTS_KEY, JSON.stringify([]));
  localStorage.setItem(WORK_NOTIFICATIONS_KEY, JSON.stringify([]));
  localStorage.setItem(INIT_FLAG_KEY, 'true');
}

// --- Core CRUD ---
export function getUsers(): User[] {
  initializeMockData();
  const raw = localStorage.getItem(USERS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function saveUser(user: User): void {
  const users = getUsers().filter((u) => u.id !== user.id);
  users.push(user);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function deleteUser(id: string): void {
  const users = getUsers().filter((u) => u.id !== id);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function getProjects(): Project[] {
  initializeMockData();
  const raw = localStorage.getItem(PROJECTS_KEY);
  return raw ? JSON.parse(raw) : [];
}

/** Projects visible in painter app dropdown (active and in progress only; completed are hidden). */
export function getProjectsForPainter(): Project[] {
  return getProjects().filter(
    (p) => p.active && p.projectStatus !== 'complete'
  );
}

export function saveProject(project: Project): void {
  const projects = getProjects().filter((p) => p.id !== project.id);
  projects.push(project);
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

export function deleteProject(id: string): void {
  const projects = getProjects().filter((p) => p.id !== id);
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

export function getTimeLogs(): TimeLog[] {
  initializeMockData();
  const raw = localStorage.getItem(TIMELOGS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function saveTimeLog(log: TimeLog): void {
  const logs = getTimeLogs().filter((l) => l.id !== log.id);
  logs.push(log);
  localStorage.setItem(TIMELOGS_KEY, JSON.stringify(logs));
}

export function getTimeCorrections(): TimeCorrection[] {
  initializeMockData();
  const raw = localStorage.getItem(CORRECTIONS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function saveTimeCorrection(correction: TimeCorrection): void {
  const list = getTimeCorrections().filter((c) => c.id !== correction.id);
  list.push(correction);
  localStorage.setItem(CORRECTIONS_KEY, JSON.stringify(list));
}

export function getPendingProjects(): PendingProject[] {
  initializeMockData();
  const raw = localStorage.getItem(PENDING_PROJECTS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function savePendingProject(project: PendingProject): void {
  const list = getPendingProjects().filter((p) => p.id !== project.id);
  list.push(project);
  localStorage.setItem(PENDING_PROJECTS_KEY, JSON.stringify(list));
}

export function deletePendingProject(id: string): void {
  const list = getPendingProjects().filter((p) => p.id !== id);
  localStorage.setItem(PENDING_PROJECTS_KEY, JSON.stringify(list));
}

function getWorkNotificationsRaw(): WorkNotification[] {
  initializeMockData();
  const raw = localStorage.getItem(WORK_NOTIFICATIONS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function setWorkNotificationDismissed(userId: string, dismissed: boolean): void {
  const list = getWorkNotificationsRaw();
  const existing = list.find((n) => n.userId === userId);
  const entry: WorkNotification = {
    userId,
    dismissed,
    timestamp: new Date().toISOString(),
  };
  if (existing) {
    const next = list.map((n) => (n.userId === userId ? entry : n));
    localStorage.setItem(WORK_NOTIFICATIONS_KEY, JSON.stringify(next));
  } else {
    localStorage.setItem(WORK_NOTIFICATIONS_KEY, JSON.stringify([...list, entry]));
  }
}

export function isWorkNotificationDismissed(userId: string): boolean {
  const list = getWorkNotificationsRaw();
  const n = list.find((x) => x.userId === userId);
  return n?.dismissed ?? false;
}

// --- Helpers ---
export function getCurrentUser(): User | null {
  const raw = localStorage.getItem(CURRENT_USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function setCurrentUser(user: User | null): void {
  if (user) localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(CURRENT_USER_KEY);
}

export function getActiveTimeLog(userId: string): TimeLog | null {
  return getTimeLogs().find((l) => l.userId === userId && l.status === 'active') ?? null;
}

export function getUserTimeLogs(userId: string): TimeLog[] {
  return getTimeLogs().filter((l) => l.userId === userId);
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

export function getMockLocation(): Promise<{ lat: number; lng: number; accuracy: number }> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        lat: 40.7128 + (Math.random() - 0.5) * 0.001,
        lng: -74.006 + (Math.random() - 0.5) * 0.001,
        accuracy: 10 + Math.random() * 20,
      });
    }, 1500);
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
