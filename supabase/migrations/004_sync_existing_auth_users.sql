-- Backfill Auth accounts created before the profile trigger/migrations existed.
-- Run after 001_schema.sql, 002_patient_area.sql and 003_staff_panels.sql.
-- Patient records are created only when the existing Auth metadata is complete.
do $$
declare
  u record;
  v_doctor_id uuid;
  v_patient_id uuid;
  v_name text;
  v_cpf text;
  v_phone text;
  v_birth_date date;
begin
  for u in
    select au.id, au.email, au.raw_user_meta_data
      from auth.users au
     where au.email is not null
       and not exists (
         select 1 from public.profiles p where p.auth_user_id = au.id
       )
  loop
    if lower(u.email) = public.admin_email() then
      insert into public.profiles(auth_user_id, role, email)
      values (u.id, 'admin', u.email)
      on conflict (auth_user_id) do nothing;
      continue;
    end if;

    select d.id into v_doctor_id
      from public.doctors d
     where lower(d.email) = lower(u.email)
     limit 1;

    if v_doctor_id is not null then
      insert into public.profiles(auth_user_id, role, doctor_id, email)
      values (u.id, 'doctor', v_doctor_id, u.email)
      on conflict (auth_user_id) do nothing;
      continue;
    end if;

    select p.id into v_patient_id
      from public.patients p
     where lower(p.email) = lower(u.email)
     limit 1;

    if v_patient_id is null then
      v_name := nullif(trim(u.raw_user_meta_data->>'name'), '');
      v_cpf := regexp_replace(coalesce(u.raw_user_meta_data->>'cpf', ''), '\D', '', 'g');
      v_phone := regexp_replace(coalesce(u.raw_user_meta_data->>'phone', ''), '\D', '', 'g');

      begin
        v_birth_date := nullif(u.raw_user_meta_data->>'birth_date', '')::date;
      exception when others then
        v_birth_date := null;
      end;

      if v_name is null or char_length(v_name) not between 3 and 150
         or v_cpf !~ '^\d{11}$'
         or v_phone !~ '^\d{10,13}$'
         or v_birth_date is null or v_birth_date >= current_date then
        raise notice 'Conta % ignorada: faltam metadados válidos para criar paciente', u.email;
        continue;
      end if;

      begin
        insert into public.patients(name, cpf, birth_date, email, phone)
        values (v_name, v_cpf, v_birth_date, u.email, v_phone)
        returning id into v_patient_id;
      exception when unique_violation then
        select p.id into v_patient_id
          from public.patients p
         where lower(p.email) = lower(u.email)
         limit 1;
      end;
    end if;

    if v_patient_id is not null then
      insert into public.profiles(auth_user_id, role, patient_id, email)
      values (u.id, 'patient', v_patient_id, u.email)
      on conflict (auth_user_id) do nothing;
    else
      raise notice 'Conta % ignorada: e-mail/CPF conflita com outro cadastro', u.email;
    end if;
  end loop;
end
$$;
