import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function SetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) setError(updateError.message);
    else navigate('/entrar');
  }

  return (
    <main>
      <h1>Definir nova senha</h1>
      <form onSubmit={handleSubmit}>
        <label>Nova senha<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required /></label>
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Salvar senha'}</button>
      </form>
    </main>
  );
}
