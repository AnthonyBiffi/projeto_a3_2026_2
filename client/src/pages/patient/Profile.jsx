import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

export default function Profile() {
  const { profile } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    setName(profile.patient?.name ?? '');
    setPhone(profile.patient?.phone ?? '');
  }, [profile]);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage('');
    if (!profile.patient_id) return;

    const { error } = await supabase
      .from('patients')
      .update({ name: name.trim(), phone: phone.replace(/\D/g, '') })
      .eq('id', profile.patient_id);

    if (error) setMessage('Não foi possível salvar suas alterações.');
    else setMessage('Perfil atualizado.');
  }

  return (
    <section>
      <h1>Meu perfil</h1>
      <form onSubmit={handleSubmit}>
        <label>Nome<input value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label>Telefone<input value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
        {message && <p role="status">{message}</p>}
        <button type="submit">Salvar</button>
      </form>
    </section>
  );
}
