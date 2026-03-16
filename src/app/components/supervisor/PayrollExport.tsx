import { useState, useMemo, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { getTimeLogs, getUsers, calculateHours } from '@/app/utils/dataManager';
import type { PayrollEntry } from '@/app/types';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths } from 'date-fns';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';

export function PayrollExport() {
  const { t } = useLanguage();
  const now = new Date();
  const [range, setRange] = useState<'week' | 'lastweek' | 'month' | 'lastmonth' | 'custom'>('week');
  const [customFrom, setCustomFrom] = useState(format(subWeeks(now, 1), 'yyyy-MM-dd'));
  const [customTo, setCustomTo] = useState(format(now, 'yyyy-MM-dd'));

  const { startDate, endDate } = useMemo(() => {
    switch (range) {
      case 'week':
        return { startDate: startOfWeek(now), endDate: endOfWeek(now) };
      case 'lastweek':
        const lw = subWeeks(now, 1);
        return { startDate: startOfWeek(lw), endDate: endOfWeek(lw) };
      case 'month':
        return { startDate: startOfMonth(now), endDate: endOfMonth(now) };
      case 'lastmonth':
        const lm = subMonths(now, 1);
        return { startDate: startOfMonth(lm), endDate: endOfMonth(lm) };
      default:
        return { startDate: new Date(customFrom), endDate: new Date(customTo) };
    }
  }, [range, customFrom, customTo, now]);

  const [users, setUsers] = useState<Awaited<ReturnType<typeof getUsers>>>([]);
  const [logs, setLogs] = useState<Awaited<ReturnType<typeof getTimeLogs>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [team, timeLogs] = await Promise.all([getUsers(), getTimeLogs()]);
        if (!cancelled) {
          setUsers(team);
          setLogs(timeLogs);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const entries = useMemo((): PayrollEntry[] => {
    const painters = users.filter((u) => u.role === 'painter');
    const completedLogs = logs.filter((l) => l.checkOut);
    const from = startDate.getTime();
    const to = endDate.getTime();

    const byUser: Record<string, { hours: number; projects: Set<string> }> = {};
    painters.forEach((u) => {
      byUser[u.id] = { hours: 0, projects: new Set() };
    });

    completedLogs.forEach((log) => {
      const d = new Date(log.checkIn).getTime();
      if (d < from || d > to) return;
      const user = byUser[log.userId];
      if (!user) return;
      const hrs = calculateHours(log.checkIn, log.checkOut!);
      user.hours += hrs;
      user.projects.add(log.projectId);
    });

    return painters.map((u) => {
      const data = byUser[u.id];
      const totalHours = data?.hours ?? 0;
      return {
        userId: u.id,
        userName: u.name,
        totalHours,
        hourlyRate: u.hourlyRate,
        totalCost: totalHours * u.hourlyRate,
        projectsWorked: (data?.projects.size ?? 0) as number,
      };
    }).filter((e) => e.totalHours > 0);
  }, [users, logs, startDate, endDate]);

  const grandTotal = entries.reduce((s, e) => s + e.totalCost, 0);

  if (loading) return null;

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('aime Tempo - Payroll Report', 20, 20);
    doc.setFontSize(12);
    doc.text(`Period: ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`, 20, 30);

    let y = 50;
    doc.setFontSize(10);
    doc.text('Name', 20, y);
    doc.text('Hours', 80, y);
    doc.text('Rate', 120, y);
    doc.text('Total', 160, y);
    y += 10;

    entries.forEach((entry) => {
      doc.text(entry.userName, 20, y);
      doc.text(entry.totalHours.toFixed(2), 80, y);
      doc.text(`$${entry.hourlyRate.toFixed(2)}`, 120, y);
      doc.text(`$${entry.totalCost.toFixed(2)}`, 160, y);
      y += 10;
    });

    y += 5;
    doc.setFontSize(11);
    doc.text(`Grand Total: $${grandTotal.toFixed(2)}`, 160, y);

    doc.save(`payroll_${format(startDate, 'yyyy-MM-dd')}_to_${format(endDate, 'yyyy-MM-dd')}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex gap-2">
          {(['week', 'lastweek', 'month', 'lastmonth', 'custom'] as const).map((r) => (
            <Button
              key={r}
              variant={range === r ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRange(r)}
            >
              {r === 'week' && t('supervisor.thisWeek')}
              {r === 'lastweek' && t('supervisor.lastWeek')}
              {r === 'month' && t('supervisor.thisMonth')}
              {r === 'lastmonth' && t('supervisor.lastMonth')}
              {r === 'custom' && 'Custom'}
            </Button>
          ))}
        </div>
        {range === 'custom' && (
          <>
            <div className="space-y-1">
              <Label>{t('supervisor.from')}</Label>
              <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>{t('supervisor.to')}</Label>
              <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
            </div>
          </>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-2 text-left font-medium text-[#062644]">{t('supervisor.painterName')}</th>
                  <th className="p-2 text-left font-medium text-[#062644]">{t('supervisor.totalHours')}</th>
                  <th className="p-2 text-left font-medium text-[#062644]">{t('supervisor.rate')}</th>
                  <th className="p-2 text-left font-medium text-[#062644]">{t('supervisor.cost')}</th>
                  <th className="p-2 text-left font-medium text-[#062644]">{t('supervisor.projectsWorked')}</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.userId} className="border-b">
                    <td className="p-2">{entry.userName}</td>
                    <td className="p-2">{entry.totalHours.toFixed(2)}</td>
                    <td className="p-2">${entry.hourlyRate.toFixed(2)}</td>
                    <td className="p-2">${entry.totalCost.toFixed(2)}</td>
                    <td className="p-2">{entry.projectsWorked ?? 0}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-semibold">
                  <td className="p-2">{t('supervisor.grandTotal')}</td>
                  <td className="p-2">{entries.reduce((s, e) => s + e.totalHours, 0).toFixed(2)}</td>
                  <td className="p-2">—</td>
                  <td className="p-2">${grandTotal.toFixed(2)}</td>
                  <td className="p-2">—</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <Button variant="warning" className="mt-4 gap-2" onClick={exportPDF}>
            {t('supervisor.exportPDF')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
