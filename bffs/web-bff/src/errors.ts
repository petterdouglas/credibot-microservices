import { Request, Response } from "express";
import { ProblemDetail } from "./types.js";

export function sendProblem(
  res: Response,
  status: number,
  title: string,
  detail: string,
  req: Request
): void {
  const body: ProblemDetail = {
    type: `https://credibot.com.br/errors/${slugify(title)}`,
    title,
    status,
    detail,
    instance: req.path,
    timestamp: new Date().toISOString(),
  };
  res.status(status).json(body);
}

export function handleUpstreamError(
  res: Response,
  req: Request,
  err: unknown,
  serviceName: string
): void {
  console.error(`[web-bff] upstream error from ${serviceName}:`, err);

  if (err instanceof UpstreamError) {
    const userDetail =
      err.status >= 500
        ? `${serviceName} está temporariamente indisponível.`
        : err.message;
    sendProblem(res, err.status, httpTitle(err.status), userDetail, req);
    return;
  }

  sendProblem(
    res,
    503,
    "Service Unavailable",
    `Não foi possível conectar a ${serviceName}. Tente novamente em instantes.`,
    req
  );
}

export class UpstreamError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "UpstreamError";
  }
}

function slugify(title: string): string {
  return title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

function httpTitle(status: number): string {
  const map: Record<number, string> = {
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    422: "Unprocessable Entity",
    429: "Too Many Requests",
    500: "Internal Server Error",
    502: "Bad Gateway",
    503: "Service Unavailable",
    504: "Gateway Timeout",
  };
  return map[status] ?? "Error";
}
