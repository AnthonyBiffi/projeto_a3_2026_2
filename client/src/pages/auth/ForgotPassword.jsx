import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import AuthLayout from '../../components/layout/AuthLayout';
import Button from '../../components/ui/Button';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/definir-senha`,
      });
      if (resetError) {
        setError(resetError.message);
        return;
      }
      setMessage('Enviamos as instruções para redefinir sua senha.');
      setEmailSent(true);
    } catch {
      setError('Não foi possível enviar o link agora. Verifique sua conexão e tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  if (emailSent) {
    return (
      <AuthLayout
        eyebrow="E-mail enviado"
        title="Confira sua caixa de entrada"
        description={`Enviamos um link de redefinição para ${email.trim()}.`}
        footer={<>Não recebeu o e-mail? <button type="button" className="font-semibold text-brand-700" onClick={() => setEmailSent(false)}>Tentar novamente</button></>}
      >
        <div className="rounded-2xl border border-brand-100 bg-brand-50 p-5">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-white text-brand-700 shadow-sm">
            <Mail className="h-5 w-5" aria-hidden />
          </div>
          <p className="mt-4 text-sm leading-6 text-ink/75">
            Abra o link recebido para criar uma nova senha. Se não encontrar o e-mail, confira também a pasta de spam.
          </p>
          {message && <p className="mt-4 text-sm font-semibold text-emerald-700" role="status">{message}</p>}
          <Link to="/entrar" className="button button-primary mt-5 w-full no-underline">
            Voltar para entrar
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      eyebrow="Recuperação de senha"
      title="Esqueceu sua senha?"
      description="Informe seu e-mail e enviaremos um link seguro para você criar uma nova senha."
      footer={<>Lembrou a senha? <Link to="/entrar" className="font-semibold text-brand-700 no-underline hover:underline">Entrar na conta</Link></>}
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

        <p className="flex items-start gap-2 text-xs leading-5 text-ink/55">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden />
          O link será válido por um período limitado e só poderá ser usado para redefinir esta conta.
        </p>

        {error && <p className="alert alert-error" role="alert">{error}</p>}

        <Button type="submit" className="h-12 w-full" disabled={loading}>
          {loading ? 'Enviando link...' : 'Enviar link de redefinição'}
        </Button>
      </form>
      <Link to="/entrar" className="mt-5 inline-flex items-center justify-center gap-2 text-sm font-semibold text-ink/60 no-underline transition hover:text-brand-700">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Voltar para o login
      </Link>
    </AuthLayout>
  );
}
