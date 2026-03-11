import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { getUsers, saveUser, deleteUser } from '@/app/utils/dataManager';
import type { User } from '@/app/types';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Badge } from '@/app/components/ui/badge';

export function TeamManagement() {
  const { t } = useLanguage();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'painter' | 'supervisor'>('painter');
  const [hourlyRate, setHourlyRate] = useState('');
  const [language, setLanguage] = useState<'en' | 'es'>('en');

  const users = getUsers();
  const painters = users.filter((u) => u.role === 'painter');
  const avgRate = painters.length ? painters.reduce((s, u) => s + u.hourlyRate, 0) / painters.length : 0;

  const openAdd = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setPassword('');
    setRole('painter');
    setHourlyRate('');
    setLanguage('en');
    setDialogOpen(true);
  };

  const openEdit = (u: User) => {
    setEditingUser(u);
    setName(u.name);
    setEmail(u.email);
    setPassword(u.password);
    setRole(u.role);
    setHourlyRate(String(u.hourlyRate));
    setLanguage(u.language);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!name.trim() || !email.trim()) {
      toast.error('Name and email required');
      return;
    }
    if (!editingUser && (!password || password.length < 6)) {
      toast.error('Password min 6 characters');
      return;
    }
    const id = editingUser?.id ?? `u-${Date.now()}`;
    const user: User = {
      id,
      name: name.trim(),
      email: email.trim(),
      password: password || (editingUser?.password ?? ''),
      role,
      hourlyRate: parseFloat(hourlyRate) || 0,
      language,
    };
    saveUser(user);
    toast.success('Saved');
    setDialogOpen(false);
  };

  const handleDelete = (u: User) => {
    if (!confirm(t('common.delete') + '?')) return;
    deleteUser(u.id);
    toast.success('Removed');
  };

  return (
    <div className="space-y-6">
      <Card className="border-[#236B8E]/30">
        <CardContent className="pt-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-2xl font-bold text-[#062644]">{painters.length}</p>
              <p className="text-sm text-gray-600">{t('supervisor.totalPainters')}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-[#062644]">${avgRate.toFixed(2)}</p>
              <p className="text-sm text-gray-600">{t('supervisor.avgHourlyRate')}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-[#062644]">—</p>
              <p className="text-sm text-gray-600">{t('supervisor.activeToday')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button variant="warning" className="gap-2" onClick={openAdd}>
        <Plus className="h-4 w-4" />
        {t('supervisor.addTeamMember')}
      </Button>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {users.map((u) => (
          <Card key={u.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#062644] text-lg font-bold text-white">
                    {u.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-[#062644]">{u.name}</p>
                    <p className="text-xs text-gray-500">{u.email}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(u)} aria-label={t('common.edit')}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(u)} className="text-[#D10000]" aria-label={t('common.delete')}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="mt-2 text-lg font-semibold text-[#236B8E]">${u.hourlyRate.toFixed(2)}/hr</p>
              <div className="mt-2 flex gap-2">
                <Badge variant="secondary">{u.language === 'en' ? 'EN' : 'ES'}</Badge>
                <Badge>{u.role === 'supervisor' ? t('supervisor.supervisor') : t('supervisor.painter')}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent showClose={true}>
          <DialogHeader>
            <DialogTitle>{editingUser ? t('supervisor.editMember') : t('supervisor.addTeamMember')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('supervisor.name')}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <Label>{t('supervisor.email')}</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label>{t('supervisor.password')}</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={editingUser ? 'Leave blank to keep' : ''}
                minLength={editingUser ? 0 : 6}
              />
            </div>
            <div>
              <Label>{t('supervisor.role')}</Label>
              <Select value={role} onValueChange={(v: 'painter' | 'supervisor') => setRole(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="painter">{t('supervisor.painter')}</SelectItem>
                  <SelectItem value="supervisor">{t('supervisor.supervisor')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('supervisor.hourlyRate')}</Label>
              <Input
                type="number"
                step="0.01"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
              />
            </div>
            <div>
              <Label>{t('supervisor.language')}</Label>
              <Select value={language} onValueChange={(v: 'en' | 'es') => setLanguage(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">{t('supervisor.english')}</SelectItem>
                  <SelectItem value="es">{t('supervisor.spanish')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSave}>{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

