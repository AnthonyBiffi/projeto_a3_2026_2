import { useState } from 'react';
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const roleLabels = {
  patient: 'paciente',
  doctor: 'médico',
  admin: 'administrador',
};

function AccessDenied({ currentRole, requiredRoles }) {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const required = requiredRoles.map((role) => roleLabels[role] ?? role).join(' ou ');

  async function switchAccount() {
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setError(signOutError.message);
      return;
    }
    navigate('/entrar', { replace: true });
  }

  return (
    <main className="mx-auto max-w-xl px-5 py-16">
      <h1 className="text-2xl font-semibold">Acesso restrito</h1>
      <p className="mt-3 text-ink/70">
        Esta área exige uma conta de {required}. A sessão atual está identificada como{' '}
        <strong>{roleLabels[currentRole] ?? 'sem perfil'}</strong>.
      </p>
      {error && <p className="mt-3 text-sm text-red-700" role="alert">{error}</p>}
      <button type="button" className="button button-primary mt-5" onClick={switchAccount}>
        Sair e trocar de conta
      </button>
      <Link className="ml-4 inline-block font-semibold text-brand-700" to="/">
        Voltar ao início
      </Link>
    </main>
  );
}

export default function ProtectedRoute({ roles, element }) {
  const { session, profile, loading, profileError } = useAuth();
  const location = useLocation();

  if (loading) return <div role="status">Carregando...</div>;
  if (!session) return <Navigate to="/entrar" replace state={{ from: location }} />;
  if (profileError) {
    return (
      <main className="mx-auto max-w-xl px-5 py-16">
        <h1 className="text-2xl font-semibold">Não foi possível carregar seu perfil</h1>
        <p className="mt-3 text-ink/70" role="alert">{profileError}</p>
        <Link className="mt-5 inline-block font-semibold text-brand-700" to="/entrar">
          Voltar para entrar
        </Link>
      </main>
    );
  }

  if (roles && !roles.includes(profile.role)) {
    if (profile.role === 'doctor') return <Navigate to="/medico" replace />;
    if (profile.role === 'admin') return <Navigate to="/admin" replace />;
    return <AccessDenied currentRole={profile.role} requiredRoles={roles} />;
  }

  return element ?? <Outlet />;
}
