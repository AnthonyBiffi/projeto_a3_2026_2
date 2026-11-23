import { HttpError } from '../utils/httpError.js';

export function notFound(_req, res) {
  res.status(404).json({ error: 'Rota não encontrada' });
}

export function errorHandler(error, _req, res, _next) {
  if (error instanceof HttpError) {
    return res.status(error.status).json({
      error: error.message,
      ...(error.details ? { details: error.details } : {}),
    });
  }

  console.error(error);
  return res.status(500).json({ error: 'Erro interno do servidor' });
}
