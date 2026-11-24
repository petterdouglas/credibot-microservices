import { UpstreamError } from "./errors.js";

export interface FetchOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

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
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
