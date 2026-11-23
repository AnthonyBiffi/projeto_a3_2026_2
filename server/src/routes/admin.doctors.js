import { Router } from 'express';
import { env } from '../config/env.js';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { HttpError } from '../utils/httpError.js';
import {
  createDoctorSchema,
  updateDoctorSchema,
  statusSchema,
  replaceSchedulesSchema,
  idParamSchema,
} from '../schemas/doctor.schema.js';

const router = Router();

// Camada 1 (API): só o administrador autorizado passa daqui.
// Camada 2 (banco): as queries usam req.db (JWT do admin), então as policies
// RLS com is_admin() também precisam aprovar cada operação.
router.use(requireAuth, requireAdmin);

const WITH_SCHEDULES = '*, doctor_schedules(*)';

async function sendInvite(email, name) {
  const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${env.CLIENT_URL}/definir-senha`,
    data: { name },
  });
  if (!error) return;

  if (error.code === 'email_exists' || error.status === 422) {
    throw new HttpError(409, 'Já existe uma conta com este e-mail');
  }
  throw new HttpError(502, 'Não foi possível enviar o convite. Verifique o SMTP do Supabase.');
}

// GET /api/admin/doctors
router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await req.db
      .from('doctors')
      .select(WITH_SCHEDULES)
      .order('name', { ascending: true });
    if (error) throw error;
    res.json({ doctors: data });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/doctors/:id
router.get('/:id', validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    const { data, error } = await req.db
      .from('doctors')
      .select(WITH_SCHEDULES)
      .eq('id', req.valid.params.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new HttpError(404, 'Médico não encontrado');
    res.json({ doctor: data });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/doctors  -> cadastra médico + agenda e envia convite por e-mail
router.post('/', validate(createDoctorSchema), async (req, res, next) => {
  let createdId = null;
  try {
    const { schedules, ...doctorData } = req.valid.body;

    if (doctorData.email === env.ADMIN_EMAIL) {
      throw new HttpError(400, 'O e-mail do administrador não pode ser usado para um médico');
    }

    // A linha do médico precisa existir ANTES do convite: o trigger
    // handle_new_user vincula a conta ao médico pelo e-mail.
    const { data: doctor, error } = await req.db
      .from('doctors')
      .insert(doctorData)
      .select()
      .single();
    if (error) throw error;
    createdId = doctor.id;

    const rows = schedules.map((s) => ({ ...s, doctor_id: doctor.id }));
    const { error: schedError } = await req.db.from('doctor_schedules').insert(rows);
    if (schedError) throw schedError;

    await sendInvite(doctor.email, doctor.name);

    const { data: full } = await req.db
      .from('doctors')
      .select(WITH_SCHEDULES)
      .eq('id', doctor.id)
      .single();

    res.status(201).json({ doctor: full, invite: 'sent' });
  } catch (err) {
    // Desfaz o cadastro parcial (médico novo ainda não tem consultas).
    if (createdId) await supabaseAdmin.from('doctors').delete().eq('id', createdId);
    next(err);
  }
});

// PATCH /api/admin/doctors/:id  -> edita dados cadastrais
router.patch(
  '/:id',
  validate(idParamSchema, 'params'),
  validate(updateDoctorSchema),
  async (req, res, next) => {
    try {
      const { data, error } = await req.db
        .from('doctors')
        .update(req.valid.body)
        .eq('id', req.valid.params.id)
        .select(WITH_SCHEDULES)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new HttpError(404, 'Médico não encontrado');
      res.json({ doctor: data });
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /api/admin/doctors/:id/status  -> ativa/desativa (histórico é preservado)
router.patch(
  '/:id/status',
  validate(idParamSchema, 'params'),
  validate(statusSchema),
  async (req, res, next) => {
    try {
      const { data, error } = await req.db
        .from('doctors')
        .update({ active: req.valid.body.active })
        .eq('id', req.valid.params.id)
        .select('id, name, active')
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new HttpError(404, 'Médico não encontrado');
      res.json({ doctor: data });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/admin/doctors/:id/schedules  -> substitui a agenda semanal
router.put(
  '/:id/schedules',
  validate(idParamSchema, 'params'),
  validate(replaceSchedulesSchema),
  async (req, res, next) => {
    try {
      const { id } = req.valid.params;
      const { schedules } = req.valid.body;

      const { data: exists, error: findError } = await req.db
        .from('doctors')
        .select('id')
        .eq('id', id)
        .maybeSingle();
      if (findError) throw findError;
      if (!exists) throw new HttpError(404, 'Médico não encontrado');

      const rows = schedules.map((s) => ({ ...s, doctor_id: id }));
      const { error: upsertError } = await req.db
        .from('doctor_schedules')
        .upsert(rows, { onConflict: 'doctor_id,weekday' });
      if (upsertError) throw upsertError;

      const keep = schedules.map((s) => s.weekday).join(',');
      const { error: delError } = await req.db
        .from('doctor_schedules')
        .delete()
        .eq('doctor_id', id)
        .not('weekday', 'in', `(${keep})`);
      if (delError) throw delError;

      const { data, error } = await req.db
        .from('doctor_schedules')
        .select('*')
        .eq('doctor_id', id)
        .order('weekday');
      if (error) throw error;
      res.json({ schedules: data });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/admin/doctors/:id/resend-invite
router.post('/:id/resend-invite', validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    const { data: doctor, error } = await req.db
      .from('doctors')
      .select('id, name, email, active')
      .eq('id', req.valid.params.id)
      .maybeSingle();
    if (error) throw error;
    if (!doctor) throw new HttpError(404, 'Médico não encontrado');
    if (!doctor.active) throw new HttpError(409, 'Médico desativado');

    try {
      await sendInvite(doctor.email, doctor.name);
    } catch (e) {
      if (e instanceof HttpError && e.status === 409) {
        throw new HttpError(
          409,
          'O médico já ativou a conta. Peça para usar "Esqueci minha senha".',
        );
      }
      throw e;
    }
    res.json({ invite: 'sent' });
  } catch (err) {
    next(err);
  }
});

export default router;
