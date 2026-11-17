// ============================================================================
// CrediBot Admin BFF — Middleware de autenticação e autorização
//
// NOTA ARQUITETURAL:
//   Não existe auth-service, JWKS endpoint nem role-based access control
//   centralizado no repositório atual. Este middleware:
//     1. Exige que o header Authorization esteja presente e seja Bearer.
//     2. Decodifica o payload JWT (SEM verificar assinatura — limitação
//        conhecida, documentada aqui).
//     3. Verifica que o campo `role` do token contenha "admin" ou "analyst".
//        Este é o único controle de acesso possível sem um auth-service real.
//
//   LIMITAÇÃO CONHECIDA: a validação criptográfica da assinatura e a
//   revogação de tokens dependem de um JWT_SECRET ou JWKS_URI que ainda
//   não existe na arquitetura. Quando disponíveis, substituir a decodificação
//   base64 por uma biblioteca de verificação JWT (ex: jose, jsonwebtoken).
// ============================================================================
import { Request, Response, NextFunction } from "express";
import { sendProblem } from "./errors.js";
import { JwtPayload } from "./types.js";

/** Papéis administrativos aceitos no Admin BFF. */
const ALLOWED_ROLES = new Set(["admin", "analyst"]);

declare global {
  namespace Express {
    interface Request {
      jwtPayload?: JwtPayload;
    }
  }
}

/**
 * Exige token JWT com role administrativa.
 * Rejeita requests sem token, com token mal-formado ou sem role permitida.
 */
export function requireAdminAuth(
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
    sendProblem(res, 401, "Unauthorized", "Token JWT mal-formado.", req);
    return;
  }

  try {
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

    // Verificação de role administrativa.
    // Sem auth-service real, esta é a única barreira de autorização possível.
    const role = (payload.role ?? "").toLowerCase();
    if (!ALLOWED_ROLES.has(role)) {
      sendProblem(
        res,
        403,
        "Forbidden",
        "Acesso negado. Este painel requer perfil administrativo (admin ou analyst).",
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
