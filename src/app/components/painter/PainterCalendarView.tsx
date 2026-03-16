import { useState, useMemo, useEffect } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  parseISO,
  subDays,
  setHours,
  setMinutes,
  setSeconds,
  setMilliseconds,
} from 'date-fns';
import { ArrowLeft, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, DollarSign } from 'lucide-react';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { getUserTimeLogs, getProjectsForPainter, getTimeCorrections, calculateHours } from '@/app/utils/dataManager';
import type { Project } from '@/app/types';
import type { TimeLog } from '@/app/types';
import type { TimeCorrection } from '@/app/types';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';

// Week: Monday 00:01 AM to Sunday 11:59 PM
function getPayPeriodForDate(date: Date): { start: Date; end: Date } {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  const startWithTime = setMilliseconds(setSeconds(setMinutes(setHours(start, 0), 1), 0), 0);
  const end = endOfWeek(date, { weekStartsOn: 1 });
  const endWithTime = setMilliseconds(setSeconds(setMinutes(setHours(end, 23), 59), 59), 999);
  return { start: startWithTime, end: endWithTime };
}

function getCurrentPayPeriod() {
  return getPayPeriodForDate(new Date());
}

function getLastPayPeriod() {
  const now = new Date();
  const lastWeek = subDays(now, 7);
  return getPayPeriodForDate(lastWeek);
}

interface PainterCalendarViewProps {
  userId: string;
  hourlyRate: number;
  onBack: () => void;
  onAddMissingShift: (selectedDate: Date) => void;
  onProposeCorrection: (selectedDate: Date) => void;
}

export function PainterCalendarView({
  userId,
  hourlyRate,
  onBack,
  onAddMissingShift,
  onProposeCorrection,
}: PainterCalendarViewProps) {
  const { t } = useLanguage();
  const now = new Date();
  const [month, setMonth] = useState(now);
  const [selectedDate, setSelectedDate] = useState<Date>(now);
  const [periodKey, setPeriodKey] = useState<'current' | 'last' | 'custom'>('current');
  const [customStart, setCustomStart] = useState(format(subDays(now, 13), 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState(format(now, 'yyyy-MM-dd'));

  const payPeriod = useMemo(() => {
    if (periodKey === 'current') return getCurrentPayPeriod();
    if (periodKey === 'last') return getLastPayPeriod();
    return {
      start: new Date(customStart),
      end: new Date(customEnd),
    };
  }, [periodKey, customStart, customEnd]);

  const [projects, setProjects] = useState<Project[]>([]);
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [corrections, setCorrections] = useState<TimeCorrection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [projs, userLogs, corrs] = await Promise.all([
          getProjectsForPainter(),
          getUserTimeLogs(userId),
          getTimeCorrections(),
        ]);
        if (!cancelled) {
          setProjects(projs);
          setLogs(userLogs);
          setCorrections(corrs);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const periodLogs = useMemo(() => {
    return logs.filter((l) => {
      const d = l.checkIn ? new Date(l.checkIn).getTime() : 0;
      return d >= payPeriod.start.getTime() && d <= payPeriod.end.getTime() && l.checkOut;
    });
  }, [logs, payPeriod.start, payPeriod.end]);

  const periodHours = useMemo(
    () =>
      periodLogs.reduce((s, l) => s + (l.checkOut ? calculateHours(l.checkIn, l.checkOut) : 0), 0),
    [periodLogs]
  );
  const estimatedPay = periodHours * hourlyRate;

  const selectedDayLogs = useMemo(
    () =>
      logs.filter(
        (l) =>
          l.checkIn &&
          isSameDay(parseISO(l.checkIn), selectedDate) &&
          (l.checkOut || l.status === 'active' || l.status === 'pending_review')
      ),
    [logs, selectedDate]
  );

  const getLogStatus = (
    log: { id: string; status: string }
  ): { status: 'pending' | 'pending_review' | 'approved' | 'denied'; denialReason?: string } => {
    const pendingCorrection = corrections.find(
      (c) => c.timeLogId === log.id && c.status === 'pending'
    );
    if (pendingCorrection) return { status: 'pending' };
    const deniedCorrection = corrections.find(
      (c) => c.timeLogId === log.id && c.status === 'denied'
    );
    if (deniedCorrection)
      return {
        status: 'denied',
        denialReason: deniedCorrection.denialReason ?? '',
      };
    if (log.status === 'pending_review') return { status: 'pending_review' };
    return { status: 'approved' };
  };
  const selectedDayHours = selectedDayLogs.reduce(
    (s, l) => s + (l.checkOut ? calculateHours(l.checkIn, l.checkOut) : 0),
    0
  );

  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const hoursByDate = useMemo(() => {
    const map: Record<string, number> = {};
    logs.forEach((l) => {
      if (!l.checkIn || !l.checkOut) return;
      const key = format(new Date(l.checkIn), 'yyyy-MM-dd');
      map[key] = (map[key] || 0) + calculateHours(l.checkIn, l.checkOut);
    });
    return map;
  }, [logs]);

  const projectName = (id: string) => projects.find((p) => p.id === id)?.name ?? id;

  if (loading) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#062644] to-[#236B8E]/30 pb-24">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-[#062644] px-4 py-3 text-white">
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={onBack} aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <span className="text-lg font-bold">{t('painter.myCalendar')}</span>
        <div className="w-10" />
      </header>

      <main className="mx-auto max-w-lg space-y-4 p-4">
        {/* Pay Period Summary */}
        <Card className="overflow-hidden rounded-lg border-0 shadow-lg">
          <CardContent className="pt-6">
            <div className="mb-4 flex items-center gap-2 text-[#062644]">
              <DollarSign className="h-5 w-5 text-[#F0C908]" />
              <span className="font-semibold">{t('painter.payPeriodSummary')}</span>
            </div>
            <Select value={periodKey} onValueChange={(v) => setPeriodKey(v as 'current' | 'last' | 'custom')}>
              <SelectTrigger className="mb-2">
                <SelectValue placeholder={t('painter.currentPeriod')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">{t('painter.currentPeriod')}</SelectItem>
                <SelectItem value="last">{t('painter.lastPeriod')}</SelectItem>
                <SelectItem value="custom">{t('painter.customDates')}</SelectItem>
              </SelectContent>
            </Select>
            {periodKey === 'custom' && (
              <div className="mb-4 grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">{t('painter.startDate')}</Label>
                  <Input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t('painter.endDate')}</Label>
                  <Input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                  />
                </div>
              </div>
            )}
            <p className="mb-4 flex items-center gap-2 text-sm text-gray-500">
              <CalendarIcon className="h-4 w-4" />
              {format(payPeriod.start, 'MMM d')} - {format(payPeriod.end, 'MMM d, yyyy')}
            </p>
            <div className="mb-2 text-xs uppercase tracking-wide text-gray-500">
              {t('painter.hoursWorkedLabel')}
            </div>
            <p className="text-2xl font-bold text-[#236B8E]">
              {periodHours.toFixed(1)} <span className="text-base font-normal text-gray-600">{t('painter.hours')}</span>
            </p>
            <p className="mb-4 text-sm text-gray-500">{periodLogs.length} {t('painter.shifts')}</p>
            <div className="mb-2 text-xs uppercase tracking-wide text-gray-500">
              {t('painter.estimatedPay')}
            </div>
            <p className="text-2xl font-bold text-[#F0C908]">${estimatedPay.toFixed(2)}</p>
            <p className="text-sm text-gray-500">${hourlyRate.toFixed(2)}/hr</p>
          </CardContent>
        </Card>

        {/* Calendar */}
        <Card className="overflow-hidden rounded-lg border-0 shadow-lg">
          <CardContent className="pt-6">
            <div className="mb-4 flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMonth((m) => subMonths(m, 1))}
                aria-label="Previous month"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <span className="font-semibold text-[#062644]">{format(month, 'MMMM yyyy')}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMonth((m) => addMonths(m, 1))}
                aria-label="Next month"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-7 gap-1">
              {days.map((day) => {
                const key = format(day, 'yyyy-MM-dd');
                const hours = hoursByDate[key] ?? 0;
                const selected = isSameDay(day, selectedDate);
                const today = isToday(day);
                const inMonth = isSameMonth(day, month);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedDate(day)}
                    className={`flex flex-col items-center rounded-lg p-2 text-sm transition-colors ${
                      !inMonth ? 'text-gray-300' : 'text-[#062644]'
                    } ${
                      today && !selected
                        ? 'bg-[#F0C908] font-semibold text-[#062644]'
                        : selected
                          ? 'bg-[#236B8E]/30 ring-2 ring-[#236B8E] font-semibold text-[#062644]'
                          : ''
                    } hover:bg-[#236B8E]/10`}
                  >
                    <span>{format(day, 'd')}</span>
                    {inMonth && <span className="text-xs">{hours > 0 ? `${hours.toFixed(1)}h` : '0.0h'}</span>}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Daily detail */}
        <Card className="overflow-hidden rounded-lg border-0 shadow-lg">
          <CardContent className="pt-6">
            <h3 className="mb-4 font-semibold text-[#062644]">{format(selectedDate, 'MMMM d, yyyy')}</h3>
            {selectedDayLogs.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-500">{t('painter.noTimeEntries')}</p>
            ) : (
              <div className="space-y-3">
                {selectedDayLogs.map((log) => {
                  const hours = log.checkOut ? calculateHours(log.checkIn, log.checkOut) : 0;
                  const statusInfo = getLogStatus(log);
                  return (
                    <div
                      key={log.id}
                      className="flex flex-col gap-2 border-l-4 border-[#062644] pl-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <p className="font-medium text-[#062644]">
                            {projectName(log.projectId)}
                            <span className="ml-2 text-xs font-normal text-gray-500">
                              {statusInfo.status === 'pending' && `(${t('painter.pending')})`}
                              {statusInfo.status === 'pending_review' && `(${t('painter.pendingReview')})`}
                              {statusInfo.status === 'approved' && `(${t('painter.approved')})`}
                              {statusInfo.status === 'denied' && `(${t('painter.denied')})`}
                            </span>
                          </p>
                          <p className="text-sm text-gray-500">
                            {format(new Date(log.checkIn), 'h:mm a')} -{' '}
                            {log.checkOut ? format(new Date(log.checkOut), 'h:mm a') : '—'}
                          </p>
                          {statusInfo.status === 'denied' && statusInfo.denialReason && (
                            <p className="mt-1 text-xs text-[#D10000]">
                              {t('painter.denialReason')}: {statusInfo.denialReason}
                            </p>
                          )}
                        </div>
                        <span className="flex items-center gap-1 rounded bg-[#062644] px-2 py-0.5 text-xs text-white">
                          <Clock className="h-3 w-3" />
                          {hours.toFixed(2)}h
                        </span>
                      </div>
                      {statusInfo.status === 'denied' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-fit"
                          onClick={() => onProposeCorrection(selectedDate)}
                        >
                          {t('painter.resubmit')}
                        </Button>
                      )}
                    </div>
                  );
                })}
                <p className="mt-2 font-medium text-[#062644]">
                  {t('painter.total')}: {selectedDayHours.toFixed(2)} {t('painter.hours')}
                </p>
              </div>
            )}
            <Button
              className="mt-4 w-full gap-2 bg-[#236B8E] hover:bg-[#062644]"
              onClick={() =>
                selectedDayLogs.length > 0
                  ? onProposeCorrection(selectedDate)
                  : onAddMissingShift(selectedDate)
              }
            >
              <Clock className="h-4 w-4" />
              {selectedDayLogs.length > 0 ? t('painter.proposeCorrection') : t('painter.addMissingShift')}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
