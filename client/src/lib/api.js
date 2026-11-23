const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3333').replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function request(path, { accessToken, method = 'GET', body } = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch (error) {
    throw new ApiError(
      `Não foi possível conectar à API (${API_URL}). Confira se o servidor está rodando e tente novamente. ${error.message}`,
      0,
      'API_UNAVAILABLE',
    );
  }

  let responseBody;
  try {
    responseBody = await response.json();
  } catch {
    throw new ApiError(
      `A API respondeu com um formato inválido (HTTP ${response.status}).`,
      response.status,
      'INVALID_API_RESPONSE',
    );
  }

  if (!response.ok) {
    throw new ApiError(
      responseBody.error || responseBody.message || `A API respondeu com HTTP ${response.status}.`,
      response.status,
      responseBody.code,
    );
  }

  return responseBody;
}

export function getMe(accessToken) {
  return request('/api/me', { accessToken });
}

export function createDoctor(accessToken, doctor) {
  return request('/api/admin/doctors', {
    accessToken,
    method: 'POST',
    body: doctor,
  });
}
