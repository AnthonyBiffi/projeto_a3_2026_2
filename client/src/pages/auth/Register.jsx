import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    cpf: '',
    birth_date: '',
    email: '',
    phone: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(field) {
    return (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    const { error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          name: form.name,
          cpf: form.cpf.replace(/\D/g, ''),
          birth_date: form.birth_date,
          phone: form.phone.replace(/\D/g, ''),
        },
      },
    });
    setLoading(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    navigate('/entrar');
  }

  return (
    <main>
      <h1>Criar conta de paciente</h1>
      <form onSubmit={handleSubmit}>
        <label>Nome<input value={form.name} onChange={update('name')} required /></label>
        <label>CPF<input value={form.cpf} onChange={update('cpf')} inputMode="numeric" required /></label>
        <label>Data de nascimento<input type="date" value={form.birth_date} onChange={update('birth_date')} required /></label>
        <label>E-mail<input type="email" value={form.email} onChange={update('email')} required /></label>
        <label>Telefone<input value={form.phone} onChange={update('phone')} required /></label>
        <label>Senha<input type="password" value={form.password} onChange={update('password')} minLength={8} required /></label>
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={loading}>{loading ? 'Cadastrando...' : 'Cadastrar'}</button>
      </form>
      <Link to="/entrar">Já tenho conta</Link>
    </main>
  );
}
