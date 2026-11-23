-- =====================================================================
-- MedClinic CRM - Migração 002: área do paciente
-- Rodar DEPOIS da 001, no SQL Editor do Supabase.
-- =====================================================================

-- Lista as consultas do paciente logado já com nome/especialidade do médico.
-- (Pacientes não leem a tabela doctors; esta função expõe só o necessário e
--  mantém o histórico mesmo se o médico for desativado.)
create or replace function public.get_my_appointments()
returns table (
  id uuid,
  appointment_date date,
  start_time time,
  end_time time,
  appointment_type visit_modality,
  symptoms text,
  status appt_status,
  created_at timestamptz,
  doctor_name text,
  doctor_specialty text
)
language sql stable security definer set search_path = public as $$
  select a.id, a.appointment_date, a.start_time, a.end_time, a.appointment_type,
         a.symptoms, a.status, a.created_at, d.name, d.specialty
    from appointments a
    join doctors d on d.id = a.doctor_id
   where a.patient_id = current_patient_id()
   order by a.appointment_date desc, a.start_time desc
$$;

revoke execute on function public.get_my_appointments() from public, anon;
grant  execute on function public.get_my_appointments() to authenticated;

-- Paciente só pode alterar nome e telefone. CPF, e-mail, data de nascimento e id
-- ficam travados (o service_role, usado pelo servidor, não é afetado).
create or replace function public.patients_guard() returns trigger
language plpgsql as $$
begin
  if coalesce(auth.role(), '') = 'authenticated' and (
       new.id         is distinct from old.id
    or new.cpf        is distinct from old.cpf
    or new.email      is distinct from old.email
    or new.birth_date is distinct from old.birth_date
    or new.created_at is distinct from old.created_at) then
    raise exception 'Somente nome e telefone podem ser alterados';
  end if;
  return new;
end $$;

drop trigger if exists patients_guard_trg on public.patients;
create trigger patients_guard_trg
  before update on public.patients
  for each row execute function public.patients_guard();
