-- =====================================================================
-- MedClinic CRM - Migração 001: schema, RLS e regras de agendamento
-- Rodar no SQL Editor do Supabase (ou via supabase db push)
-- =====================================================================

create extension if not exists btree_gist;
create extension if not exists pgcrypto;

-- ---------- Tipos ----------
create type user_role        as enum ('patient', 'doctor', 'admin');
create type doctor_modality  as enum ('presencial', 'online', 'ambas');
create type visit_modality   as enum ('presencial', 'online');
create type appt_status      as enum ('agendada', 'realizada', 'cancelada');

-- ---------- Configuração do administrador único ----------
create or replace function public.admin_email() returns text
language sql immutable as $$ select 'anthonymendesbiffi@gmail.com'::text $$;

-- ---------- Tabelas ----------
create table public.patients (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 3 and 150),
  cpf         text not null unique check (cpf ~ '^\d{11}$'),
  birth_date  date not null check (birth_date < current_date),
  email       text not null unique,
  phone       text not null check (phone ~ '^\d{10,13}$'),
  created_at  timestamptz not null default now()
);

create table public.doctors (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  email            text not null unique,
  specialty        text not null,
  phone            text,
  crm              text not null unique,
  appointment_type doctor_modality not null default 'ambas',
  active           boolean not null default true,
  created_at       timestamptz not null default now()
);
create index doctors_specialty_idx on public.doctors (specialty) where active;

create table public.doctor_schedules (
  id                   uuid primary key default gen_random_uuid(),
  doctor_id            uuid not null references public.doctors(id) on delete cascade,
  weekday              smallint not null check (weekday between 0 and 6), -- 0 = domingo
  start_time           time not null,
  end_time             time not null,
  appointment_duration integer not null check (appointment_duration between 5 and 240), -- minutos
  break_interval       integer not null default 0 check (break_interval between 0 and 120),
  check (end_time > start_time),
  unique (doctor_id, weekday)
);

create table public.profiles (
  id           uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  role         user_role not null,
  patient_id   uuid references public.patients(id) on delete restrict,
  doctor_id    uuid references public.doctors(id)  on delete restrict,
  email        text not null,
  check (
    (role = 'patient' and patient_id is not null and doctor_id is null) or
    (role = 'doctor'  and doctor_id  is not null and patient_id is null) or
    (role = 'admin'   and patient_id is null and doctor_id is null)
  ),
  -- somente o e-mail autorizado pode ter papel admin
  check (role <> 'admin' or lower(email) = public.admin_email())
);

create table public.appointments (
  id               uuid primary key default gen_random_uuid(),
  patient_id       uuid not null references public.patients(id) on delete restrict,
  doctor_id        uuid not null references public.doctors(id)  on delete restrict,
  appointment_date date not null,
  start_time       time not null,
  end_time         time not null,
  appointment_type visit_modality not null,
  symptoms         text not null check (char_length(symptoms) between 5 and 2000),
  status           appt_status not null default 'agendada',
  created_at       timestamptz not null default now(),
  check (end_time > start_time),
  -- Impede dois agendamentos sobrepostos para o mesmo médico (ignora cancelados)
  constraint no_double_booking exclude using gist (
    doctor_id with =,
    tsrange(appointment_date + start_time, appointment_date + end_time, '[)') with &&
  ) where (status <> 'cancelada')
);
create index appt_doctor_date_idx  on public.appointments (doctor_id, appointment_date);
create index appt_patient_date_idx on public.appointments (patient_id, appointment_date);

-- ---------- Funções auxiliares (security definer evita recursão de RLS) ----------
create or replace function public.current_role_name() returns user_role
language sql stable security definer set search_path = public as $$
  select role from profiles where auth_user_id = auth.uid()
$$;

create or replace function public.current_patient_id() returns uuid
language sql stable security definer set search_path = public as $$
  select patient_id from profiles where auth_user_id = auth.uid()
$$;

create or replace function public.current_doctor_id() returns uuid
language sql stable security definer set search_path = public as $$
  select doctor_id from profiles where auth_user_id = auth.uid()
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles p
    join auth.users u on u.id = p.auth_user_id
    where p.auth_user_id = auth.uid()
      and p.role = 'admin'
      and lower(u.email) = public.admin_email()
      and u.email_confirmed_at is not null
  )
$$;

-- ---------- Criação automática de perfil no signup ----------
-- admin: e-mail autorizado | médico: e-mail pré-cadastrado pelo admin | demais: paciente
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_doctor  doctors%rowtype;
  v_patient uuid;
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  if lower(new.email) = public.admin_email() then
    insert into profiles(auth_user_id, role, email) values (new.id, 'admin', new.email);
    return new;
  end if;

  select * into v_doctor from doctors where lower(email) = lower(new.email);
  if found then
    insert into profiles(auth_user_id, role, doctor_id, email)
    values (new.id, 'doctor', v_doctor.id, new.email);
    return new;
  end if;

  insert into patients(name, cpf, birth_date, email, phone)
  values (
    m->>'name',
    regexp_replace(coalesce(m->>'cpf',''), '\D', '', 'g'),
    (m->>'birth_date')::date,
    new.email,
    regexp_replace(coalesce(m->>'phone',''), '\D', '', 'g')
  ) returning id into v_patient;

  insert into profiles(auth_user_id, role, patient_id, email)
  values (new.id, 'patient', v_patient, new.email);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Horários disponíveis (fuso America/Sao_Paulo) ----------
create or replace function public.get_available_slots(p_doctor_id uuid, p_date date)
returns table (start_time time, end_time time)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_variable
declare
  s doctor_schedules%rowtype;
  t time;
  now_sp timestamp := (now() at time zone 'America/Sao_Paulo');
begin
  if auth.uid() is null then raise exception 'não autenticado'; end if;
  if not exists (select 1 from doctors where id = p_doctor_id and active) then return; end if;
  if p_date < now_sp::date then return; end if;

  select * into s from doctor_schedules
   where doctor_id = p_doctor_id and weekday = extract(dow from p_date)::int;
  if not found then return; end if;

  t := s.start_time;
  while t + make_interval(mins => s.appointment_duration) <= s.end_time loop
    start_time := t;
    end_time   := t + make_interval(mins => s.appointment_duration);
    if (p_date + start_time) > now_sp
       and not exists (
         select 1 from appointments a
          where a.doctor_id = p_doctor_id and a.appointment_date = p_date
            and a.status <> 'cancelada'
            and a.start_time < end_time and a.end_time > start_time)
    then
      return next;
    end if;
    t := t + make_interval(mins => s.appointment_duration + s.break_interval);
  end loop;
end $$;

-- ---------- Agendamento atômico ----------
create or replace function public.book_appointment(
  p_doctor_id uuid, p_date date, p_start time,
  p_type visit_modality, p_symptoms text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_patient uuid := current_patient_id();
  v_doc doctors%rowtype;
  v_end time;
  v_id uuid;
begin
  if v_patient is null then raise exception 'Apenas pacientes podem agendar'; end if;

  select * into v_doc from doctors where id = p_doctor_id and active;
  if not found then raise exception 'Médico indisponível'; end if;

  if v_doc.appointment_type <> 'ambas' and v_doc.appointment_type::text <> p_type::text then
    raise exception 'Modalidade não atendida por este médico';
  end if;

  -- o horário precisa constar na lista gerada pela agenda do médico
  select s.end_time into v_end from get_available_slots(p_doctor_id, p_date) s
   where s.start_time = p_start;
  if v_end is null then raise exception 'Horário indisponível'; end if;

  begin
    insert into appointments(patient_id, doctor_id, appointment_date, start_time, end_time,
                             appointment_type, symptoms)
    values (v_patient, p_doctor_id, p_date, p_start, v_end, p_type, trim(p_symptoms))
    returning id into v_id;
  exception when exclusion_violation then
    raise exception 'Este horário acabou de ser reservado. Escolha outro.';
  end;
  return v_id;
end $$;

-- ---------- Mudança de status (única via de UPDATE) ----------
create or replace function public.set_appointment_status(p_id uuid, p_status appt_status)
returns void
language plpgsql security definer set search_path = public as $$
declare a appointments%rowtype;
begin
  select * into a from appointments where id = p_id for update;
  if not found then raise exception 'Consulta não encontrada'; end if;
  if a.status <> 'agendada' then raise exception 'Consulta já finalizada'; end if;

  if a.doctor_id = current_doctor_id() then
    if p_status = 'agendada' then raise exception 'Status inválido'; end if;
  elsif a.patient_id = current_patient_id() then
    if p_status <> 'cancelada' then raise exception 'Paciente só pode cancelar'; end if;
    if (a.appointment_date + a.start_time) <= (now() at time zone 'America/Sao_Paulo') then
      raise exception 'Não é possível cancelar consulta passada';
    end if;
  else
    raise exception 'Sem permissão';
  end if;

  update appointments set status = p_status where id = p_id;
end $$;

-- ---------- Visão pública de médicos (sem CRM/e-mail/telefone) ----------
create view public.doctors_public as
  select d.id, d.name, d.specialty, d.appointment_type
    from doctors d where d.active;

-- ---------- Row Level Security ----------
alter table public.patients         enable row level security;
alter table public.doctors          enable row level security;
alter table public.doctor_schedules enable row level security;
alter table public.profiles         enable row level security;
alter table public.appointments     enable row level security;

-- profiles: cada um vê o seu; ninguém escreve pelo cliente
create policy profiles_select_own on profiles for select
  using (auth_user_id = auth.uid());

-- patients: paciente vê o próprio; médico vê apenas pacientes com consulta com ele
create policy patients_select_own on patients for select
  using (id = current_patient_id());
create policy patients_select_doctor on patients for select
  using (exists (select 1 from appointments a
                  where a.patient_id = patients.id and a.doctor_id = current_doctor_id()));
create policy patients_update_own on patients for update
  using (id = current_patient_id()) with check (id = current_patient_id());

-- doctors: médico vê o próprio; admin gerencia todos (pacientes usam doctors_public)
create policy doctors_select_own   on doctors for select using (id = current_doctor_id());
create policy doctors_admin_select on doctors for select using (is_admin());
create policy doctors_admin_insert on doctors for insert with check (is_admin());
create policy doctors_admin_update on doctors for update using (is_admin()) with check (is_admin());

-- doctor_schedules: leitura para autenticados (médicos ativos); escrita só admin
create policy sched_select on doctor_schedules for select
  using (auth.uid() is not null and exists (
    select 1 from doctors d where d.id = doctor_id and (d.active or is_admin())));
create policy sched_admin_write on doctor_schedules for all
  using (is_admin()) with check (is_admin());

-- appointments: somente leitura direta; escrita via funções acima
create policy appt_select_patient on appointments for select
  using (patient_id = current_patient_id());
create policy appt_select_doctor on appointments for select
  using (doctor_id = current_doctor_id());

-- ---------- Privilégios ----------
revoke all on all tables in schema public from anon, authenticated;
grant select on public.profiles, public.patients, public.doctors,
                public.doctor_schedules, public.appointments to authenticated;
grant insert, update on public.doctors to authenticated;           -- limitado pelas policies (admin)
grant insert, update, delete on public.doctor_schedules to authenticated; -- idem
grant update on public.patients to authenticated;                  -- limitado à própria linha
grant select on public.doctors_public to authenticated;

revoke execute on all functions in schema public from public, anon;
grant execute on function public.get_available_slots(uuid, date) to authenticated;
grant execute on function public.book_appointment(uuid, date, time, visit_modality, text) to authenticated;
grant execute on function public.set_appointment_status(uuid, appt_status) to authenticated;
grant execute on function public.current_role_name(), public.current_patient_id(),
      public.current_doctor_id(), public.is_admin() to authenticated;
