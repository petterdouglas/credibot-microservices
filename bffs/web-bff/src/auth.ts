// ============================================================================
// CrediBot Web BFF — Middleware de autenticação
//
// NOTA ARQUITETURAL:
//   O API Gateway (Nginx) propaga o header Authorization para o BFF, mas NÃO
//   valida o token (não há auth-service nem JWKS endpoint no repositório atual).
//   Este middleware extrai o payload do JWT por decodificação BASE64 do claim
//   (sem verificação de assinatura) para obter o customerId do usuário logado.
//
//   LIMITAÇÃO CONHECIDA: a validação criptográfica do token deve ser adicionada
//   quando um JWT_SECRET ou JWKS_URI estiver disponível na arquitetura.
//   Até lá, este mecanismo garante que:
//     1. O header Authorization está presente e é do tipo Bearer.
//     2. O token possui estrutura JWT válida (3 segmentos base64url).
//     3. O customerId não é aceito do body — vem sempre do token.
// ============================================================================
import { Request, Response, NextFunction } from "express";
import { sendProblem } from "./errors.js";
import { JwtPayload } from "./types.js";

/** Estende Request para carregar o payload do JWT. */
declare global {
  namespace Express {
    interface Request {
      jwtPayload?: JwtPayload;
    }
  }
}

/**
 * Extrai e decodifica (sem verificação de assinatura) o JWT do header
 * Authorization e popula req.jwtPayload com o customerId (sub).
 * Rejeita requests sem token ou com token mal-formado.
 */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization ?? "";

  if (!authHeader.startsWith("Bearer ")) {
    sendProblem(
      res,
      401,
      "Unauthorized",
      "Header Authorization ausente ou não é do tipo Bearer.",
      req
    );
    return;
  }

  const token = authHeader.slice(7);
  const parts = token.split(".");

  if (parts.length !== 3) {
    sendProblem(
      res,
      401,
      "Unauthorized",
      "Token JWT mal-formado.",
      req
    );
    return;
  }

  try {
    // Decodifica apenas o payload (segmento do meio) — SEM verificar assinatura.
    const payloadJson = Buffer.from(
      parts[1].replace(/-/g, "+").replace(/_/g, "/"),
      "base64"
    ).toString("utf8");
    const payload = JSON.parse(payloadJson) as JwtPayload;

    if (!payload.sub) {
      sendProblem(
        res,
        401,
        "Unauthorized",
        "Token não contém identificador de usuário (sub).",
        req
      );
      return;
    }

    req.jwtPayload = payload;
    next();
  } catch {
    sendProblem(
      res,
      401,
      "Unauthorized",
      "Não foi possível decodificar o token JWT.",
      req
    );
  }
}
