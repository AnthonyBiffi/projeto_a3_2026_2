import { Link } from 'react-router-dom';
import { CalendarCheck, Video, Building2, ShieldCheck, Stethoscope, ClipboardList, UserRoundCheck } from 'lucide-react';
import PublicHeader from '../components/layout/PublicHeader';
import { buttonClasses } from '../components/ui/Button';
import { brand } from '../config/brand';

const steps = [
  ['Escolha a especialidade', 'Veja as áreas de atendimento disponíveis na clínica.'],
  ['Selecione o médico', 'Confira modalidade de atendimento, dias e horários de cada profissional.'],
  ['Defina presencial ou online', 'Você escolhe entre as modalidades que o médico atende.'],
  ['Descreva seus sintomas', 'O médico lê o seu relato antes da consulta.'],
  ['Escolha dia e horário', 'Só aparecem horários realmente livres, no horário de Brasília.'],
  ['Confirme o agendamento', 'Revise o resumo e finalize. A consulta fica na sua área.'],
];

// Grade decorativa da semana (ilustração, sem dados reais)
const days = ['seg', 'ter', 'qua', 'qui', 'sex'];
const slots = ['08:00', '08:30', '09:00', '09:30'];
const taken = new Set(['0-1', '1-0', '2-3', '3-1', '4-2', '1-2']);
const picked = '2-1';

function WeekPreview() {
  return (
    <div aria-hidden className="rounded-2xl border border-brand-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-brand-700">
        <CalendarCheck className="h-4 w-4" /> Horários livres
      </div>
      <div className="grid grid-cols-5 gap-2 text-center text-xs text-ink/60">
        {days.map((d) => (
          <span key={d} className="pb-1 font-semibold">{d}</span>
        ))}
        {slots.map((s, r) =>
          days.map((d, c) => {
            const key = `${c}-${r}`;
            const isTaken = taken.has(key);
            const isPicked = key === picked;
            return (
              <span
                key={key}
                className={`rounded-md py-2 font-medium ${
                  isPicked
                    ? 'bg-brand-600 text-white'
                    : isTaken
                      ? 'bg-slate-100 text-slate-400 line-through'
                      : 'bg-brand-50 text-brand-700'
                }`}
              >
                {s}
              </span>
            );
          }),
        )}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <PublicHeader />

      <section className="bg-gradient-to-b from-brand-50 to-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:py-20">
          <div>
            <h1 className="max-w-xl text-4xl font-semibold leading-[1.1] sm:text-5xl">
              Cuidar da saúde começa por um bom horário.
            </h1>
            <p className="mt-5 max-w-lg text-lg text-ink/75">
              {brand.name} reúne médicos de várias especialidades em um só lugar. Veja os horários livres,
              conte o que está sentindo e marque sua consulta, presencial ou online.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/agendar" className={buttonClasses('primary', 'lg')}>Agendar consulta</Link>
              <Link to="/paciente" className={buttonClasses('secondary', 'lg')}>Área do paciente</Link>
              <Link to="/entrar?perfil=medico" className={buttonClasses('secondary', 'lg')}>Área do médico</Link>
            </div>
            <p className="mt-4 text-sm text-ink/60">
              Primeira vez aqui? <Link to="/cadastro" className="font-semibold text-brand-700 underline underline-offset-2">Crie sua conta</Link> em um minuto.
            </p>
          </div>
          <WeekPreview />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="max-w-md text-3xl font-semibold">Como funciona o agendamento</h2>
        <ol className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map(([title, text], i) => (
            <li key={title} className="flex gap-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 font-display text-base font-semibold text-white">
                {i + 1}
              </span>
              <div>
                <h3 className="font-sans text-base font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-ink/70">{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-mist">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-3">
          <div className="flex gap-4">
            <Building2 className="mt-1 h-6 w-6 shrink-0 text-brand-600" aria-hidden />
            <div>
              <h3 className="font-sans text-lg font-semibold">Presencial</h3>
              <p className="mt-1 text-sm text-ink/70">Atendimento na clínica, no dia e horário que você escolher.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <Video className="mt-1 h-6 w-6 shrink-0 text-brand-600" aria-hidden />
            <div>
              <h3 className="font-sans text-lg font-semibold">Online</h3>
              <p className="mt-1 text-sm text-ink/70">Consulta por vídeo, sem deslocamento, com os mesmos médicos.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <ShieldCheck className="mt-1 h-6 w-6 shrink-0 text-brand-600" aria-hidden />
            <div>
              <h3 className="font-sans text-lg font-semibold">Seus dados protegidos</h3>
              <p className="mt-1 text-sm text-ink/70">
                Só você e o médico da sua consulta acessam o seu relato, conforme a LGPD.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-16 sm:px-6 md:grid-cols-2">
        <div className="rounded-2xl border border-brand-100 p-6">
          <UserRoundCheck className="h-6 w-6 text-brand-600" aria-hidden />
          <h3 className="mt-3 font-sans text-lg font-semibold">Para pacientes</h3>
          <p className="mt-1 text-sm text-ink/70">Acompanhe consultas futuras, consulte o histórico e cancele quando precisar.</p>
          <Link to="/cadastro" className="mt-4 inline-block text-sm font-semibold text-brand-700 underline underline-offset-2">Criar conta de paciente</Link>
        </div>
        <div className="rounded-2xl border border-brand-100 p-6">
          <Stethoscope className="h-6 w-6 text-brand-600" aria-hidden />
          <h3 className="mt-3 font-sans text-lg font-semibold">Para médicos</h3>
          <p className="mt-1 text-sm text-ink/70">O cadastro de médicos é feito pela administração da clínica, que envia um convite por e-mail.</p>
          <Link to="/entrar?perfil=medico" className="mt-4 inline-block text-sm font-semibold text-brand-700 underline underline-offset-2">Entrar na área do médico</Link>
        </div>
      </section>

      <footer className="border-t border-brand-100 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-ink/60 sm:flex-row sm:justify-between sm:px-6">
          <span className="flex items-center gap-2"><ClipboardList className="h-4 w-4" aria-hidden /> {brand.name}. Dados de saúde tratados conforme a LGPD.</span>
          <a href={`mailto:${brand.supportEmail}`} className="hover:text-ink">{brand.supportEmail}</a>
        </div>
      </footer>
    </div>
  );
}
