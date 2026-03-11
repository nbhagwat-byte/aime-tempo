import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { Calendar, Clock, Home, LogOut, MapPin, Send } from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useLanguage } from '@/app/contexts/LanguageContext';
import {
  getProjects,
  getPendingProjects,
  getActiveTimeLog,
  getMockLocation,
  saveTimeLog,
  roundToQuarterHour,
  isWithinGeofence,
  calculateHours,
  getUserTimeLogs,
} from '@/app/utils/dataManager';
import type { TimeLog } from '@/app/types';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { WorkNotificationBanner } from '@/app/components/painter/WorkNotificationBanner';
import { AddProjectDialog } from '@/app/components/painter/AddProjectDialog';
import { ShiftCorrectionDialog } from '@/app/components/painter/ShiftCorrectionDialog';
import { PainterCalendarView } from '@/app/components/painter/PainterCalendarView';
import { toast } from 'sonner';
import { format, isToday } from 'date-fns';

function getMapsUrl(address: string, lat?: number, lng?: number): string {
  if (lat != null && lng != null) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export default function PainterApp() {
  const { currentUser, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [activeLog, setActiveLog] = useState<TimeLog | null>(null);
  const [loading, setLoading] = useState(false);
  const [requestProjectOpen, setRequestProjectOpen] = useState(false);
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [view, setView] = useState<'landing' | 'calendar'>('landing');

  const projects = getProjects().filter((p) => p.active);
  const pendingProjects = getPendingProjects().filter((p) => p.status === 'pending');
  const allOptions = [
    ...projects.map((p) => ({ ...p, isPending: false })),
    ...pendingProjects.map((p) => ({ ...p, isPending: true, id: p.id, location: { lat: 0, lng: 0 }, active: true })),
  ];

  useEffect(() => {
    if (!currentUser) return;
    setActiveLog(getActiveTimeLog(currentUser.id));
  }, [currentUser]);

  useEffect(() => {
    const tick = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (allOptions.length === 1) setSelectedProjectId(allOptions[0].id);
  }, [allOptions.length]);

  if (!currentUser) return null;

  const handleCheckIn = async () => {
    if (!selectedProjectId) {
      toast.error(t('painter.selectProject'));
      return;
    }
    const proj = projects.find((p) => p.id === selectedProjectId) ?? pendingProjects.find((p) => p.id === selectedProjectId);
    if (!proj) return;
    setLoading(true);
    try {
      const loc = await getMockLocation();
      const approvedProj = getProjects().find((p) => p.id === selectedProjectId);
      const isPending = pendingProjects.some((p) => p.id === selectedProjectId);
      if (!isPending && approvedProj && !isWithinGeofence(loc, approvedProj.location, approvedProj.radius)) {
        toast.error(t('painter.outsideGeofence'));
        return;
      }
      if (loc.accuracy > 50) {
        toast.error(t('painter.gpsAccuracyPoor'));
        return;
      }
      const log: TimeLog = {
        id: `log-${Date.now()}`,
        userId: currentUser.id,
        projectId: selectedProjectId,
        checkIn: new Date().toISOString(),
        location: loc,
        status: 'active',
        syncStatus: 'pending',
      };
      saveTimeLog(log);
      setActiveLog(log);
      toast.success(t('painter.checkedIn'));
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!activeLog) return;
    setLoading(true);
    try {
      const loc = await getMockLocation();
      const proj = getProjects().find((p) => p.id === activeLog.projectId);
      if (proj && !isWithinGeofence(loc, proj.location, proj.radius)) {
        toast.error(t('painter.outsideGeofence'));
        return;
      }
      const roundedOut = roundToQuarterHour(new Date());
      const updated: TimeLog = {
        ...activeLog,
        checkOut: roundedOut.toISOString(),
        status: 'completed',
      };
      saveTimeLog(updated);
      setActiveLog(null);
      setSelectedProjectId('');
      toast.success(t('painter.checkedOut'));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  const todayLogs = getUserTimeLogs(currentUser.id).filter((l) => l.checkOut && isToday(new Date(l.checkIn)));
  const todayHours = todayLogs.reduce(
    (sum, l) => sum + (l.checkOut ? calculateHours(l.checkIn, l.checkOut) : 0),
    0
  );

  const elapsed = activeLog
    ? (currentTime.getTime() - new Date(activeLog.checkIn).getTime()) / 1000
    : 0;
  const elapsedStr = `${Math.floor(elapsed / 3600)}:${String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0')}:${String(Math.floor(elapsed % 60)).padStart(2, '0')}`;

  const projectName = (id: string) =>
    projects.find((p) => p.id === id)?.name ?? pendingProjects.find((p) => p.id === id)?.name ?? id;

  const selectedProject = selectedProjectId
    ? projects.find((p) => p.id === selectedProjectId) ?? pendingProjects.find((p) => p.id === selectedProjectId)
    : null;

  // Calendar view
  if (view === 'calendar') {
    return (
      <>
        <PainterCalendarView
          userId={currentUser.id}
          hourlyRate={currentUser.hourlyRate}
          onBack={() => setView('landing')}
          onAddMissingShift={() => setCorrectionOpen(true)}
          onProposeCorrection={() => setCorrectionOpen(true)}
        />
        <ShiftCorrectionDialog open={correctionOpen} onOpenChange={setCorrectionOpen} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#062644] via-[#236B8E]/20 to-[#062644] pb-24">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-[#062644] px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          <button type="button" className="rounded p-1 hover:bg-white/10" aria-label="Home">
            <Home className="h-5 w-5" />
          </button>
          <button type="button" className="rounded p-1 hover:bg-white/10" aria-label="Refresh">
            <Send className="h-5 w-5 rotate-90" />
          </button>
        </div>
        <span className="text-lg font-bold" style={{ fontFamily: 'Montserrat' }}>
          {t('common.appName')}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
            className="rounded px-2 py-1 text-sm hover:bg-white/10"
            aria-label="Toggle language"
          >
            {language === 'en' ? 'ES' : 'EN'}
          </button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10"
            onClick={handleLogout}
            aria-label={t('common.logout')}
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-4 p-4">
        <WorkNotificationBanner onOpenCorrection={() => setCorrectionOpen(true)} />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          {/* Welcome & Project Selection */}
          <Card className="overflow-hidden rounded-lg border-0 bg-white shadow-lg">
            <CardContent className="pt-6">
              <p className="mb-4 text-[#062644]">
                {t('painter.welcome')}, <strong>{currentUser.name}</strong>
              </p>
              <label className="mb-2 block text-sm font-medium text-[#062644]">
                {t('painter.selectProject')}
              </label>
              <Select
                value={selectedProjectId === '__request_new__' ? '' : selectedProjectId}
                onValueChange={(v) => {
                  if (v === '__request_new__') {
                    setRequestProjectOpen(true);
                    return;
                  }
                  setSelectedProjectId(v);
                }}
                disabled={!!activeLog}
              >
                <SelectTrigger className="mb-4 bg-gray-50">
                  <SelectValue placeholder={t('painter.selectProject')} />
                </SelectTrigger>
                <SelectContent>
                  {allOptions.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      <span className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {opt.name}
                        {opt.isPending && (
                          <span className="rounded bg-[#F0C908] px-1.5 py-0.5 text-xs text-black">
                            {t('painter.pending')}
                          </span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                  <SelectItem value="__request_new__" className="text-[#F0C908]">
                    + {t('painter.requestProject')}
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="warning"
                className="w-full gap-2 bg-[#F0C908] text-black hover:bg-[#F0C908]/90"
                onClick={() => setRequestProjectOpen(true)}
              >
                <MapPin className="h-4 w-4" />
                + {t('painter.addAProject')}
              </Button>
              <AddProjectDialog
                open={requestProjectOpen}
                onOpenChange={(o) => {
                  setRequestProjectOpen(o);
                  if (!o) setSelectedProjectId('');
                }}
                onRequested={() => {
                  setRequestProjectOpen(false);
                  setSelectedProjectId('');
                }}
              />
            </CardContent>
          </Card>

          {/* Check In / Check Out card */}
          <Card className="overflow-hidden rounded-lg border-0 bg-white shadow-lg">
            <CardContent className="py-6">
              {!activeLog ? (
                <Button
                  className="h-12 w-full bg-[#236B8E] text-base font-semibold hover:bg-[#062644]"
                  onClick={handleCheckIn}
                  disabled={loading}
                >
                  {loading ? t('painter.gettingLocation') : t('painter.checkIn')}
                </Button>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <p className="text-sm font-medium text-[#062644]">{projectName(activeLog.projectId)}</p>
                  <p className="text-xs text-gray-500">
                    {t('painter.checkIn')}: {format(new Date(activeLog.checkIn), 'HH:mm')}
                  </p>
                  <p className="text-2xl font-mono font-bold text-[#062644]">{elapsedStr}</p>
                  <Button
                    className="h-12 w-full bg-[#D10000] hover:bg-[#D10000]/90"
                    onClick={handleCheckOut}
                    disabled={loading}
                  >
                    {loading ? t('painter.gettingLocation') : t('painter.checkOut')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Total Today */}
          <Card className="overflow-hidden rounded-lg border-0 bg-white shadow-lg">
            <CardContent className="py-6">
              <p className="mb-1 text-sm font-medium text-gray-600">{t('painter.totalToday')}</p>
              <p className="text-2xl font-bold text-[#236B8E]">
                {todayHours.toFixed(2)} <span className="text-base font-normal text-gray-600">{t('painter.hours')}</span>
              </p>
            </CardContent>
          </Card>

          {/* Project Location (when project selected) */}
          {selectedProject && selectedProjectId && selectedProjectId !== '__request_new__' && (
            <Card className="overflow-hidden rounded-lg border-0 bg-white shadow-lg">
              <CardContent className="pt-6">
                <p className="mb-3 text-sm font-medium text-[#062644]">{t('painter.projectLocation')}</p>
                <div className="flex items-start gap-2">
                  <Send className="mt-0.5 h-4 w-4 shrink-0 text-[#D10000]" />
                  <div>
                    <p className="font-semibold text-[#062644]">{projectName(selectedProjectId)}</p>
                    <p className="text-sm text-gray-600">
                      {(selectedProject as { address?: string }).address ?? '—'}
                    </p>
                    <a
                      href={getMapsUrl(
                        (selectedProject as { address?: string }).address ?? '',
                        (selectedProject as { location?: { lat: number; lng: number } }).location?.lat,
                        (selectedProject as { location?: { lat: number; lng: number } }).location?.lng
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-sm text-[#236B8E] underline"
                    >
                      {t('painter.tapToOpenMaps')}
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* View Calendar */}
          <Card className="overflow-hidden rounded-lg border-0 bg-white shadow-lg">
            <CardContent className="py-6">
              <Button
                variant="outline"
                className="w-full gap-2 border-[#236B8E] text-[#062644] hover:bg-[#236B8E]/10"
                onClick={() => setView('calendar')}
              >
                <Calendar className="h-5 w-5" />
                {t('painter.viewCalendar')}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      <ShiftCorrectionDialog open={correctionOpen} onOpenChange={setCorrectionOpen} />
    </div>
  );
}
