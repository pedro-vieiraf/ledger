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
      throw new Error(
          'Não foi possível conectar ao servidor. Tente novamente.',
      );
    }

    throw new Error(
        'Não foi possível conectar ao servidor. Tente novamente.',
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
