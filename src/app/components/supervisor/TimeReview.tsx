import { useEffect, useState, useMemo } from 'react';
import { useLanguage } from '@/app/contexts/LanguageContext';
import {
  getTimeLogs,
  getProjects,
  getUsers,
  getTimeCorrections,
  calculateHours,
} from '@/app/utils/dataManager';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';

const PAGE_SIZE = 20;

export function TimeReview() {
  const { t } = useLanguage();
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [painterFilter, setPainterFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [corrections, setCorrections] = useState<any[]>([]);
  const [allLogs, setAllLogs] = useState<any[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const [projs, team, corr, logs] = await Promise.all([
          getProjects(),
          getUsers(),
          getTimeCorrections(),
          getTimeLogs(),
        ]);
        if (!active) return;
        setProjects(projs.filter((p) => !p.isPending));
        setUsers(team);
        setCorrections(corr);
        setAllLogs(logs);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const logs = useMemo(() => {
    let list = allLogs.filter((l) => l.checkOut);
    const from = startOfDay(new Date(dateFrom));
    const to = endOfDay(new Date(dateTo));
    list = list.filter((l) => {
      const d = new Date(l.checkIn);
      return d >= from && d <= to;
    });
    if (projectFilter !== 'all') list = list.filter((l) => l.projectId === projectFilter);
    if (painterFilter !== 'all') list = list.filter((l) => l.userId === painterFilter);
    if (statusFilter === 'completed') list = list.filter((l) => l.status === 'completed');
    if (statusFilter === 'pending_review') list = list.filter((l) => l.status === 'pending_review' || l.status === 'pending_correction');
    return list.sort((a, b) => new Date(b.checkIn).getTime() - new Date(a.checkIn).getTime());
  }, [allLogs, dateFrom, dateTo, projectFilter, painterFilter, statusFilter]);

  const paginated = logs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(logs.length / PAGE_SIZE);

  const stats = useMemo(() => {
    const totalHours = logs.reduce((s, l) => s + (l.checkOut ? calculateHours(l.checkIn, l.checkOut) : 0), 0);
    const pendingCorrections = corrections.filter((c) => c.status === 'pending').length;
    return { totalHours, totalEntries: logs.length, correctionsPending: pendingCorrections };
  }, [logs, corrections]);

  const hasPendingCorrection = (logId: string) => corrections.some((c) => c.timeLogId === logId && c.status === 'pending');

  if (loading) return null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-[#062644]">{stats.totalHours.toFixed(1)}</p>
            <p className="text-sm text-gray-600">{t('supervisor.totalHours')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-[#062644]">{stats.totalEntries}</p>
            <p className="text-sm text-gray-600">{t('supervisor.totalEntries')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-[#062644]">{stats.correctionsPending}</p>
            <p className="text-sm text-gray-600">{t('supervisor.correctionsPending')}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <div className="space-y-1">
          <Label>{t('supervisor.from')}</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full" />
        </div>
        <div className="space-y-1">
          <Label>{t('supervisor.to')}</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full" />
        </div>
        <div className="space-y-1">
          <Label>Projects</Label>
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-full"><SelectValue placeholder="All" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Painter</Label>
          <Select value={painterFilter} onValueChange={setPainterFilter}>
            <SelectTrigger className="w-full"><SelectValue placeholder="All" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {users.filter((u) => u.role === 'painter').map((u) => (
                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Shift Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full"><SelectValue placeholder="All" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="completed">{t('painter.completed')}</SelectItem>
              <SelectItem value="pending_review">{t('supervisor.needsReview')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left font-medium text-[#062644]">{t('supervisor.painterName')}</th>
              <th className="p-2 text-left font-medium text-[#062644]">Project</th>
              <th className="p-2 text-left font-medium text-[#062644]">Date</th>
              <th className="p-2 text-left font-medium text-[#062644]">Check-In</th>
              <th className="p-2 text-left font-medium text-[#062644]">Check-Out</th>
              <th className="p-2 text-left font-medium text-[#062644]">{t('supervisor.hours')}</th>
              <th className="p-2 text-left font-medium text-[#062644]">Status</th>
              <th className="p-2 text-left font-medium text-[#062644]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((log) => {
              const user = users.find((u) => u.id === log.userId);
              const project = projects.find((p) => p.id === log.projectId);
              const hours = log.checkOut ? calculateHours(log.checkIn, log.checkOut) : 0;
              const pending = hasPendingCorrection(log.id);
              return (
                <tr key={log.id} className="border-t">
                  <td className="p-2">{user?.name ?? log.userId}</td>
                  <td className="p-2">{project?.name ?? log.projectId}</td>
                  <td className="p-2">{format(new Date(log.checkIn), 'MMM d, yyyy')}</td>
                  <td className="p-2">{format(new Date(log.checkIn), 'hh:mm a')}</td>
                  <td className="p-2">{log.checkOut ? format(new Date(log.checkOut), 'hh:mm a') : '—'}</td>
                  <td className="p-2">{hours.toFixed(2)}</td>
                  <td className="p-2">
                    <Badge variant={log.status === 'completed' ? 'success' : 'warning'}>
                      {log.status === 'completed' ? t('painter.completed') : t('painter.pending')}
                    </Badge>
                  </td>
                  <td className="p-2">
                    {pending && (
                      <Button size="sm" variant="outline" onClick={() => window.location.hash = 'queue'}>
                        {t('supervisor.review')}
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            Prev
          </Button>
          <span className="flex items-center px-2 text-sm">
            {page + 1} / {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
