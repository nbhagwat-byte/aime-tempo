import { useEffect, useState } from 'react';
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
  const [dismissed, setDismissed] = useState<boolean>(true);
  const [hasWorkToday, setHasWorkToday] = useState<boolean>(true);

  if (!currentUser) return null;

  const now = new Date();
  const after8am = now.getHours() >= 8;

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [isDismissed, activeLog, logs] = await Promise.all([
          isWorkNotificationDismissed(currentUser.id),
          getActiveTimeLog(currentUser.id),
          getUserTimeLogs(currentUser.id),
        ]);
        if (!active) return;
        const todayLogs = logs.filter((l) => l.checkOut && isToday(new Date(l.checkIn)));
        setDismissed(isDismissed);
        setHasWorkToday(Boolean(activeLog) || todayLogs.length > 0);
      } catch {
        // Fail closed: do not show banner if we can't verify.
        if (!active) return;
        setDismissed(true);
        setHasWorkToday(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [currentUser.id]);

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
            onClick={async () => {
              await setWorkNotificationDismissed(currentUser.id, true);
              setDismissed(true);
            }}
          >
            {t('painter.dismiss')}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
