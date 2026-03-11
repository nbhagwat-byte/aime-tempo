import { createBrowserRouter, Outlet } from 'react-router';
import { LanguageProvider } from '@/app/contexts/LanguageContext';
import { AuthProvider } from '@/app/contexts/AuthContext';
import { ProtectedRoute } from '@/app/components/ProtectedRoute';
import LoginPage from '@/app/pages/LoginPage';
import PainterApp from '@/app/pages/PainterApp';
import SupervisorDashboard from '@/app/pages/SupervisorDashboard';

function RootLayout() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <Outlet />
      </AuthProvider>
    </LanguageProvider>
  );
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <LoginPage /> },
      {
        path: '/painter',
        element: (
          <ProtectedRoute allowedRoles={['painter']}>
            <PainterApp />
          </ProtectedRoute>
        ),
      },
      {
        path: '/supervisor',
        element: (
          <ProtectedRoute allowedRoles={['supervisor']}>
            <SupervisorDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: '*',
        element: (
          <div className="flex min-h-screen items-center justify-center font-sans text-[#062644]">
            404 - Page Not Found
          </div>
        ),
      },
    ],
  },
]);
