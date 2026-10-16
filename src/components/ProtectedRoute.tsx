import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export function ProtectedRoute() {
  const { session, business, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
      </div>
    );
  }

  if (!session) return <Navigate to="/signin" replace />;

  // If user has no email confirmed, force them to verify before accessing setup
  if (user && !user.email_confirmed_at && location.pathname !== '/signup') {
    return <Navigate to="/signup" replace />;
  }

  if (!business && location.pathname !== '/setup') {
    return <Navigate to="/setup" replace />;
  }

  return <Outlet />;
}

export function GuestRoute() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
      </div>
    );
  }

  if (session) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}
