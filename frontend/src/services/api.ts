const API_URL = process.env.EXPO_PUBLIC_API_URL;
const REQUEST_TIMEOUT_MS = 10_000;

if (!API_URL) {
  throw new Error(
      'EXPO_PUBLIC_API_URL não está configurada. Verifique o arquivo .env.',
  );
}

export class ApiError extends Error {
  constructor(
      message: string,
      public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Erro para falhas em que não dá para saber se o servidor processou a
 * requisição (timeout ou queda de conexão). Repetir só é seguro quando a
 * operação é idempotente.
 */
export class AmbiguousRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AmbiguousRequestError';
  }
}

export async function apiRequest<T>(
    path: string,
    options: RequestInit = {},
): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;

  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...options.headers,
      },
    });
  } catch {
    if (timedOut) {
      throw new AmbiguousRequestError(
          'A solicitação demorou demais e não foi possível confirmar ' +
          'se ela foi concluída.',
      );
    }

    throw new AmbiguousRequestError(
        'Não foi possível conectar ao servidor. Verifique sua conexão ' +
        'e tente novamente.',
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new ApiError(
        `A API retornou HTTP ${response.status} (${response.statusText}).`,
        response.status,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
