import { ArrowLeft, HeartPulse, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { brand } from '../../config/brand';

export default function AuthLayout({ eyebrow, title, description, children, footer }) {
  return (
    <main className="min-h-screen bg-white lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(440px,0.9fr)]">
      <section className="relative hidden min-h-screen overflow-hidden bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 px-10 py-9 text-white lg:flex lg:flex-col lg:justify-between xl:px-16">
        <div className="absolute -right-36 -top-32 h-96 w-96 rounded-full border border-white/10" />
        <div className="absolute -right-16 top-24 h-72 w-72 rounded-full border border-white/10" />
        <div className="absolute -bottom-48 -left-20 h-96 w-96 rounded-full bg-white/5 blur-2xl" />

        <Link to="/" className="relative inline-flex w-fit items-center gap-3 text-lg font-bold tracking-tight text-white no-underline">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/20">
            <HeartPulse className="h-6 w-6" aria-hidden />
          </span>
          {brand.name}
        </Link>

        <div className="relative max-w-xl py-16">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium ring-1 ring-white/15">
            <Sparkles className="h-4 w-4" aria-hidden />
            Cuidado mais simples, em um só lugar
          </span>
          <h2 className="mt-7 text-4xl font-semibold leading-tight xl:text-5xl">
            Sua saúde merece atenção em cada etapa.
          </h2>
          <p className="mt-5 max-w-lg text-lg leading-8 text-white/75">
            Encontre profissionais, organize suas consultas e acompanhe seu cuidado com tranquilidade.
          </p>

          <div className="mt-10 flex items-start gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-200" aria-hidden />
            <p className="text-sm leading-6 text-white/85">
              Seus dados são tratados com cuidado e acessados de acordo com o seu perfil.
            </p>
          </div>
        </div>

        <p className="relative text-sm text-white/60">© {new Date().getFullYear()} {brand.name}</p>
      </section>

      <section className="flex min-h-screen flex-col px-5 py-5 sm:px-8 lg:px-12 xl:px-20">
        <header className="flex items-center justify-between lg:justify-end">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-ink/65 no-underline transition hover:text-brand-700 lg:hidden">
            <HeartPulse className="h-5 w-5 text-brand-600" aria-hidden />
            {brand.name}
          </Link>
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-ink/60 no-underline transition hover:text-brand-700">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Voltar ao início</span>
            <span className="sm:hidden">Início</span>
          </Link>
        </header>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <div className="mb-8">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-brand-700">{eyebrow}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{title}</h1>
            <p className="mt-3 leading-6 text-ink/65">{description}</p>
          </div>
          {children}
          {footer && <div className="mt-7 border-t border-slate-100 pt-6 text-center text-sm text-ink/65">{footer}</div>}
        </div>

        <p className="text-center text-xs text-ink/45">
          Precisa de ajuda? <a className="font-semibold text-brand-700 no-underline hover:underline" href={`mailto:${brand.supportEmail}`}>{brand.supportEmail}</a>
        </p>
      </section>
    </main>
  );
}
