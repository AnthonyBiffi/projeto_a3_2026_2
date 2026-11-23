import { ZodError } from 'zod';
import { HttpError } from '../utils/httpError.js';

export function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return next(new HttpError(400, 'Dados inválidos', result.error.flatten()));
    }
    req.valid = req.valid ?? {};
    req.valid[source] = result.data;
    return next();
  };
}
