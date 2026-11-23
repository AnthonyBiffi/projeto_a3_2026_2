import { useState } from 'react';
import { Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { getMe } from '../../lib/api';
import AuthLayout from '../../components/layout/AuthLayout';
import Button from '../../components/ui/Button';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isDoctorLogin = params.get('perfil') === 'medico';

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        setError('E-mail ou senha incorretos. Confira os dados e tente novamente.');
        return;
      }

      const me = await getMe(data.session.access_token);

      const rolePath = {
        patient: '/paciente',
        doctor: '/medico',
        admin: '/admin',
      }[me.user.role];
      if (!rolePath) {
        setError(`A API retornou um perfil sem papel reconhecido (${me.user.role ?? 'ausente'}). Contate o suporte.`);
        return;
      }
      const requestedPath = location.state?.from?.pathname;
      const requestedPathAllowed = me.user.role === 'patient'
        ? requestedPath?.startsWith('/paciente') || requestedPath === '/agendar'
        : requestedPath?.startsWith(rolePath);
      navigate(requestedPathAllowed ? requestedPath : rolePath, { replace: true });
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : 'Não foi possível entrar agora. Verifique sua conexão e tente novamente.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      eyebrow={isDoctorLogin ? 'Acesso profissional' : 'Bem-vindo de volta'}
      title={isDoctorLogin ? 'Acesse sua área' : 'Entre na sua conta'}
      description={isDoctorLogin
        ? 'Entre com os dados da conta profissional enviada pela administração.'
        : 'Acesse suas consultas e continue cuidando da sua saúde.'}
      footer={<>Ainda não tem uma conta? <Link to="/cadastro" className="font-semibold text-brand-700 no-underline hover:underline">Criar conta</Link></>}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-ink">E-mail</span>
          <span className="relative block">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink/40" aria-hidden />
            <input
              className="field h-12 pl-11"
              type="email"
              autoComplete="email"
              placeholder="voce@exemplo.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </span>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-ink">Senha</span>
          <span className="relative block">
            <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink/40" aria-hidden />
            <input
              className="field h-12 pl-11 pr-12"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Sua senha"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink/45 transition hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </span>
        </label>

        <div className="flex justify-end">
          <Link to="/esqueci-senha" className="text-sm font-semibold text-brand-700 no-underline hover:underline">
            Esqueci minha senha
          </Link>
        </div>

        {error && <p className="alert alert-error" role="alert">{error}</p>}

        <Button type="submit" className="h-12 w-full" disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </Button>
      </form>
    </AuthLayout>
  );
}
