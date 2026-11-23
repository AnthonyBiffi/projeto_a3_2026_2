import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../utils/httpError.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const { data: profile, error } = await req.db
      .from('profiles')
      .select('role, patient_id, doctor_id')
      .eq('auth_user_id', req.user.id)
      .maybeSingle();
    if (error) {
      if (error.code === 'PGRST205' || error.code === '42P01') {
        throw new HttpError(
          503,
          'A tabela public.profiles não está disponível no Supabase. Execute as migrações 001 a 004 no projeto configurado.',
          undefined,
          'DATABASE_SCHEMA_NOT_READY',
        );
      }
      throw new HttpError(502, `Não foi possível consultar o perfil no Supabase: ${error.message}`);
    }
    if (!profile) {
      return res.status(409).json({
        code: 'PROFILE_INCOMPLETE',
        error: 'Sua conta foi autenticada, mas ainda não possui perfil no sistema. Execute a migração 004 para sincronizar contas já existentes.',
      });
    }

    let patient = null;
    if (profile.patient_id) {
      const result = await req.db
        .from('patients')
        .select('id, name, email, phone, birth_date')
        .eq('id', profile.patient_id)
        .maybeSingle();
      if (result.error) {
        throw new HttpError(502, `Não foi possível consultar os dados do paciente: ${result.error.message}`);
      }
      patient = result.data;
    }

    let doctor = null;
    if (profile.doctor_id) {
      const result = await req.db
        .from('doctors')
        .select('id, name, email, specialty, phone, crm, appointment_type, active')
        .eq('id', profile.doctor_id)
        .maybeSingle();
      if (result.error) {
        throw new HttpError(502, `Não foi possível consultar os dados do médico: ${result.error.message}`);
      }
      doctor = result.data;
    }

    if ((profile.role === 'patient' && !patient) || (profile.role === 'doctor' && !doctor)) {
      return res.status(409).json({
        code: 'PROFILE_INCOMPLETE',
        error: 'Seu perfil está incompleto ou sem vínculo com seus dados. Execute a migração 004 ou solicite suporte.',
      });
    }

    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        role: profile.role,
        patient_id: profile.patient_id,
        doctor_id: profile.doctor_id,
      },
      patient,
      doctor,
    });
  } catch (error) {
    if (!(error instanceof HttpError)) {
      console.error('GET /api/me falhou:', error);
    }
    next(error);
  }
});

export default router;
