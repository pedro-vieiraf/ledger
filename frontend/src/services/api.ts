const API_URL = process.env.EXPO_PUBLIC_API_URL;

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
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...options.headers,
      },
    });
  } catch {
    throw new Error(
        `Não foi possível conectar à API em ${API_URL}. Verifique se o backend está em execução e se o endereço está correto.`,
    );
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
