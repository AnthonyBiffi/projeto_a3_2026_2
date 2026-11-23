-- =====================================================================
-- MedClinic CRM - Migração 003: painel médico, minimização de dados e realtime
-- Rodar DEPOIS da 001 e da 002.
-- =====================================================================

-- 1) Consultas do médico logado, com o MÍNIMO de dados do paciente
--    (nome, telefone e e-mail). CPF e data de nascimento NÃO são expostos.
create or replace function public.get_doctor_appointments()
returns table (
  id uuid,
  appointment_date date,
  start_time time,
  end_time time,
  appointment_type visit_modality,
  symptoms text,
  status appt_status,
  created_at timestamptz,
  patient_name text,
  patient_phone text,
  patient_email text
)
language sql stable security definer set search_path = public as $$
  select a.id, a.appointment_date, a.start_time, a.end_time, a.appointment_type,
         a.symptoms, a.status, a.created_at, p.name, p.phone, p.email
    from appointments a
    join patients p on p.id = a.patient_id
   where a.doctor_id = current_doctor_id()
   order by a.appointment_date, a.start_time
$$;

revoke execute on function public.get_doctor_appointments() from public, anon;
grant  execute on function public.get_doctor_appointments() to authenticated;

-- 2) Médicos deixam de ler a tabela patients diretamente (acesso só pela função acima)
drop policy if exists patients_select_doctor on public.patients;

-- 3) Mudança de status: médico só conclui consulta que já começou
create or replace function public.set_appointment_status(p_id uuid, p_status appt_status)
returns void
language plpgsql security definer set search_path = public as $$
declare
  a appointments%rowtype;
  now_sp timestamp := (now() at time zone 'America/Sao_Paulo');
begin
  select * into a from appointments where id = p_id for update;
  if not found then raise exception 'Consulta não encontrada'; end if;
  if a.status <> 'agendada' then raise exception 'Consulta já finalizada'; end if;

  if a.doctor_id = current_doctor_id() then
    if p_status = 'agendada' then raise exception 'Status inválido'; end if;
    if p_status = 'realizada' and (a.appointment_date + a.start_time) > now_sp then
      raise exception 'A consulta ainda não começou';
    end if;
  elsif a.patient_id = current_patient_id() then
    if p_status <> 'cancelada' then raise exception 'Paciente só pode cancelar'; end if;
    if (a.appointment_date + a.start_time) <= now_sp then
      raise exception 'Não é possível cancelar consulta passada';
    end if;
  else
    raise exception 'Sem permissão';
  end if;

  update appointments set status = p_status where id = p_id;
end $$;

-- 4) Notificações em tempo real (Supabase Realtime respeita o RLS por usuário)
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables
                      where pubname = 'supabase_realtime'
                        and schemaname = 'public' and tablename = 'appointments') then
    alter publication supabase_realtime add table public.appointments;
  end if;
end $$;
