import { createUserClient, supabaseAdmin } from '../config/supabase.js';
import { HttpError } from '../utils/httpError.js';

export async function requireAuth(req, _res, next) {
  const authorization = req.headers.authorization;
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;

  if (!token) return next(new HttpError(401, 'Autenticação necessária'));

  const db = createUserClient(token);
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) {
    return next(new HttpError(401, `Token Supabase inválido ou expirado${error?.message ? `: ${error.message}` : ''}`));
  }

  req.user = data.user;
  req.db = db;
  req.token = token;
  return next();
}

export async function requireAdmin(req, _res, next) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('auth_user_id', req.user.id)
    .maybeSingle();

  if (error) return next(error);
  if (!data || data.role !== 'admin') return next(new HttpError(403, 'Acesso restrito'));
  return next();
}
