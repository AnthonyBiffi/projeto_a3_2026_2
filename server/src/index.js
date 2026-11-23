import { env } from './config/env.js';
import { app } from './app.js';

const server = app.listen(env.PORT, () => {
  console.log(`MedClinic API rodando na porta ${env.PORT} (${env.NODE_ENV})`);
});

// Encerramento limpo (deploys e reinícios)
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    console.log(`${signal} recebido, encerrando...`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  });
}
