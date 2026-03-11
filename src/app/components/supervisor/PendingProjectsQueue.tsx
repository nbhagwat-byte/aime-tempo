import { useState } from 'react';
import { toast } from 'sonner';
import { useLanguage } from '@/app/contexts/LanguageContext';
import {
  getTimeCorrections,
  getUsers,
  getProjects,
  getTimeLogs,
  saveTimeCorrection,
  saveTimeLog,
  saveProject,
  getPendingProjects,
  deletePendingProject,
} from '@/app/utils/dataManager';
import { format } from 'date-fns';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';

export function PendingProjectsQueue() {
  const { t } = useLanguage();
  const [denyDialog, setDenyDialog] = useState<{ id: string; userId: string } | null>(null);
  const [denialReason, setDenialReason] = useState('');

  const allCorrections = getTimeCorrections();
  const pendingCorrections = allCorrections.filter((c) => c.status === 'pending');
  const historyCorrections = [...allCorrections]
    .filter((c) => c.status === 'approved' || c.status === 'denied')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const users = getUsers();
  const projects = getProjects();
  const timeLogs = getTimeLogs();

  const handleApprove = (correctionId: string) => {
    const corr = pendingCorrections.find((c) => c.id === correctionId);
    if (!corr) return;

    const reason = corr.reason || '';
    const hasNewProject = (reason.includes('NEW PROJECT') || reason.includes('NUEVO PROYECTO')) && corr.type === 'check_in';
    const newProjectMatch = reason.match(/NEW PROJECT:\s*([^\]]+)/i) || reason.match(/NUEVO PROYECTO:\s*([^\]]+)/i);

    if (hasNewProject && newProjectMatch) {
      const projectName = newProjectMatch[1].trim();
      const pending = getPendingProjects().find((p) => p.requestedBy === corr.userId);
      const newProject = {
        id: `proj-${Date.now()}`,
        name: projectName,
        address: pending?.address ?? 'TBD',
        location: { lat: 40.7128, lng: -74.006 },
        radius: pending?.radius ?? 100,
        active: true,
      };
      saveProject(newProject);
      if (pending) deletePendingProject(pending.id);
      const log = timeLogs.find((l) => l.id === corr.timeLogId);
      if (log && log.projectId.startsWith('proj-new-')) {
        saveTimeLog({ ...log, projectId: newProject.id });
      }
      saveTimeCorrection({ ...corr, status: 'approved' });
      toast.success(t('supervisor.correctionApproved') + ' New project added.');
    } else {
      const log = timeLogs.find((l) => l.id === corr.timeLogId);
      if (log) {
        if (corr.type === 'check_in') {
          saveTimeLog({ ...log, checkIn: corr.requestedTime });
        } else {
          saveTimeLog({ ...log, checkOut: corr.requestedTime });
        }
      }
      saveTimeCorrection({ ...corr, status: 'approved' });
      toast.success(t('supervisor.correctionApproved'));
    }
  };

  const handleDeny = () => {
    if (!denyDialog) return;
    const corr = pendingCorrections.find((c) => c.id === denyDialog.id);
    if (corr) {
      saveTimeCorrection({ ...corr, status: 'denied', denialReason });
      toast.success(t('supervisor.correctionDenied'));
    }
    setDenyDialog(null);
    setDenialReason('');
  };

  const renderCorrectionCard = (
    corr: (typeof allCorrections)[0],
    showActions: boolean
  ) => {
    const user = users.find((u) => u.id === corr.userId);
    const log = timeLogs.find((l) => l.id === corr.timeLogId);
    const project = log ? projects.find((p) => p.id === log.projectId) : null;
    const isNewShift = corr.reason?.includes('NEW SHIFT') || corr.reason?.includes('NUEVO TURNO');
    const isNewProject = corr.reason?.includes('NEW PROJECT') || corr.reason?.includes('NUEVO PROYECTO');

    return (
      <Card key={corr.id}>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#062644] text-sm font-bold text-white">
                {user?.name?.slice(0, 2).toUpperCase() ?? '?'}
              </div>
              <div>
                <p className="font-medium text-[#062644]">{user?.name ?? corr.userId}</p>
                <p className="text-xs text-gray-500">{format(new Date(corr.createdAt), 'PPp')}</p>
                <Badge className="mt-1 bg-[#236B8E]">
                  {corr.type === 'check_in' ? t('painter.checkInTime') : t('painter.checkOutTime')}
                </Badge>
                {!showActions && (
                  <Badge
                    variant={corr.status === 'approved' ? 'success' : 'destructive'}
                    className="ml-1"
                  >
                    {corr.status === 'approved' ? t('common.approve') : t('common.deny')}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="mt-4 space-y-1 text-sm">
            <p><strong>Project:</strong> {project?.name ?? log?.projectId ?? '—'}</p>
            <p>
              <span className="line-through text-gray-500">
                {t('painter.originalTime')}: {format(new Date(corr.originalTime), 'PPp')}
              </span>
            </p>
            <p className="text-[#F0C908] font-medium">
              {t('painter.requestedTime')}: {format(new Date(corr.requestedTime), 'PPp')}
            </p>
            <blockquote className="rounded bg-gray-100 p-2 text-gray-700">{corr.reason}</blockquote>
            {corr.status === 'denied' && corr.denialReason && (
              <p className="text-xs text-[#D10000]">
                {t('painter.denialReason')}: {corr.denialReason}
              </p>
            )}
            <div className="flex gap-2">
              {isNewShift && <Badge variant="warning">{t('supervisor.newShift')}</Badge>}
              {isNewProject && <Badge variant="warning">{t('supervisor.newProject')}</Badge>}
            </div>
          </div>
          {showActions && (
            <div className="mt-4 flex gap-2">
              <Button size="sm" onClick={() => handleApprove(corr.id)}>
                {t('common.approve')}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setDenyDialog({ id: corr.id, userId: corr.userId })}
              >
                {t('common.deny')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-semibold text-[#062644]">{t('supervisor.reviewCorrections')}</h2>

      {/* Top section: Shifts submitted for review */}
      <div>
        <h3 className="mb-4 text-lg font-medium text-[#062644]">
          {t('supervisor.shiftsForReview')}
        </h3>
        {pendingCorrections.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              {t('supervisor.noPendingCorrections')}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {pendingCorrections.map((corr) => renderCorrectionCard(corr, true))}
          </div>
        )}
      </div>

      {/* Bottom section: Correction history */}
      <div>
        <h3 className="mb-4 text-lg font-medium text-[#062644]">
          {t('supervisor.correctionHistory')}
        </h3>
        {historyCorrections.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              {t('supervisor.noCorrectionHistory')}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {historyCorrections.map((corr) => renderCorrectionCard(corr, false))}
          </div>
        )}
      </div>

      <Dialog open={!!denyDialog} onOpenChange={(o) => !o && setDenyDialog(null)}>
        <DialogContent showClose={true}>
          <DialogHeader>
            <DialogTitle>{t('common.deny')}</DialogTitle>
          </DialogHeader>
          <div>
            <Label>{t('supervisor.denialReason')}</Label>
            <Input
              value={denialReason}
              onChange={(e) => setDenialReason(e.target.value)}
              placeholder="Reason for denial..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDenyDialog(null)}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDeny}>
              {t('common.deny')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
