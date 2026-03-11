import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useAuth } from '@/app/contexts/AuthContext';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { getUsers } from '@/app/utils/dataManager';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const users = getUsers();
    const user = users.find((u) => u.email === email && u.password === password);
    if (!user) {
      toast.error('Invalid email or password');
      return;
    }
    login(user);
    toast.success('Welcome back!');
    navigate(user.role === 'painter' ? '/painter' : '/supervisor', { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-[#062644] via-[#236B8E] to-[#062644] p-4">
      <div className="w-full max-w-md rounded-lg border-2 border-[#236B8E] bg-white p-8 shadow-xl">
        <h1 className="mb-1 text-center font-bold text-[#062644]" style={{ fontSize: '36px', fontFamily: 'Montserrat' }}>
          {t('common.appName')}
        </h1>
        <p className="mb-6 text-center text-sm text-gray-600">{t('auth.tagline')}</p>

        <div className="mb-4 flex justify-center gap-2">
          <button
            type="button"
            onClick={() => setLanguage('en')}
            className={`rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors ${
              language === 'en'
                ? 'border-[#236B8E] bg-[#236B8E] text-white'
                : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
            }`}
            aria-label="English"
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => setLanguage('es')}
            className={`rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors ${
              language === 'es'
                ? 'border-[#236B8E] bg-[#236B8E] text-white'
                : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
            }`}
            aria-label="Español"
          >
            ES
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t('auth.email')}</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t('auth.password')}</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <Button type="submit" className="w-full bg-[#236B8E] hover:bg-[#062644]">
            {t('auth.login')}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-gray-500">{t('auth.demoCredentials')}</p>
      </div>
    </div>
  );
}
