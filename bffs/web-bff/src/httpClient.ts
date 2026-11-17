// ============================================================================
// CrediBot Web BFF — Cliente HTTP para microsserviços
// Usa apenas Node.js built-in fetch (disponível desde Node 18).
// ============================================================================
import { UpstreamError } from "./errors.js";

export interface FetchOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

/**
 * Realiza uma chamada HTTP para um microsserviço interno.
 * - Lança UpstreamError para respostas não-2xx.
 * - Lança Error padrão para falhas de rede/timeout.
 */
export async function callService<T>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const { method = "GET", body, headers = {}, timeoutMs = 10_000 } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const requestHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...headers,
    };

    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    // Tenta parsear o corpo mesmo em erro, para extrair detail do Problem Details
    let responseBody: unknown;
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      responseBody = await response.json();
    } else {
      responseBody = await response.text();
    }

    if (!response.ok) {
      const detail =
        typeof responseBody === "object" &&
        responseBody !== null &&
        "detail" in responseBody
          ? String((responseBody as Record<string, unknown>).detail)
          : `HTTP ${response.status} from upstream`;
      throw new UpstreamError(response.status, detail);
    }

    return responseBody as T;
  } catch (err) {
    if (err instanceof UpstreamError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new UpstreamError(504, "Upstream timeout");
    }
    throw err; // Erro de rede: será tratado como 503
  } finally {
    clearTimeout(timer);
  }
}
