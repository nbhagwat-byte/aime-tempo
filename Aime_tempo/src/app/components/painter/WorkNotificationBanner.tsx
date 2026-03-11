import { useAuth } from '@/app/contexts/AuthContext';
import { useLanguage } from '@/app/contexts/LanguageContext';
import {
  getActiveTimeLog,
  getUserTimeLogs,
  isWorkNotificationDismissed,
  setWorkNotificationDismissed,
} from '@/app/utils/dataManager';
import { isToday } from 'date-fns';
import { Button } from '@/app/components/ui/button';
import { Alert, AlertDescription } from '@/app/components/ui/alert';

interface WorkNotificationBannerProps {
  onOpenCorrection: () => void;
}

export function WorkNotificationBanner({ onOpenCorrection }: WorkNotificationBannerProps) {
  const { currentUser } = useAuth();
  const { t } = useLanguage();

  if (!currentUser) return null;

  const dismissed = isWorkNotificationDismissed(currentUser.id);
  const now = new Date();
  const after8am = now.getHours() >= 8;
  const activeLog = getActiveTimeLog(currentUser.id);
  const todayLogs = getUserTimeLogs(currentUser.id).filter(
    (l) => l.checkOut && isToday(new Date(l.checkIn))
  );
  const hasWorkToday = activeLog || todayLogs.length > 0;

  const show = after8am && !hasWorkToday && !dismissed;

  if (!show) return null;

  return (
    <Alert className="border-[#F0C908] bg-[#F0C908]/10">
      <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
        <span>{t('painter.workNotification')}</span>
        <div className="flex gap-2">
          <Button variant="warning" size="sm" onClick={onOpenCorrection}>
            {t('painter.addMissingShift')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWorkNotificationDismissed(currentUser.id, true)}
          >
            {t('painter.dismiss')}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
