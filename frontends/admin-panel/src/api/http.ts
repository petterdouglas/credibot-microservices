// Cliente HTTP unico: injeta JWT, interpreta RFC 7807 (ProblemDetail) e trata 401/429.
const TOKEN_KEY = "credibot_token";
const PROFILE_KEY = "credibot_profile";

export const BASE = "/admin";

export const session = {
  token: () => localStorage.getItem(TOKEN_KEY),
  profile: <T,>(): T | null => {
    try { return JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "null"); } catch { return null; }
  },
  save: (token: string, profile: unknown) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(PROFILE_KEY);
  },
};

export class ApiError extends Error {
  constructor(public status: number, public title: string, message: string) {
    super(message);
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers = new Headers({ "Content-Type": "application/json" });
  const token = session.token();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError(0, "Sem conexão", "Não foi possível falar com o servidor. Tente novamente.");
  }

  if (res.status === 401 && !path.startsWith("/auth/")) {
    session.clear();
    window.dispatchEvent(new Event("credibot:unauthorized"));
  }
  if (!res.ok) {
    let problem: { title?: string; detail?: string } = {};
    try { problem = await res.json(); } catch { /* corpo vazio */ }
    const message =
      res.status === 429 ? "Muitas requisições em pouco tempo. Aguarde um instante." :
      res.status === 503 ? problem.detail ?? "Serviço temporariamente indisponível. Tente novamente em instantes." :
      problem.detail ?? problem.title ?? "Erro inesperado.";
    throw new ApiError(res.status, problem.title ?? "Erro", message);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

export const http = {
  get: <T,>(path: string) => request<T>("GET", path),
  post: <T,>(path: string, body?: unknown) => request<T>("POST", path, body),
  patch: <T,>(path: string, body?: unknown) => request<T>("PATCH", path, body),
};
