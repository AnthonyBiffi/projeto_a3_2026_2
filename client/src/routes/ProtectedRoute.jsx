import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ roles, element }) {
  const { session, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div role="status">Carregando...</div>;
  if (!session) return <Navigate to="/entrar" replace state={{ from: location }} />;

  if (roles && !roles.includes(profile.role)) {
    if (profile.role === 'doctor') return <Navigate to="/medico" replace />;
    if (profile.role === 'admin') return <Navigate to="/admin" replace />;
    return <Navigate to="/" replace />;
  }

  return element ?? <Outlet />;
}
