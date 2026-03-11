import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { Clock, LogOut, MapPin } from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useLanguage } from '@/app/contexts/LanguageContext';
import {
  getProjects,
  getPendingProjects,
  getActiveTimeLog,
  getTimeLogs,
  getMockLocation,
  saveTimeLog,
  roundToQuarterHour,
  isWithinGeofence,
  calculateHours,
  getUserTimeLogs,
} from '@/app/utils/dataManager';
import type { TimeLog } from '@/app/types';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
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
import { toast } from 'sonner';
import { format, isToday } from 'date-fns';

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
    const project = projects.find((p) => p.id === selectedProjectId) ?? pendingProjects.find((p) => p.id === selectedProjectId);
    if (!project) return;
    setLoading(true);
    try {
      const loc = await getMockLocation();
      const proj = getProjects().find((p) => p.id === selectedProjectId);
      const isPending = pendingProjects.some((p) => p.id === selectedProjectId);
      if (!isPending && proj && !isWithinGeofence(loc, proj.location, proj.radius)) {
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
  const recentLogs = getUserTimeLogs(currentUser.id)
    .filter((l) => l.status === 'completed' && l.checkOut)
    .sort((a, b) => new Date(b.checkOut!).getTime() - new Date(a.checkOut!).getTime())
    .slice(0, 10);

  const elapsed = activeLog
    ? (currentTime.getTime() - new Date(activeLog.checkIn).getTime()) / 1000
    : 0;
  const elapsedStr = `${Math.floor(elapsed / 3600)}:${String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0')}:${String(Math.floor(elapsed % 60)).padStart(2, '0')}`;

  const projectName = (id: string) =>
    projects.find((p) => p.id === id)?.name ?? pendingProjects.find((p) => p.id === id)?.name ?? id;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[#236B8E]/20 bg-[#062644] px-4 py-3 text-white">
        <span className="text-lg font-bold">{t('common.appName')}</span>
        <div className="flex items-center gap-3">
          <span className="text-sm" aria-label="Current time">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <button
            type="button"
            onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
            className="rounded px-2 py-1 text-sm hover:bg-white/10"
            aria-label="Toggle language"
          >
            {language === 'en' ? 'ES' : 'EN'}
          </button>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={handleLogout} aria-label={t('common.logout')}>
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
          <Card className="overflow-hidden border-2 border-[#236B8E]/30">
            <CardContent className="pt-6">
              {!activeLog ? (
                <>
                  <div className="mb-4">
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
                      <SelectTrigger>
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
                              {!opt.isPending && 'radius' in opt && (
                                <span className="text-xs text-gray-500">{opt.radius}m</span>
                              )}
                            </span>
                          </SelectItem>
                        ))}
                        <SelectItem value="__request_new__" className="text-[#F0C908]">
                          + {t('painter.requestProject')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
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
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-xs text-gray-500">GPS status: Ready</p>
                    <motion.div
                      animate={{
                        scale: [1, 1.05, 1],
                        boxShadow: [
                          '0 0 0 0 rgba(35, 107, 142, 0.7)',
                          '0 0 0 20px rgba(35, 107, 142, 0)',
                          '0 0 0 0 rgba(35, 107, 142, 0)',
                        ],
                      }}
                      transition={{ duration: 2, repeat: Infinity, repeatType: 'loop' }}
                    >
                      <Button
                        size="lg"
                        className="h-28 w-28 rounded-full bg-[#236B8E] text-lg font-semibold hover:bg-[#062644]"
                        onClick={handleCheckIn}
                        disabled={loading}
                      >
                        {loading ? t('painter.gettingLocation') : t('painter.checkIn')}
                      </Button>
                    </motion.div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <p className="text-sm font-medium text-[#062644]">{projectName(activeLog.projectId)}</p>
                  <p className="text-xs text-gray-500">
                    {t('painter.checkIn')}: {format(new Date(activeLog.checkIn), 'HH:mm')}
                  </p>
                  <p className="text-2xl font-mono font-bold text-[#062644]">{elapsedStr}</p>
                  <Button
                    size="lg"
                    className="h-28 w-28 rounded-full bg-[#D10000] hover:bg-[#D10000]/90"
                    onClick={handleCheckOut}
                    disabled={loading}
                  >
                    {loading ? t('painter.gettingLocation') : t('painter.checkOut')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-2 border-[#F0C908]/50">
            <CardContent className="flex items-center gap-4 pt-6">
              <Clock className="h-10 w-10 text-[#F0C908]" />
              <div>
                <p className="text-3xl font-bold text-[#062644]">{todayHours.toFixed(1)}</p>
                <p className="text-sm text-gray-600">{t('painter.todayHours')}</p>
                <p className="text-xs text-gray-500">{todayLogs.length} shifts</p>
              </div>
            </CardContent>
          </Card>

          <div>
            <h2 className="mb-2 text-lg font-semibold text-[#062644]">{t('painter.recentActivity')}</h2>
            <div className="space-y-2">
              {recentLogs.length === 0 ? (
                <p className="rounded-lg border border-dashed border-gray-300 p-4 text-center text-sm text-gray-500">
                  No activity yet
                </p>
              ) : (
                recentLogs.map((log) => {
                  const hours = log.checkOut ? calculateHours(log.checkIn, log.checkOut) : 0;
                  return (
                    <Card key={log.id}>
                      <CardContent className="flex flex-wrap items-center justify-between gap-2 py-3">
                        <div>
                          <p className="font-medium text-[#062644]">{projectName(log.projectId)}</p>
                          <p className="text-xs text-gray-500">
                            {format(new Date(log.checkIn), 'MMM d, HH:mm')} –{' '}
                            {log.checkOut && format(new Date(log.checkOut), 'HH:mm')} · {hours.toFixed(2)} hrs
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              log.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {log.status === 'completed' ? t('painter.completed') : t('painter.pending')}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCorrectionOpen(true)}
                          >
                            {t('painter.proposeCorrection')}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        </motion.div>
      </main>

      <ShiftCorrectionDialog open={correctionOpen} onOpenChange={setCorrectionOpen} />
    </div>
  );
}
