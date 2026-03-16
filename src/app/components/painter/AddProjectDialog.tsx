import { useState } from 'react';
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
import { Slider } from '@/app/components/ui/slider';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { useAuth } from '@/app/contexts/AuthContext';
import { savePendingProject } from '@/app/utils/dataManager';

interface AddProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRequested: () => void;
}

export function AddProjectDialog({ open, onOpenChange, onRequested }: AddProjectDialogProps) {
  const { t } = useLanguage();
  const { currentUser } = useAuth();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [radius, setRadius] = useState(100);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !address.trim() || !currentUser) return;
    const pending = {
      id: crypto.randomUUID(),
      name: name.trim(),
      address: address.trim(),
      radius,
      status: 'pending' as const,
      requestedBy: currentUser.id,
      createdAt: new Date().toISOString(),
    };
    try {
      await savePendingProject(pending);
      toast.success(t('painter.projectRequestSubmitted'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to submit project request';
      toast.error(msg);
      return;
    }
    setName('');
    setAddress('');
    setRadius(100);
    onOpenChange(false);
    onRequested();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showClose={true}>
        <DialogHeader>
          <DialogTitle>{t('painter.requestNewProject')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t('painter.projectName')}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('supervisor.enterProjectName')}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>{t('painter.address')}</Label>
            <div className="flex gap-2">
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main St, City, State"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t('painter.radius')}: {radius}m</Label>
            <Slider
              value={[radius]}
              onValueChange={([v]) => setRadius(v)}
              min={50}
              max={1000}
              step={10}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="warning">
              {t('common.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
