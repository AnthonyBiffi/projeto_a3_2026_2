import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import meRoutes from './routes/me.js';
import adminDoctorRoutes from './routes/admin.doctors.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

export const app = express();

// Atrás de proxy/load balancer (Render, Railway, Nginx...), defina TRUST_PROXY=1 para o rate limit ver o IP real.
if (env.TRUST_PROXY) app.set('trust proxy', env.TRUST_PROXY);
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: env.CLIENT_ORIGINS, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] }));
app.use(express.json({ limit: '50kb' }));

app.use(
  '/api',
  rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: true, legacyHeaders: false }),
);
app.use(
  '/api/admin',
  rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: true, legacyHeaders: false }),
);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/me', meRoutes);
app.use('/api/admin/doctors', adminDoctorRoutes);

app.use(notFound);
app.use(errorHandler);
