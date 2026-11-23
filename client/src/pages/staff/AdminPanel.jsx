import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import Button from '../../components/ui/Button';
import { createDoctor } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

const weekdays = [
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
];

const initialForm = {
  name: '',
  email: '',
  specialty: '',
  phone: '',
  crm: '',
  appointment_type: 'ambas',
  selectedDays: [1, 2, 3, 4, 5],
  start_time: '09:00',
  end_time: '17:00',
  appointment_duration: '30',
  break_interval: '0',
};

export default function AdminPanel() {
  const { session } = useAuth();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createError, setCreateError] = useState('');
  const [success, setSuccess] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(initialForm);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data, error: loadError } = await supabase
      .from('doctors')
      .select('id, name, email, specialty, phone, crm, appointment_type, active')
      .order('name');
    if (loadError) setError(loadError.message);
    else setDoctors(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleActive(doctor) {
    const { error: updateError } = await supabase
      .from('doctors')
      .update({ active: !doctor.active })
      .eq('id', doctor.id);
    if (updateError) setError(updateError.message);
    else load();
  }

  function updateForm(field) {
    return (event) => {
      const value = event.target.value;
      setForm((current) => ({ ...current, [field]: value }));
    };
  }

  function toggleDay(day) {
    setForm((current) => ({
      ...current,
      selectedDays: current.selectedDays.includes(day)
        ? current.selectedDays.filter((selected) => selected !== day)
        : [...current.selectedDays, day],
    }));
  }

  async function handleCreateDoctor(event) {
    event.preventDefault();
    setCreateError('');
    setSuccess('');

    if (!session?.access_token) {
      setCreateError('Sua sessão expirou. Entre novamente como administrador.');
      return;
    }
    if (form.selectedDays.length === 0) {
      setCreateError('Selecione pelo menos um dia de atendimento.');
      return;
    }
    if (form.end_time <= form.start_time) {
      setCreateError('O horário final deve ser posterior ao horário inicial.');
      return;
    }

    setCreating(true);
    try {
      const schedules = form.selectedDays.map((weekday) => ({
        weekday,
        start_time: form.start_time,
        end_time: form.end_time,
        appointment_duration: Number(form.appointment_duration),
        break_interval: Number(form.break_interval),
      }));
      await createDoctor(session?.access_token, {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        specialty: form.specialty.trim(),
        crm: form.crm.trim(),
        appointment_type: form.appointment_type,
        ...(form.phone.trim() ? { phone: form.phone.replace(/\D/g, '') } : {}),
        schedules,
      });
      setSuccess(`Médico cadastrado. O convite foi enviado para ${form.email.trim()}.`);
      setForm(initialForm);
      await load();
    } catch (createError) {
      setCreateError(createError.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="min-h-screen bg-mist px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-brand-700">Área administrativa</p>
            <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">Corpo clínico</h1>
          </div>
          <Button variant="secondary" onClick={load}>Atualizar</Button>
        </header>

        <section className="card mt-6">
          <div className="mb-5">
            <h2 className="text-xl font-semibold">Cadastrar médico</h2>
            <p className="mt-1 text-sm text-ink/60">
              O sistema cria a agenda e envia um convite para o profissional definir a senha.
            </p>
          </div>
          <form onSubmit={handleCreateDoctor} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <label>
                <span className="mb-1.5 block text-sm font-semibold">Nome completo</span>
                <input className="field" value={form.name} onChange={updateForm('name')} minLength={3} maxLength={150} required />
              </label>
              <label>
                <span className="mb-1.5 block text-sm font-semibold">E-mail do médico</span>
                <input className="field" type="email" autoComplete="email" value={form.email} onChange={updateForm('email')} required />
              </label>
              <label>
                <span className="mb-1.5 block text-sm font-semibold">Especialidade</span>
                <input className="field" value={form.specialty} onChange={updateForm('specialty')} minLength={2} maxLength={100} required />
              </label>
              <label>
                <span className="mb-1.5 block text-sm font-semibold">CRM</span>
                <input className="field" value={form.crm} onChange={updateForm('crm')} maxLength={30} placeholder="123456/SP" required />
              </label>
              <label>
                <span className="mb-1.5 block text-sm font-semibold">Telefone</span>
                <input className="field" type="tel" value={form.phone} onChange={updateForm('phone')} />
              </label>
              <label>
                <span className="mb-1.5 block text-sm font-semibold">Modalidade</span>
                <select className="field" value={form.appointment_type} onChange={updateForm('appointment_type')}>
                  <option value="ambas">Presencial e online</option>
                  <option value="presencial">Somente presencial</option>
                  <option value="online">Somente online</option>
                </select>
              </label>
            </div>

            <fieldset>
              <legend className="mb-2 text-sm font-semibold">Dias de atendimento</legend>
              <div className="flex flex-wrap gap-2">
                {weekdays.map(({ value, label }) => (
                  <label key={value} className={`cursor-pointer rounded-lg border px-3 py-2 text-sm transition ${form.selectedDays.includes(value) ? 'border-brand-600 bg-brand-50 font-semibold text-brand-700' : 'border-slate-200 bg-white text-ink/70 hover:border-brand-300'}`}>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={form.selectedDays.includes(value)}
                      onChange={() => toggleDay(value)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label>
                <span className="mb-1.5 block text-sm font-semibold">Início</span>
                <input className="field" type="time" value={form.start_time} onChange={updateForm('start_time')} required />
              </label>
              <label>
                <span className="mb-1.5 block text-sm font-semibold">Fim</span>
                <input className="field" type="time" value={form.end_time} onChange={updateForm('end_time')} required />
              </label>
              <label>
                <span className="mb-1.5 block text-sm font-semibold">Duração da consulta</span>
                <select className="field" value={form.appointment_duration} onChange={updateForm('appointment_duration')}>
                  {[15, 20, 30, 45, 60].map((minutes) => <option key={minutes} value={minutes}>{minutes} minutos</option>)}
                </select>
              </label>
              <label>
                <span className="mb-1.5 block text-sm font-semibold">Intervalo entre consultas</span>
                <select className="field" value={form.break_interval} onChange={updateForm('break_interval')}>
                  {[0, 5, 10, 15, 20, 30].map((minutes) => <option key={minutes} value={minutes}>{minutes} minutos</option>)}
                </select>
              </label>
            </div>

            {createError && <p className="alert alert-error" role="alert">{createError}</p>}
            {success && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">{success}</p>}
            <Button type="submit" disabled={creating}>
              {creating ? 'Cadastrando e enviando convite...' : 'Cadastrar e enviar convite'}
            </Button>
          </form>
        </section>

        {error && <p className="mt-6 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
        {loading ? (
          <p className="py-16 text-center text-ink/60">Carregando médicos...</p>
        ) : doctors.length === 0 ? (
          <div className="card mt-6 text-center text-ink/60">Nenhum médico cadastrado.</div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {doctors.map((doctor) => (
              <article key={doctor.id} className="card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">{doctor.name}</h2>
                    <p className="text-sm text-brand-700">{doctor.specialty}</p>
                  </div>
                  <span className={`status ${doctor.active ? 'status-realizada' : 'status-cancelada'}`}>
                    {doctor.active ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <dl className="mt-4 grid gap-2 text-sm">
                  <div><dt className="inline text-ink/50">CRM: </dt><dd className="inline font-semibold">{doctor.crm}</dd></div>
                  <div><dt className="inline text-ink/50">E-mail: </dt><dd className="inline">{doctor.email}</dd></div>
                  <div><dt className="inline text-ink/50">Atendimento: </dt><dd className="inline capitalize">{doctor.appointment_type}</dd></div>
                </dl>
                <Button
                  type="button"
                  variant={doctor.active ? 'secondary' : 'primary'}
                  size="sm"
                  className="mt-5"
                  onClick={() => toggleActive(doctor)}
                >
                  {doctor.active ? 'Desativar médico' : 'Ativar médico'}
                </Button>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
