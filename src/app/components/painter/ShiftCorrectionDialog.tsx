import { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { useAuth } from '@/app/contexts/AuthContext';
import {
  getProjectsForPainter,
  getTimeLogs,
  getUserTimeLogs,
  saveTimeCorrection,
  saveTimeLog,
  calculateHours,
} from '@/app/utils/dataManager';
import { isSameDay, format, parseISO } from 'date-fns';

interface ShiftCorrectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When opening, which tab to show. Used e.g. from calendar when "Add Missing Shift" is clicked. */
  defaultTab?: 'propose' | 'missing';
  /** When set (e.g. from calendar), user only picks time; date is fixed. Show "Submitting for: [date]" and use time inputs. */
  contextDate?: Date | null;
}

export function ShiftCorrectionDialog({
  open,
  onOpenChange,
  defaultTab = 'propose',
  contextDate = null,
}: ShiftCorrectionDialogProps) {
  const { t } = useLanguage();
  const { currentUser } = useAuth();
  const [mode, setMode] = useState<'propose' | 'missing'>(defaultTab);

  useEffect(() => {
    if (open) {
      setMode(defaultTab);
    }
  }, [open, defaultTab]);
  const [selectedLogId, setSelectedLogId] = useState('');
  const [correctionType, setCorrectionType] = useState<'check_in' | 'check_out'>('check_in');
  const [requestedTime, setRequestedTime] = useState('');
  const [reason, setReason] = useState('');
  const [projectId, setProjectId] = useState('');
  const [checkInTime, setCheckInTime] = useState('');
  const [checkOutTime, setCheckOutTime] = useState('');
  const [newProjectName, setNewProjectName] = useState('');

  const projects = getProjectsForPainter();
  const allUserLogs = useMemo(
    () => (currentUser ? getUserTimeLogs(currentUser.id) : []),
    [currentUser]
  );
  const todayLogs = useMemo(() => {
    const refDate = contextDate ?? new Date();
    return allUserLogs.filter(
      (l) => l.checkOut && isSameDay(parseISO(l.checkIn), refDate)
    );
  }, [allUserLogs, contextDate]);
  const projectOptions = useMemo(
    () => [
      ...projects.map((p) => ({ id: p.id, name: p.name })),
      { id: '__new__', name: `+ ${t('painter.createNewProject')}` },
    ],
    [projects, t]
  );

  const selectedLog = todayLogs.find((l) => l.id === selectedLogId);
  const selectedProject = projects.find((p) => p.id === projectId);

  const handleSubmitPropose = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLog || !reason.trim() || reason.trim().length < 10 || !currentUser) return;
    const origTime = correctionType === 'check_in' ? selectedLog.checkIn : selectedLog.checkOut!;
    let reqTime = requestedTime || origTime;
    if (contextDate && selectedLog && requestedTime && requestedTime.length <= 5) {
      const refDate = new Date(selectedLog.checkIn);
      reqTime = `${format(refDate, 'yyyy-MM-dd')}T${requestedTime}:00.000`;
    }
    const correction = {
      id: `corr-${Date.now()}`,
      timeLogId: selectedLog.id,
      userId: currentUser.id,
      requestedTime: new Date(reqTime).toISOString(),
      originalTime: origTime,
      type: correctionType,
      reason: reason.trim(),
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
    };
    saveTimeCorrection(correction);
    toast.success(t('painter.correctionSubmitted'));
    setSelectedLogId('');
    setRequestedTime('');
    setReason('');
    onOpenChange(false);
  };

  const handleSubmitMissing = (e: React.FormEvent) => {
    e.preventDefault();
    const finalReason = reason.trim().length >= 10 ? reason : `[NEW SHIFT] ${reason}`;
    if (!currentUser) return;
    if (projectId === '__new__' && !newProjectName.trim()) {
      toast.error(t('supervisor.enterProjectName'));
      return;
    }
    let targetProjectId = projectId;
    if (projectId === '__new__') {
      targetProjectId = `proj-new-${Date.now()}`;
      // For demo we don't create project; we store in reason that it's new project
    }
    const logId = `log-${Date.now()}`;
    const baseDate = contextDate ?? new Date();
    const checkIn =
      contextDate && checkInTime
        ? `${format(baseDate, 'yyyy-MM-dd')}T${checkInTime}:00.000`
        : checkInTime || new Date().toISOString();
    const checkOut =
      contextDate && checkOutTime
        ? `${format(baseDate, 'yyyy-MM-dd')}T${checkOutTime}:00.000`
        : checkOutTime || new Date().toISOString();
    if (new Date(checkOut) <= new Date(checkIn)) {
      toast.error('Check-out must be after check-in');
      return;
    }
    const logs = getTimeLogs();
    const overlapping = logs.filter(
      (l) =>
        l.userId === currentUser.id &&
        l.checkOut &&
        (new Date(l.checkIn) < new Date(checkOut) && new Date(l.checkOut!) > new Date(checkIn))
    );
    if (overlapping.length > 0) {
      toast.error('Overlapping shift');
      return;
    }
    const newLog = {
      id: logId,
      userId: currentUser.id,
      projectId: targetProjectId,
      checkIn,
      checkOut,
      location: { lat: 0, lng: 0, accuracy: 0 },
      status: 'pending_review' as const,
      syncStatus: 'pending' as const,
    };
    saveTimeLog(newLog);
    saveTimeCorrection({
      id: `corr-in-${Date.now()}`,
      timeLogId: logId,
      userId: currentUser.id,
      requestedTime: checkIn,
      originalTime: checkIn,
      type: 'check_in',
      reason: projectId === '__new__' ? `[NEW SHIFT + NEW PROJECT: ${newProjectName}] ${finalReason}` : finalReason,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });
    saveTimeCorrection({
      id: `corr-out-${Date.now()}`,
      timeLogId: logId,
      userId: currentUser.id,
      requestedTime: checkOut,
      originalTime: checkOut,
      type: 'check_out',
      reason: finalReason,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });
    toast.success(t('painter.correctionSubmitted'));
    setReason('');
    setProjectId('');
    setCheckInTime('');
    setCheckOutTime('');
    setNewProjectName('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" showClose={true}>
        <DialogHeader>
          <DialogTitle>{t('painter.shiftCorrection')}</DialogTitle>
        </DialogHeader>
        <Tabs value={mode} onValueChange={(v) => setMode(v as 'propose' | 'missing')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="propose">{t('painter.proposeCorrectionTab')}</TabsTrigger>
            <TabsTrigger value="missing">{t('painter.addMissingShiftTab')}</TabsTrigger>
          </TabsList>
          <TabsContent value="propose" className="space-y-4 pt-4">
            <form onSubmit={handleSubmitPropose} className="space-y-4">
              <div>
                <Label>{t('painter.selectShift')}</Label>
                <Select value={selectedLogId} onValueChange={setSelectedLogId} required>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {todayLogs.map((log) => {
                      const proj = projects.find((p) => p.id === log.projectId);
                      const hours = log.checkOut ? calculateHours(log.checkIn, log.checkOut) : 0;
                      return (
                        <SelectItem key={log.id} value={log.id}>
                          {proj?.name ?? log.projectId} – {format(new Date(log.checkIn), 'HH:mm')} to{' '}
                          {log.checkOut && format(new Date(log.checkOut), 'HH:mm')} ({hours.toFixed(1)} hrs)
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {contextDate && (
                  <p className="mt-2 text-sm font-medium text-[#236B8E]">
                    {t('painter.submittingFor')}: {format(contextDate, 'MMMM d, yyyy')}
                  </p>
                )}
              </div>
              {selectedLog && (
                <>
                  <div>
                    <Label>{t('painter.correctionType')}</Label>
                    <div className="flex gap-4 pt-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="correctionType"
                          checked={correctionType === 'check_in'}
                          onChange={() => setCorrectionType('check_in')}
                        />
                        {t('painter.checkInTime')}
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="correctionType"
                          checked={correctionType === 'check_out'}
                          onChange={() => setCorrectionType('check_out')}
                        />
                        {t('painter.checkOutTime')}
                      </label>
                    </div>
                  </div>
                  <div>
                    <Label>{t('painter.requestedTime')}</Label>
                    <Input
                      type={contextDate ? 'time' : 'datetime-local'}
                      value={
                        contextDate
                          ? requestedTime ||
                            (selectedLog
                              ? format(
                                  new Date(
                                    correctionType === 'check_in' ? selectedLog.checkIn : selectedLog.checkOut!
                                  ),
                                  'HH:mm'
                                )
                              : '')
                          : requestedTime
                      }
                      onChange={(e) => setRequestedTime(e.target.value)}
                    />
                    <p className="text-xs text-gray-500">
                      {t('painter.originalTime')}:{' '}
                      {correctionType === 'check_in'
                        ? format(new Date(selectedLog.checkIn), 'PPp')
                        : selectedLog.checkOut && format(new Date(selectedLog.checkOut), 'PPp')}
                    </p>
                  </div>
                </>
              )}
              <div>
                <Label>{t('painter.reason')} (min 10 chars)</Label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={t('painter.reasonPlaceholder')}
                  rows={3}
                  minLength={10}
                  required
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={!selectedLogId || reason.trim().length < 10}>
                  {t('common.submit')}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
          <TabsContent value="missing" className="space-y-4 pt-4">
            <form onSubmit={handleSubmitMissing} className="space-y-4">
              <div>
                <Label>{t('painter.selectProject')}</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {projectOptions.map((opt) => (
                      <SelectItem key={opt.id} value={opt.id}>
                        {opt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {contextDate && (
                  <p className="mt-2 text-sm font-medium text-[#236B8E]">
                    {t('painter.submittingFor')}: {format(contextDate, 'MMMM d, yyyy')}
                  </p>
                )}
              </div>
              {projectId === '__new__' && (
                <div>
                  <Label>{t('painter.projectName')}</Label>
                  <Input
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder={t('supervisor.enterProjectName')}
                    className="border-[#F0C908]"
                  />
                </div>
              )}
              <div>
                <Label>{t('painter.checkInTime')}</Label>
                <Input
                  type={contextDate ? 'time' : 'datetime-local'}
                  value={checkInTime}
                  onChange={(e) => setCheckInTime(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>{t('painter.checkOutTime')}</Label>
                <Input
                  type={contextDate ? 'time' : 'datetime-local'}
                  value={checkOutTime}
                  onChange={(e) => setCheckOutTime(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>{t('painter.reason')}</Label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={projectId === '__new__' ? '[NEW SHIFT + NEW PROJECT]' : '[NEW SHIFT]'}
                  rows={2}
                  minLength={10}
                  required
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit">
                  {t('common.submit')}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
