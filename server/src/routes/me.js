import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const { data: profile, error } = await req.db
      .from('profiles')
      .select('role, patient_id, doctor_id')
      .eq('auth_user_id', req.user.id)
      .single();
    if (error) throw error;

    let patient = null;
    if (profile.patient_id) {
      const result = await req.db
        .from('patients')
        .select('*')
        .eq('id', profile.patient_id)
        .single();
      if (result.error) throw result.error;
      patient = result.data;
    }

    let doctor = null;
    if (profile.doctor_id) {
      const result = await req.db
        .from('doctors')
        .select('*')
        .eq('id', profile.doctor_id)
        .single();
      if (result.error) throw result.error;
      doctor = result.data;
    }

    res.json({
      user: { id: req.user.id, email: req.user.email, role: profile.role },
      patient,
      doctor,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
