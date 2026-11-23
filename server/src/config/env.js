import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(3333),
  // Uma ou mais origens do front-end, separadas por vírgula (a primeira é usada nos links de e-mail)
  CLIENT_URL: z
    .string()
    .min(1)
    .refine((v) => v.split(',').every((u) => /^https?:\/\/[^\s,]+$/.test(u.trim())), 'URLs inválidas'),
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  ADMIN_EMAIL: z
    .string()
    .email()
    .default('anthonymendesbiffi@gmail.com')
    .transform((v) => v.trim().toLowerCase()),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('Variáveis de ambiente inválidas ou ausentes:');
  for (const issue of parsed.error.issues) {
    console.error(` - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

const origins = parsed.data.CLIENT_URL.split(',').map((u) => u.trim().replace(/\/$/, ''));

export const env = { ...parsed.data, CLIENT_URL: origins[0], CLIENT_ORIGINS: origins };
