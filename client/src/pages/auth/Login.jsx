import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function Login() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }

    if (params.get('perfil') === 'medico') navigate('/medico');
    else navigate('/paciente');
  }

  return (
    <main>
      <h1>Entrar</h1>
      <form onSubmit={handleSubmit}>
        <label>E-mail<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label>Senha<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={loading}>{loading ? 'Entrando...' : 'Entrar'}</button>
      </form>
      <Link to="/esqueci-senha">Esqueci minha senha</Link>
    </main>
  );
}
