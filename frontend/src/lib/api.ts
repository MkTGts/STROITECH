const API_URL = normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000");

type FetchOptions = RequestInit & {
  params?: Record<string, string | number | undefined>;
};

/**
 * Make an authenticated API request to the backend.
 * Automatically attaches the JWT token and handles JSON responses.
 */
export async function api<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { params, headers: customHeaders, ...rest } = options;

  let url = `${API_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) searchParams.set(key, String(value));
    }
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  const token = _getAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((customHeaders as Record<string, string>) || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(url, { ...rest, headers });

  if (response.status === 401 && token) {
    const refreshed = await _tryRefreshToken();
    if (refreshed) {
      headers["Authorization"] = `Bearer ${refreshed}`;
      const retryResponse = await fetch(url, { ...rest, headers });
      return retryResponse.json();
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Ошибка сервера" }));
    throw new ApiError(response.status, error.message || "Ошибка запроса", error.errors);
  }

  return response.json();
}

/**
 * Upload a file to the backend.
 */
export async function uploadFile(file: File): Promise<{ url: string; filename: string }> {
  const token = _getAccessToken();
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_URL}/upload/image`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!response.ok) throw new Error("Ошибка загрузки файла");
  const data = await response.json();
  return data.data;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function _getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
}

function normalizeApiBaseUrl(input: string): string {
  const trimmed = input.replace(/\/+$/, "");
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
}

async function _tryRefreshToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) return null;

  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      return null;
    }

    const data = await response.json();
    const newToken = data.data.tokens.accessToken;
    localStorage.setItem("accessToken", newToken);
    localStorage.setItem("refreshToken", data.data.tokens.refreshToken);
    return newToken;
  } catch {
    return null;
  }
}
