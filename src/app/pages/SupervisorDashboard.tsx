import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Briefcase, Clock, DollarSign, LogOut, Users } from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { getTimeCorrections } from '@/app/utils/dataManager';
import { Button } from '@/app/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Badge } from '@/app/components/ui/badge';
import { ProjectManagement } from '@/app/components/supervisor/ProjectManagement';
import { TeamManagement } from '@/app/components/supervisor/TeamManagement';
import { TimeReview } from '@/app/components/supervisor/TimeReview';
import { PayrollExport } from '@/app/components/supervisor/PayrollExport';
import { PendingProjectsQueue } from '@/app/components/supervisor/PendingProjectsQueue';

export default function SupervisorDashboard() {
  const { currentUser, signOut } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const corrections = await getTimeCorrections();
        if (!active) return;
        setPendingCount(corrections.filter((c) => c.status === 'pending').length);
      } catch {
        // Non-blocking
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleLogout = () => {
    void signOut();
    navigate('/', { replace: true });
  };

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[#236B8E]/20 bg-[#062644] px-4 py-3 text-white">
        <span className="text-lg font-bold">{t('common.appName')}</span>
        <div className="flex items-center gap-3">
          <span className="text-sm">{currentUser.name}</span>
          <button
            type="button"
            onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
            className="rounded px-2 py-1 text-sm hover:bg-white/10"
          >
            {language === 'en' ? 'ES' : 'EN'}
          </button>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={handleLogout} aria-label={t('common.logout')}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-4">
        <Tabs defaultValue="projects" className="space-y-4">
          <TabsList className="flex w-full flex-wrap gap-2 bg-gray-100 p-2">
            <TabsTrigger value="projects" className="gap-1">
              <Briefcase className="h-4 w-4" />
              {t('supervisor.projects')}
            </TabsTrigger>
            <TabsTrigger value="team" className="gap-1">
              <Users className="h-4 w-4" />
              {t('supervisor.team')}
            </TabsTrigger>
            <TabsTrigger value="time" className="gap-1">
              <Clock className="h-4 w-4" />
              Time Logs
            </TabsTrigger>
            <TabsTrigger value="payroll" className="gap-1">
              <DollarSign className="h-4 w-4" />
              {t('supervisor.payroll')}
            </TabsTrigger>
            <TabsTrigger value="queue" className="gap-1">
              {t('supervisor.queue')}
              {pendingCount > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {pendingCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="projects">
            <ProjectManagement />
          </TabsContent>
          <TabsContent value="team">
            <TeamManagement />
          </TabsContent>
          <TabsContent value="time">
            <TimeReview />
          </TabsContent>
          <TabsContent value="payroll">
            <PayrollExport />
          </TabsContent>
          <TabsContent value="queue">
            <PendingProjectsQueue />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
