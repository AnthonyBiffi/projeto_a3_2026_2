import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import AuthLayout from '../../components/layout/AuthLayout';
import { Spinner } from '../../components/ui/Feedback';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError) {
        setError(sessionError.message);
        return;
      }
      if (data.session) {
        navigate('/paciente', { replace: true });
        return;
      }
      setError('O link não criou uma sessão. Ele pode ter expirado ou já ter sido utilizado.');
    }).catch((sessionError) => {
      if (active) setError(sessionError.message);
    });

    return () => {
      active = false;
    };
  }, [navigate]);

  return (
    <AuthLayout
      eyebrow="Confirmação de conta"
      title={error ? 'Não foi possível confirmar' : 'Confirmando seu e-mail'}
      description={error
        ? 'O link de confirmação não pôde ser processado.'
        : 'Estamos validando o link e preparando sua sessão segura.'}
    >
      {error ? (
        <div>
          <p className="alert alert-error" role="alert">{error}</p>
          <Link to="/entrar" className="button button-primary mt-5 w-full no-underline">Ir para entrar</Link>
        </div>
      ) : (
        <div className="flex items-center gap-3 text-sm text-ink/65" role="status">
          <Spinner className="h-5 w-5" />
          Aguarde um instante...
        </div>
      )}
    </AuthLayout>
  );
}
