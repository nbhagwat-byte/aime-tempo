export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'painter' | 'supervisor';
  hourlyRate: number;
  language: 'en' | 'es';
}

export interface Project {
  id: string;
  name: string;
  address: string;
  location: {
    lat: number;
    lng: number;
  };
  radius: number;
  active: boolean;
  isPending?: boolean;
  notes?: string;
  /** Project lifecycle: in_progress (default) or complete. Completed projects are hidden from painter check-in dropdown. */
  projectStatus?: 'in_progress' | 'complete';
}

export interface TimeLog {
  id: string;
  userId: string;
  projectId: string;
  checkIn: string;
  checkOut?: string;
  location: {
    lat: number;
    lng: number;
    accuracy: number;
  };
  status: 'active' | 'completed' | 'pending_correction' | 'pending_review';
  syncStatus: 'synced' | 'pending';
}

export interface TimeCorrection {
  id: string;
  timeLogId: string;
  userId: string;
  requestedTime: string;
  originalTime: string;
  type: 'check_in' | 'check_out';
  reason: string;
  status: 'pending' | 'approved' | 'denied';
  createdAt: string;
  denialReason?: string;
}

export interface PendingProject {
  id: string;
  name: string;
  address: string;
  radius: number;
  status: 'pending' | 'approved' | 'denied';
  requestedBy: string;
  createdAt: string;
}

export interface WorkNotification {
  userId: string;
  dismissed: boolean;
  timestamp: string;
}

export interface PayrollEntry {
  userId: string;
  userName: string;
  totalHours: number;
  hourlyRate: number;
  totalCost: number;
  projectsWorked?: number;
}
