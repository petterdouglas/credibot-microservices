export class UpstreamError extends Error {
  constructor(service: string, readonly status: number) {
    super(service + " respondeu HTTP " + status);
  }
}

export async function jsonRequest<T>(url: string, service: string, body?: object, timeout = 3500,
                                     headers: Record<string, string> = {}): Promise<T> {
  const response = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: { ...(body ? { "content-type": "application/json" } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(timeout),
  });
  if (!response.ok) throw new UpstreamError(service, response.status);
  return await response.json() as T;
}
