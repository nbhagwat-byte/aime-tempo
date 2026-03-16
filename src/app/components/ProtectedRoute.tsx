import { Navigate, useLocation } from 'react-router';
import { useAuth } from '@/app/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('painter' | 'supervisor')[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { currentUser, status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return null;
  }

  if (!currentUser) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to={currentUser.role === 'painter' ? '/painter' : '/supervisor'} replace />;
  }

  return <>{children}</>;
}
