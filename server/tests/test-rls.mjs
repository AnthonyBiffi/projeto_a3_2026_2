/**
 * Testes ponta a ponta de segurança e agendamento contra o Supabase REAL.
 * Requer: banco migrado, .env preenchido e a API rodando (npm run dev).
 * Cria usuários/médicos temporários ("test.<id>@example.com") e remove tudo no final.
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } = process.env;
const API = process.env.API_URL ?? 'http://localhost:3333';
const { TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD, TEST_INVITE_EMAIL } = process.env;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Preencha SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY no .env');
  process.exit(1);
}

const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, opts);
const run = randomUUID().slice(0, 8);
const password = `Tst!${randomUUID()}`;

let passed = 0;
let failed = 0;
const check = (name, cond, extra = '') => {
  if (cond) {
    passed++;
    console.log(`  ✔ ${name}`);
  } else {
    failed++;
    console.error(`  ✘ ${name} ${extra}`);
  }
};
const section = (t) => console.log(`\n${t}`);

const digits = (n) => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join('');
const dateSP = (offsetDays) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(
    new Date(Date.now() + offsetDays * 86_400_000),
  );
const tomorrow = dateSP(1);
const yesterday = dateSP(-1);

const api = (path, { token, method = 'GET', body } = {}) =>
  fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

const created = { users: [], patients: [], doctors: [] };

async function login(email, pwd) {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, opts);
  const { data, error } = await client.auth.signInWithPassword({ email, password: pwd });
  if (error) throw new Error(`login ${email}: ${error.message}`);
  return { client, token: data.session.access_token, userId: data.user.id };
}

async function makePatient(label) {
  const email = `test.${run}.${label}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: `Paciente ${label}`, cpf: digits(11), birth_date: '1990-01-01', phone: '11999999999' },
  });
  if (error) throw new Error(`createUser ${label}: ${error.message}`);
  created.users.push(data.user.id);
  const { data: prof } = await admin.from('profiles').select('patient_id, role').eq('auth_user_id', data.user.id).single();
  created.patients.push(prof.patient_id);
  const session = await login(email, password);
  return { ...session, email, patientId: prof.patient_id, role: prof.role };
}

async function makeDoctor(label) {
  const email = `test.${run}.${label}@example.com`;
  const { data: doc, error } = await admin
    .from('doctors')
    .insert({
      name: `Dr. ${label}`,
      email,
      specialty: 'Cardiologia',
      phone: '11988887777',
      crm: `${digits(6)}/SP`,
      appointment_type: 'ambas',
    })
    .select()
    .single();
  if (error) throw new Error(`insert doctor ${label}: ${error.message}`);
  created.doctors.push(doc.id);
  const schedules = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
    doctor_id: doc.id,
    weekday,
    start_time: '08:00',
    end_time: '12:00',
    appointment_duration: 30,
    break_interval: 0,
  }));
  const { error: sErr } = await admin.from('doctor_schedules').insert(schedules);
  if (sErr) throw new Error(`insert schedules: ${sErr.message}`);

  const { data: u, error: uErr } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (uErr) throw new Error(`createUser doctor: ${uErr.message}`);
  created.users.push(u.user.id);
  const { data: prof } = await admin.from('profiles').select('role, doctor_id').eq('auth_user_id', u.user.id).single();
  const session = await login(email, password);
  return { ...session, email, doctorId: doc.id, role: prof.role, profileDoctorId: prof.doctor_id };
}

const book = (who, doctorId, date, start, type = 'online') =>
  who.client.rpc('book_appointment', {
    p_doctor_id: doctorId,
    p_date: date,
    p_start: start,
    p_type: type,
    p_symptoms: 'Dor de cabeça frequente (teste automatizado)',
  });

const validDoctorBody = (email) => ({
  name: 'Dr. Teste Convite',
  email,
  specialty: 'Dermatologia',
  phone: '11977776666',
  crm: `${digits(6)}/SP`,
  appointment_type: 'ambas',
  schedules: [{ weekday: 1, start_time: '08:00', end_time: '12:00', appointment_duration: 30 }],
});

async function main() {
  section('Preparando usuários temporários');
  const pA = await makePatient('A');
  const pB = await makePatient('B');
  const pC = await makePatient('C');
  const d1 = await makeDoctor('Medico1');
  const d2 = await makeDoctor('Medico2');
  check('perfis criados com os papéis corretos',
    pA.role === 'patient' && d1.role === 'doctor' && d1.profileDoctorId === d1.doctorId);

  // ------------------------------------------------------------------
  section('1. Controle de acesso da API (cadastro de médicos só pelo admin)');
  const body = validDoctorBody(`test.${run}.novo@example.com`);
  let r = await api('/api/admin/doctors', { method: 'POST', body });
  check('sem token -> 401', r.status === 401);
  r = await api('/api/admin/doctors', { method: 'POST', body, token: pA.token });
  check('paciente tenta cadastrar médico -> 403', r.status === 403);
  r = await api('/api/admin/doctors', { method: 'POST', body, token: d1.token });
  check('médico tenta cadastrar médico -> 403', r.status === 403);
  r = await api('/api/admin/doctors', { token: pA.token });
  check('paciente listando médicos (admin) -> 403', r.status === 403);
  r = await api(`/api/admin/doctors/${d2.doctorId}`, { method: 'PATCH', body: { name: 'Hack' }, token: d1.token });
  check('médico editando outro médico via API -> 403', r.status === 403);
  r = await api(`/api/admin/doctors/${d2.doctorId}/status`, { method: 'PATCH', body: { active: false }, token: pA.token });
  check('paciente desativando médico via API -> 403', r.status === 403);
  r = await api('/api/me', { token: pA.token });
  const me = await r.json();
  check('/api/me do paciente retorna só ele mesmo', r.status === 200 && me.user.role === 'patient' && me.patient.id === pA.patientId);

  // ------------------------------------------------------------------
  section('2. Isolamento no banco (RLS) usando o JWT de cada usuário');
  let q = await pA.client.from('patients').select('id');
  check('paciente A enxerga apenas a si mesmo', !q.error && q.data.length === 1 && q.data[0].id === pA.patientId);
  q = await pA.client.from('patients').select('id').eq('id', pB.patientId);
  check('paciente A não lê paciente B', !q.error && q.data.length === 0);
  q = await pA.client.from('doctors').select('id');
  check('paciente não lê a tabela doctors (CRM/e-mail protegidos)', !q.error && q.data.length === 0);
  q = await pA.client.from('doctors_public').select('id');
  check('paciente vê médicos ativos pela view pública',
    !q.error && q.data.some((d) => d.id === d1.doctorId) && q.data.some((d) => d.id === d2.doctorId));
  q = await pA.client.from('doctors').insert({ name: 'Falso', email: `x.${run}@example.com`, specialty: 'X', crm: '111111/SP' });
  check('paciente não consegue inserir médico', !!q.error);
  q = await pA.client.from('doctors').update({ active: false }).eq('id', d1.doctorId).select();
  const { data: d1row } = await admin.from('doctors').select('active').eq('id', d1.doctorId).single();
  check('paciente não consegue desativar médico', d1row.active === true && (q.error || q.data.length === 0));
  q = await pA.client.from('patients').update({ name: 'Invadido' }).eq('id', pB.patientId).select();
  check('paciente A não altera paciente B', q.error || q.data.length === 0);
  q = await pA.client.from('profiles').update({ role: 'admin' }).eq('auth_user_id', pA.userId).select();
  check('paciente não consegue virar admin', q.error || q.data.length === 0);
  q = await pA.client.from('appointments').insert({
    patient_id: pA.patientId, doctor_id: d1.doctorId, appointment_date: tomorrow,
    start_time: '08:00', end_time: '08:30', appointment_type: 'online', symptoms: 'burlando regras',
  });
  check('INSERT direto em appointments é bloqueado', !!q.error);
  q = await admin.from('profiles').update({ role: 'admin', patient_id: null }).eq('auth_user_id', pA.userId);
  check('banco recusa admin com e-mail não autorizado (CHECK)', !!q.error);

  // ------------------------------------------------------------------
  section('3. Agendamento e regras de disponibilidade');
  let s = await pA.client.rpc('get_available_slots', { p_doctor_id: d1.doctorId, p_date: tomorrow });
  const starts = (s.data ?? []).map((x) => x.start_time.slice(0, 5));
  check('gera 8 horários de 30 min (08:00–11:30)', starts.length === 8 && starts[0] === '08:00' && starts[7] === '11:30');

  let b = await book(pA, d1.doctorId, tomorrow, '08:00');
  check('paciente A agenda 08:00 com Médico1', !b.error && !!b.data, b.error?.message);
  const apptA = b.data;
  b = await book(pC, d1.doctorId, tomorrow, '08:00');
  check('paciente C não reserva horário ocupado', !!b.error);
  s = await pC.client.rpc('get_available_slots', { p_doctor_id: d1.doctorId, p_date: tomorrow });
  check('08:00 some da lista de disponíveis', !(s.data ?? []).some((x) => x.start_time.startsWith('08:00')));

  const race = await Promise.all([
    book(pA, d1.doctorId, tomorrow, '09:00'),
    book(pC, d1.doctorId, tomorrow, '09:00'),
  ]);
  check('reservas simultâneas do mesmo horário: exatamente 1 vence', race.filter((x) => !x.error).length === 1);

  b = await book(pA, d1.doctorId, yesterday, '08:00');
  check('data passada é rejeitada', !!b.error);
  b = await book(pA, d1.doctorId, tomorrow, '07:00');
  check('horário fora da agenda é rejeitado', !!b.error);
  b = await book(pA, d1.doctorId, tomorrow, '08:15');
  check('horário desalinhado com a duração é rejeitado', !!b.error);

  b = await book(pB, d2.doctorId, tomorrow, '08:00', 'presencial');
  check('paciente B agenda com Médico2', !b.error, b.error?.message);
  const apptB = b.data;

  // ------------------------------------------------------------------
  section('4. Isolamento de consultas e pacientes entre usuários');
  q = await pA.client.from('appointments').select('id, patient_id');
  check('paciente A só vê as próprias consultas', !q.error && q.data.length >= 1 && q.data.every((x) => x.patient_id === pA.patientId));
  q = await pB.client.from('appointments').select('id');
  check('paciente B não vê consulta do A', !q.error && !q.data.some((x) => x.id === apptA));
  q = await d1.client.from('appointments').select('id, doctor_id');
  check('Médico1 só vê consultas dele', !q.error && q.data.length >= 1 && q.data.every((x) => x.doctor_id === d1.doctorId));
  check('Médico1 não vê consulta do Médico2', !q.data.some((x) => x.id === apptB));
  q = await d2.client.from('appointments').select('id');
  check('Médico2 não vê consulta do Médico1', !q.error && !q.data.some((x) => x.id === apptA));
  q = await d1.client.from('patients').select('id');
  const seen = (q.data ?? []).map((p) => p.id);
  check('Médico1 só vê pacientes que atende (A/C) e não o B',
    !q.error && seen.includes(pA.patientId) && !seen.includes(pB.patientId));
  q = await d1.client.from('doctors').select('id');
  check('Médico1 enxerga apenas o próprio cadastro', !q.error && q.data.length === 1 && q.data[0].id === d1.doctorId);
  q = await d1.client.from('doctors').update({ name: 'Invadido' }).eq('id', d2.doctorId).select();
  check('Médico1 não edita Médico2', q.error || q.data.length === 0);
  q = await d1.client.from('appointments').insert({
    patient_id: pA.patientId, doctor_id: d1.doctorId, appointment_date: tomorrow,
    start_time: '10:00', end_time: '10:30', appointment_type: 'online', symptoms: 'burlando regras',
  });
  check('médico não insere consulta diretamente', !!q.error);

  // ------------------------------------------------------------------
  section('5. Cancelamento, conclusão e histórico');
  let st = await pC.client.rpc('set_appointment_status', { p_id: apptA, p_status: 'cancelada' });
  check('paciente C não cancela consulta do A', !!st.error);
  st = await d2.client.rpc('set_appointment_status', { p_id: apptA, p_status: 'realizada' });
  check('Médico2 não altera consulta do Médico1', !!st.error);
  st = await pA.client.rpc('set_appointment_status', { p_id: apptA, p_status: 'realizada' });
  check('paciente não marca como realizada', !!st.error);
  st = await pA.client.rpc('set_appointment_status', { p_id: apptA, p_status: 'cancelada' });
  check('paciente A cancela a própria consulta', !st.error, st.error?.message);
  s = await pC.client.rpc('get_available_slots', { p_doctor_id: d1.doctorId, p_date: tomorrow });
  check('cancelamento libera o horário', (s.data ?? []).some((x) => x.start_time.startsWith('08:00')));
  const { data: hist } = await pA.client.from('appointments').select('status').eq('id', apptA).single();
  check('consulta cancelada permanece no histórico', hist?.status === 'cancelada');

  b = await book(pC, d1.doctorId, tomorrow, '08:00');
  check('outro paciente reserva o horário liberado', !b.error, b.error?.message);
  st = await d1.client.rpc('set_appointment_status', { p_id: b.data, p_status: 'realizada' });
  check('Médico1 marca consulta como realizada', !st.error, st.error?.message);
  st = await pC.client.rpc('set_appointment_status', { p_id: b.data, p_status: 'cancelada' });
  check('consulta realizada não pode ser cancelada', !!st.error);

  // ------------------------------------------------------------------
  section('6. Administrador autorizado (opcional: TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD)');
  if (!TEST_ADMIN_EMAIL || !TEST_ADMIN_PASSWORD) {
    console.log('  (pulado: defina TEST_ADMIN_EMAIL e TEST_ADMIN_PASSWORD no .env)');
  } else {
    const adm = await login(TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD);
    r = await api('/api/admin/doctors', { token: adm.token });
    const list = await r.json();
    check('admin lista médicos', r.status === 200 && Array.isArray(list.doctors) && list.doctors.some((d) => d.id === d1.doctorId));

    r = await api('/api/admin/doctors', { method: 'POST', token: adm.token, body: { name: 'x' } });
    check('admin com dados inválidos -> 400', r.status === 400);
    r = await api('/api/admin/doctors', { method: 'POST', token: adm.token, body: { ...validDoctorBody(TEST_ADMIN_EMAIL) } });
    check('e-mail do admin não pode virar médico -> 400', r.status === 400);
    r = await api('/api/admin/doctors', {
      method: 'POST', token: adm.token,
      body: { ...validDoctorBody(`x.${run}@example.com`), schedules: [{ weekday: 1, start_time: '12:00', end_time: '08:00', appointment_duration: 30 }] },
    });
    check('agenda com término antes do início -> 400', r.status === 400);
    r = await api('/api/admin/doctors', { method: 'POST', token: adm.token, body: { ...validDoctorBody(`x.${run}@example.com`), role: 'admin' } });
    check('campos extras são rejeitados (strict) -> 400', r.status === 400);

    r = await api(`/api/admin/doctors/${d1.doctorId}`, { method: 'PATCH', token: adm.token, body: { specialty: 'Clínica Geral' } });
    check('admin edita médico', r.status === 200);
    r = await api(`/api/admin/doctors/${d1.doctorId}/status`, { method: 'PATCH', token: adm.token, body: { active: false } });
    check('admin desativa médico', r.status === 200);
    q = await pA.client.from('doctors_public').select('id').eq('id', d1.doctorId);
    check('médico inativo some da lista de pacientes', !q.error && q.data.length === 0);
    b = await book(pA, d1.doctorId, tomorrow, '10:00');
    check('médico inativo não recebe novos agendamentos', !!b.error);
    r = await api(`/api/admin/doctors/${d1.doctorId}/status`, { method: 'PATCH', token: adm.token, body: { active: true } });
    check('admin reativa médico', r.status === 200);
    r = await api(`/api/admin/doctors/${d1.doctorId}/schedules`, {
      method: 'PUT', token: adm.token,
      body: { schedules: [{ weekday: 1, start_time: '09:00', end_time: '11:00', appointment_duration: 20, break_interval: 10 }] },
    });
    const sch = await r.json();
    check('admin substitui agenda semanal', r.status === 200 && sch.schedules?.length === 1);
    q = await adm.client.from('patients').select('id');
    check('admin NÃO acessa dados de pacientes (minimização LGPD)', !q.error && q.data.length === 0);
    q = await adm.client.from('appointments').select('id');
    check('admin NÃO acessa consultas', !q.error && q.data.length === 0);

    if (TEST_INVITE_EMAIL) {
      r = await api('/api/admin/doctors', { method: 'POST', token: adm.token, body: validDoctorBody(TEST_INVITE_EMAIL) });
      const out = await r.json();
      check('admin cadastra médico e envia convite', r.status === 201 && out.invite === 'sent', JSON.stringify(out));
      if (out.doctor?.id) {
        created.doctors.push(out.doctor.id);
        const { data: invited } = await admin.auth.admin.listUsers({ perPage: 200 });
        const u = invited?.users?.find((x) => x.email?.toLowerCase() === TEST_INVITE_EMAIL.toLowerCase());
        if (u) created.users.push(u.id);
      }
    } else {
      console.log('  (convite real pulado: defina TEST_INVITE_EMAIL com um e-mail seu)');
    }
  }
}

async function cleanup() {
  section('Limpando dados de teste');
  if (created.doctors.length) await admin.from('appointments').delete().in('doctor_id', created.doctors);
  for (const id of created.users) await admin.auth.admin.deleteUser(id);
  if (created.patients.length) await admin.from('patients').delete().in('id', created.patients);
  if (created.doctors.length) await admin.from('doctors').delete().in('id', created.doctors);
}

try {
  await main();
} catch (err) {
  failed++;
  console.error('\nErro inesperado:', err.message);
} finally {
  await cleanup().catch((e) => console.error('Falha na limpeza:', e.message));
  console.log(`\nResultado: ${passed} passaram, ${failed} falharam`);
  process.exit(failed ? 1 : 0);
}
