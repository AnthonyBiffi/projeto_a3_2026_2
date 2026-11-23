import { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, CalendarDays, CheckCircle2, Video } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatDateLong, hhmm } from '../../lib/format';
import Button from '../../components/ui/Button';

export default function DoctorPanel() {
  const [appointments, setAppointments] = useState([]);
  const [filter, setFilter] = useState('hoje');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data, error: loadError } = await supabase.rpc('get_doctor_appointments');
    if (loadError) setError(loadError.message);
    else setAppointments(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const today = new Date();
  const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const visible = useMemo(() => appointments.filter((item) => {
    if (filter === 'hoje') return item.appointment_date === todayISO && item.status === 'agendada';
    if (filter === 'proximas') return item.appointment_date >= todayISO && item.status === 'agendada';
    return true;
  }), [appointments, filter, todayISO]);

  async function updateStatus(id, status) {
    const { error: updateError } = await supabase.rpc('set_appointment_status', {
      p_id: id,
      p_status: status,
    });
    if (updateError) setError(updateError.message);
    else load();
  }

  return (
    <main className="min-h-screen bg-mist px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-brand-700">Área do médico</p>
            <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">Minha agenda</h1>
          </div>
          <Button variant="secondary" onClick={load}>Atualizar</Button>
        </header>

        <div className="mt-8 flex gap-2 border-b border-brand-100">
          {[['hoje', 'Hoje'], ['proximas', 'Próximas'], ['todas', 'Todas']].map(([key, label]) => (
            <button key={key} type="button" onClick={() => setFilter(key)} className={`border-b-2 px-4 py-3 text-sm font-semibold ${filter === key ? 'border-brand-600 text-brand-700' : 'border-transparent text-ink/60'}`}>
              {label}
            </button>
          ))}
        </div>

        {error && <p className="mt-6 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
        {loading ? (
          <p className="py-16 text-center text-ink/60">Carregando agenda...</p>
        ) : visible.length === 0 ? (
          <div className="card mt-6 text-center text-ink/60">Nenhuma consulta encontrada neste filtro.</div>
        ) : (
          <div className="mt-6 grid gap-4">
            {visible.map((item) => (
              <article key={item.id} className="card grid gap-4 md:grid-cols-[170px_1fr_auto]">
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 flex-col items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <div>
                    <strong className="block">{hhmm(item.start_time)}</strong>
                    <small className="text-ink/60">{formatDateLong(item.appointment_date)}</small>
                  </div>
                </div>
                <div>
                  <h2 className="text-lg font-semibold">{item.patient_name}</h2>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-ink/70">
                    {item.appointment_type === 'online' ? <Video className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                    {item.appointment_type === 'online' ? 'Online' : 'Presencial'} · {item.patient_phone}
                  </p>
                  <p className="mt-3 text-sm"><strong>Sintomas:</strong> {item.symptoms}</p>
                  <p className="mt-1 text-xs text-ink/50">{item.patient_email}</p>
                </div>
                <div className="flex items-start gap-2 md:flex-col">
                  {item.status === 'agendada' ? (
                    <>
                      <Button size="sm" onClick={() => updateStatus(item.id, 'realizada')}><CheckCircle2 className="h-4 w-4" />Concluir</Button>
                      <Button size="sm" variant="secondary" onClick={() => updateStatus(item.id, 'cancelada')}>Cancelar</Button>
                    </>
                  ) : (
                    <span className={`status status-${item.status}`}>{item.status}</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
