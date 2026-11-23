import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, CalendarDays, CheckCircle2, Video } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatDateLong, hhmm } from '../../lib/format';
import Button from '../../components/ui/Button';

function toDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function BookingSoon() {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [specialty, setSpecialty] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [modality, setModality] = useState('');
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [startTime, setStartTime] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDate(toDateInput(tomorrow));

    supabase
      .from('doctors_public')
      .select('id, name, specialty, appointment_type')
      .order('name')
      .then(({ data, error: doctorsError }) => {
        if (doctorsError) setError('Não foi possível carregar os médicos.');
        else setDoctors(data ?? []);
      });
  }, []);

  const specialties = useMemo(
    () => [...new Set(doctors.map((doctor) => doctor.specialty))].sort(),
    [doctors],
  );

  const filteredDoctors = useMemo(
    () => doctors.filter((doctor) => !specialty || doctor.specialty === specialty),
    [doctors, specialty],
  );

  const selectedDoctor = doctors.find((doctor) => doctor.id === doctorId);

  useEffect(() => {
    setDoctorId('');
    setModality('');
  }, [specialty]);

  useEffect(() => {
    setModality('');
  }, [doctorId]);

  useEffect(() => {
    if (!doctorId || !date) {
      setSlots([]);
      setStartTime('');
      return;
    }

    let active = true;
    setLoadingSlots(true);
    setStartTime('');
    supabase
      .rpc('get_available_slots', { p_doctor_id: doctorId, p_date: date })
      .then(({ data, error: slotsError }) => {
        if (!active) return;
        setLoadingSlots(false);
        if (slotsError) {
          setError('Não foi possível consultar os horários disponíveis.');
          setSlots([]);
        } else {
          setError('');
          setSlots(data ?? []);
        }
      });
    return () => {
      active = false;
    };
  }, [doctorId, date]);

  function modalityAllowed(type) {
    return selectedDoctor?.appointment_type === 'ambas'
      || selectedDoctor?.appointment_type === type;
  }

  async function confirmBooking(event) {
    event.preventDefault();
    setError('');
    if (!selectedDoctor || !modality || !startTime || symptoms.trim().length < 5) {
      setError('Selecione médico, modalidade e horário e descreva seus sintomas.');
      return;
    }

    setBooking(true);
    const { error: bookingError } = await supabase.rpc('book_appointment', {
      p_doctor_id: doctorId,
      p_date: date,
      p_start: startTime,
      p_type: modality,
      p_symptoms: symptoms.trim(),
    });
    setBooking(false);

    if (bookingError) {
      setError(bookingError.message);
      return;
    }
    setConfirmed(true);
  }

  if (confirmed) {
    return (
      <section className="mx-auto max-w-2xl card text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-brand-600" aria-hidden />
        <h1 className="mt-4 text-3xl font-semibold">Consulta agendada</h1>
        <p className="mt-2 text-ink/70">
          Sua consulta com {selectedDoctor.name} foi registrada para {formatDateLong(date)}, às {hhmm(startTime)}.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={() => navigate('/paciente')}>Ver minhas consultas</Button>
          <Button onClick={() => {
            setConfirmed(false);
            setStartTime('');
            setSymptoms('');
          }} variant="secondary">Agendar outra</Button>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-5xl">
      <header>
        <p className="text-sm font-semibold text-brand-700">Novo agendamento</p>
        <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">Escolha seu atendimento</h1>
      </header>

      <form onSubmit={confirmBooking} className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <fieldset className="card">
            <legend className="mb-4 text-lg font-semibold">1. Especialidade e médico</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="mb-1.5 block text-sm font-semibold">Especialidade</span>
                <select className="field" value={specialityValue(specialty)} onChange={(event) => setSpecialty(event.target.value)}>
                  <option value="">Todas as especialidades</option>
                  {specialties.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label>
                <span className="mb-1.5 block text-sm font-semibold">Médico</span>
                <select className="field" value={doctorId} onChange={(event) => setDoctorId(event.target.value)}>
                  <option value="">Selecione um médico</option>
                  {filteredDoctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>{doctor.name}</option>
                  ))}
                </select>
              </label>
            </div>
          </fieldset>

          {selectedDoctor && (
            <fieldset className="card">
              <legend className="mb-4 text-lg font-semibold">2. Modalidade</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {modalityAllowed('presencial') && (
                  <button type="button" className={`card flex items-center gap-3 text-left ${modality === 'presencial' ? 'ring-2 ring-brand-600' : ''}`} onClick={() => setModality('presencial')}>
                    <Building2 className="h-6 w-6 text-brand-600" />
                    <span><strong className="block">Presencial</strong><small>Atendimento na clínica</small></span>
                  </button>
                )}
                {modalityAllowed('online') && (
                  <button type="button" className={`card flex items-center gap-3 text-left ${modality === 'online' ? 'ring-2 ring-brand-600' : ''}`} onClick={() => setModality('online')}>
                    <Video className="h-6 w-6 text-brand-600" />
                    <span><strong className="block">Online</strong><small>Consulta por vídeo</small></span>
                  </button>
                )}
              </div>
            </fieldset>
          )}

          {selectedDoctor && (
            <fieldset className="card">
              <legend className="mb-4 text-lg font-semibold">3. Data e horário</legend>
              <label>
                <span className="mb-1.5 block text-sm font-semibold">Data</span>
                <input className="field" type="date" value={date} min={toDateInput(new Date())} onChange={(event) => setDate(event.target.value)} />
              </label>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {loadingSlots ? (
                  <p className="col-span-full text-sm text-ink/60">Consultando horários...</p>
                ) : slots.length === 0 ? (
                  <p className="col-span-full text-sm text-ink/60">Não há horários disponíveis nesta data.</p>
                ) : slots.map((slot) => {
                  const value = hhmm(slot.start_time);
                  return (
                    <button
                      type="button"
                      key={value}
                      className={`rounded-lg border px-3 py-2.5 text-sm font-semibold ${startTime === slot.start_time ? 'border-brand-600 bg-brand-600 text-white' : 'border-brand-100 hover:border-brand-600 hover:text-brand-700'}`}
                      onClick={() => setStartTime(slot.start_time)}
                    >
                      {value}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          {selectedDoctor && (
            <fieldset className="card">
              <legend className="mb-4 text-lg font-semibold">4. Relato</legend>
              <label>
                <span className="mb-1.5 block text-sm font-semibold">Descreva seus sintomas</span>
                <textarea className="field min-h-28 resize-y" value={symptoms} onChange={(event) => setSymptoms(event.target.value)} minLength={5} maxLength={2000} placeholder="Conte brevemente o que está sentindo..." />
              </label>
              <p className="mt-1 text-right text-xs text-ink/50">{symptoms.length}/2000</p>
            </fieldset>
          )}
        </div>

        <aside className="card h-fit lg:sticky lg:top-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><CalendarDays className="h-5 w-5 text-brand-600" />Resumo</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div><dt className="text-ink/50">Especialidade</dt><dd className="font-semibold">{specialty || 'Não selecionada'}</dd></div>
            <div><dt className="text-ink/50">Médico</dt><dd className="font-semibold">{selectedDoctor?.name || 'Não selecionado'}</dd></div>
            <div><dt className="text-ink/50">Data</dt><dd className="font-semibold">{date ? formatDateLong(date) : 'Não selecionada'}</dd></div>
            <div><dt className="text-ink/50">Horário</dt><dd className="font-semibold">{startTime ? hhmm(startTime) : 'Não selecionado'}</dd></div>
            <div><dt className="text-ink/50">Modalidade</dt><dd className="font-semibold">{modality === 'online' ? 'Online' : modality === 'presencial' ? 'Presencial' : 'Não selecionada'}</dd></div>
          </dl>
          {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
          <Button type="submit" className="mt-5 w-full" disabled={booking}>
            {booking ? 'Confirmando...' : 'Confirmar agendamento'}
          </Button>
        </aside>
      </form>
    </section>
  );
}

function specialityValue(value) {
  return value;
}
