import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarDays, Eye, EyeOff, Mail, Phone, ShieldCheck, UserRound } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import AuthLayout from '../../components/layout/AuthLayout';
import Button from '../../components/ui/Button';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    cpf: '',
    birth_date: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  function update(field) {
    return (event) => {
      const value = event.target.value;
      setForm((current) => ({ ...current, [field]: value }));
    };
  }

  function formatCpf(value) {
    return value
      .replace(/\D/g, '')
      .slice(0, 11)
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }

  function formatPhone(value) {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits.length ? `(${digits}` : '';
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, digits.length - 4)}-${digits.slice(-4)}`;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (form.cpf.replace(/\D/g, '').length !== 11) {
      setError('Informe um CPF com 11 dígitos.');
      return;
    }
    if (form.phone.replace(/\D/g, '').length < 10) {
      setError('Informe um telefone com DDD.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('As senhas não conferem.');
      return;
    }

    setLoading(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            name: form.name.trim(),
            cpf: form.cpf.replace(/\D/g, ''),
            birth_date: form.birth_date,
            phone: form.phone.replace(/\D/g, ''),
          },
        },
      });
      if (signUpError) {
        setError(signUpError.message);
        return;
      }
      if (data.session) {
        navigate('/paciente', { replace: true });
      } else {
        setConfirmationSent(true);
      }
    } catch {
      setError('Não foi possível criar sua conta agora. Verifique sua conexão e tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  if (confirmationSent) {
    return (
      <AuthLayout
        eyebrow="Quase lá"
        title="Confirme seu e-mail"
        description="Enviamos um link de confirmação para o endereço informado. Confirme sua conta para acessar a área do paciente."
        footer={<>Já confirmou? <Link to="/entrar" className="font-semibold text-brand-700 no-underline hover:underline">Entrar na conta</Link></>}
      >
        <div className="rounded-2xl border border-brand-100 bg-brand-50 p-5">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-white text-brand-700 shadow-sm">
            <Mail className="h-5 w-5" aria-hidden />
          </div>
          <p className="mt-4 text-sm leading-6 text-ink/75">
            Se a mensagem não chegar em alguns minutos, confira a pasta de spam ou tente entrar novamente para solicitar outro link.
          </p>
          <Link to="/entrar" className="button button-primary mt-5 w-full no-underline">Ir para entrar</Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      eyebrow="Cadastro de paciente"
      title="Crie sua conta"
      description="Preencha seus dados para marcar e acompanhar suas consultas."
      footer={<>Já tem uma conta? <Link to="/entrar" className="font-semibold text-brand-700 no-underline hover:underline">Entrar</Link></>}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-ink">Nome completo</span>
          <span className="relative block">
            <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink/40" aria-hidden />
            <input className="field h-11 pl-11" autoComplete="name" placeholder="Como podemos te chamar?" value={form.name} onChange={update('name')} minLength={3} maxLength={150} required />
          </span>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-ink">CPF</span>
            <input
              className="field h-11"
              inputMode="numeric"
              autoComplete="off"
              placeholder="000.000.000-00"
              value={form.cpf}
              onChange={(event) => setForm((current) => ({ ...current, cpf: formatCpf(event.target.value) }))}
              required
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-ink">Nascimento</span>
            <span className="relative block">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" aria-hidden />
              <input className="field h-11 pl-9 pr-2" type="date" autoComplete="bday" max={new Date().toISOString().slice(0, 10)} value={form.birth_date} onChange={update('birth_date')} required />
            </span>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-ink">E-mail</span>
            <span className="relative block">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink/40" aria-hidden />
              <input className="field h-11 pl-11" type="email" autoComplete="email" placeholder="voce@exemplo.com" value={form.email} onChange={update('email')} required />
            </span>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-ink">Telefone</span>
            <span className="relative block">
              <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink/40" aria-hidden />
              <input
                className="field h-11 pl-11"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                placeholder="(11) 99999-9999"
                value={form.phone}
                onChange={(event) => setForm((current) => ({ ...current, phone: formatPhone(event.target.value) }))}
                required
              />
            </span>
          </label>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-ink">Senha</span>
          <span className="relative block">
            <input
              className="field h-11 pr-12"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Mínimo de 8 caracteres"
              value={form.password}
              onChange={update('password')}
              minLength={8}
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

        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-ink">Confirme sua senha</span>
          <input className="field h-11" type="password" autoComplete="new-password" placeholder="Digite a senha novamente" value={form.confirmPassword} onChange={update('confirmPassword')} minLength={8} required />
        </label>

        <p className="flex items-start gap-2 pt-1 text-xs leading-5 text-ink/55">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden />
          Seus dados são usados para criar sua conta e organizar seus atendimentos.
        </p>
        {error && <p className="alert alert-error" role="alert">{error}</p>}

        <Button type="submit" className="h-12 w-full" disabled={loading}>
          {loading ? 'Criando sua conta...' : 'Criar conta'}
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-ink/60">
        É médico? O acesso profissional é criado pela administração.{' '}
        <Link to="/entrar?perfil=medico" className="font-semibold text-brand-700 no-underline hover:underline">
          Entrar como médico
        </Link>
      </p>
    </AuthLayout>
  );
}
