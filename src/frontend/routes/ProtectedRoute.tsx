import { Navigate, Outlet } from 'react-router-dom';
import { LoadingBlock } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { Role } from '../types';

export function ProtectedRoute({ roles }: { roles: Role[] }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingBlock />;
  if (!user) return <Navigate to={roles.includes('CUSTOMER') ? '/login' : '/admin/login'} replace />;
  if (!roles.includes(user.role)) return <Navigate to="/access-denied" replace />;
  return <Outlet />;
}
