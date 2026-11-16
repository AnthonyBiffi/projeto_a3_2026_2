import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, CalendarPlus, Building2, Video, History, XCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Alert, EmptyState, Spinner, StatusBadge } from '../../components/ui/Feedback';
import Button, { buttonClasses } from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { dayNumber, formatDateLong, hhmm, isFutureAppointment, modalityLabel, monthShort } from '../../lib/format';

function AppointmentCard({ a, onCancel }) {
  const future = isFutureAppointment(a);
  const badgeStatus = a.status === 'agendada' && !future ? 'pendente' : a.status;
  const canCancel = a.status === 'agendada' && future;
  const Icon = a.appointment_type === 'online' ? Video : Building2;

  return (
    <article className={`flex gap-4 rounded-2xl border bg-white p-4 sm:p-5 ${a.status === 'cancelada' ? 'border-slate-200 opacity-80' : 'border-brand-100'}`}>
      <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-50 text-brand-700">
        <span className="font-display text-2xl font-semibold leading-none">{dayNumber(a.appointment_date)}</span>
        <span className="mt-1 text-xs font-semibold">{monthShort(a.appointment_date)}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="font-sans text-base font-semibold">{a.doctor_name}</h3>
            <p className="text-sm text-ink/70">{a.doctor_specialty}</p>
          </div>
          <StatusBadge status={badgeStatus} />
        </div>
        <p className="mt-2 text-sm capitalize text-ink/80">{formatDateLong(a.appointment_date)}</p>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-ink/80">
          <Icon className="h-4 w-4 text-brand-600" aria-hidden />
          {hhmm(a.start_time)} às {hhmm(a.end_time)} · {modalityLabel(a.appointment_type)}
        </p>
        <p className="mt-3 line-clamp-2 text-sm text-ink/65" title={a.symptoms}>
          <span className="font-semibold text-ink/80">Seu relato: </span>{a.symptoms}
        </p>
        {canCancel && (
          <Button variant="secondary" size="sm" className="mt-4" onClick={() => onCancel(a)}>Cancelar consulta</Button>
        )}
      </div>
    </article>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-brand-100 bg-white p-4">
      <Icon className="h-5 w-5 text-brand-600" aria-hidden />
      <p className="mt-3 font-display text-3xl font-semibold leading-none">{value}</p>
      <p className="mt-1 text-sm text-ink/65">{label}</p>
    </div>
  );
}

export default function Dashboard() {
  const { profile } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('upcoming');
  const [target, setTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    const { data, error: err } = await supabase.rpc('get_my_appointments');
    if (err) {
      setError('Não foi possível carregar suas consultas. Tente novamente.');
      setItems([]);
    } else {
      setError(null);
      setItems(data);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const { upcoming, history, counts } = useMemo(() => {
    const list = items ?? [];
    const up = list.filter((a) => a.status === 'agendada' && isFutureAppointment(a)).sort(
      (x, y) => `${x.appointment_date}${x.start_time}`.localeCompare(`${y.appointment_date}${y.start_time}`),
    );
    const hist = list.filter((a) => !up.includes(a));
    return {
      upcoming: up,
      history: hist,
      counts: {
        up: up.length,
        done: list.filter((a) => a.status === 'realizada').length,
        canceled: list.filter((a) => a.status === 'cancelada').length,
      },
    };
  }, [items]);

  async function confirmCancel() {
    setCancelling(true);
    const { error: err } = await supabase.rpc('set_appointment_status', { p_id: target.id, p_status: 'cancelada' });
    setCancelling(false);
    if (err) {
      toast.error('Não foi possível cancelar. A consulta pode já ter sido alterada.');
    } else {
      toast.success('Consulta cancelada. O horário foi liberado.');
    }
    setTarget(null);
    load();
  }

  const firstName = profile.patient?.name?.split(' ')[0];
  const shown = tab === 'upcoming' ? upcoming : history;

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold sm:text-4xl">Olá, {firstName}</h1>
          <p className="mt-1 text-ink/70">Suas consultas em um só lugar.</p>
        </div>
        <Link to="/agendar" className={buttonClasses('primary', 'md')}>
          <CalendarPlus className="h-4 w-4" aria-hidden /> Agendar consulta
        </Link>
      </header>

      <div className="mt-8 grid grid-cols-3 gap-3">
        <Stat icon={CalendarClock} label="Próximas" value={items ? counts.up : '–'} />
        <Stat icon={CheckCircle2} label="Realizadas" value={items ? counts.done : '–'} />
        <Stat icon={XCircle} label="Canceladas" value={items ? counts.canceled : '–'} />
      </div>

      <div className="mt-10 flex gap-1 border-b border-brand-100" role="tablist">
        {[['upcoming', 'Próximas', CalendarClock], ['history', 'Histórico', History]].map(([key, label, Icon]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold ${
              tab === key ? 'border-brand-600 text-brand-700' : 'border-transparent text-ink/60 hover:text-ink'
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden /> {label}
          </button>
        ))}
      </div>

      <section className="mt-6 space-y-4" aria-live="polite">
        {error && <Alert variant="error">{error}</Alert>}
        {!items ? (
          <div className="flex justify-center py-16"><Spinner className="h-7 w-7" /></div>
        ) : shown.length === 0 && !error ? (
          tab === 'upcoming' ? (
            <EmptyState icon={CalendarPlus} title="Você não tem consultas marcadas">
              Escolha uma especialidade e um horário para agendar sua próxima consulta.
              <div className="mt-5"><Link to="/agendar" className={buttonClasses('primary', 'md')}>Agendar consulta</Link></div>
            </EmptyState>
          ) : (
            <EmptyState icon={History} title="Nenhuma consulta no histórico">
              Consultas realizadas e canceladas aparecem aqui.
            </EmptyState>
          )
        ) : (
          shown.map((a) => <AppointmentCard key={a.id} a={a} onCancel={setTarget} />)
        )}
      </section>

      <ConfirmDialog
        open={!!target}
        title="Cancelar esta consulta?"
        confirmLabel="Cancelar consulta"
        loading={cancelling}
        onConfirm={confirmCancel}
        onCancel={() => setTarget(null)}
      >
        {target && (
          <p>
            Consulta com <strong>{target.doctor_name}</strong> em {formatDateLong(target.appointment_date)}, às {hhmm(target.start_time)}.
            O horário ficará livre para outros pacientes e a consulta permanece no seu histórico como cancelada.
          </p>
        )}
      </ConfirmDialog>
    </div>
  );
}
