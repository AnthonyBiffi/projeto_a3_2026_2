import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage('');
    setError('');
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/definir-senha`,
    });
    if (resetError) setError(resetError.message);
    else setMessage('Confira seu e-mail para redefinir a senha.');
  }

  return (
    <main>
      <h1>Esqueci minha senha</h1>
      <form onSubmit={handleSubmit}>
        <label>E-mail<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        {error && <p role="alert">{error}</p>}
        {message && <p role="status">{message}</p>}
        <button type="submit">Enviar link</button>
      </form>
      <Link to="/entrar">Voltar para entrar</Link>
    </main>
  );
}
