// ============================================================================
// CrediBot Web BFF — Middleware de autenticação
//
// Validação do JWT:
//   - Se JWT_SECRET estiver definido no ambiente: valida a assinatura
//     criptográfica com jsonwebtoken (jwt.verify). Esta é a operação segura.
//   - Se JWT_SECRET não estiver definido: modo de compatibilidade — apenas
//     decodifica o payload base64 sem verificar assinatura. Um aviso é logado
//     a cada inicialização. Use apenas em desenvolvimento/integração.
//
//   O customerId nunca é aceito do body — vem sempre do campo `sub` do token.
// ============================================================================
import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload as JwtLibPayload, JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
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

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.warn(
    "[auth] AVISO: JWT_SECRET não definido. Validação de assinatura desativada. " +
    "Tokens não são verificados criptograficamente. NÃO use em produção."
  );
}

/**
 * Valida o JWT do header Authorization.
 * Com JWT_SECRET definido: verifica assinatura, expiração e estrutura.
 * Sem JWT_SECRET: decodifica apenas (modo compatibilidade, sem segurança criptográfica).
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

  // ── Modo seguro: verificação criptográfica ──────────────────────────────
  if (JWT_SECRET) {
    let payload: JwtLibPayload;
    try {
      payload = jwt.verify(token, JWT_SECRET) as JwtLibPayload;
    } catch (err) {
      if (err instanceof TokenExpiredError) {
        sendProblem(res, 401, "Unauthorized", "Token expirado.", req);
      } else if (err instanceof JsonWebTokenError) {
        sendProblem(res, 401, "Unauthorized", "Token JWT inválido ou assinatura incorreta.", req);
      } else {
        sendProblem(res, 401, "Unauthorized", "Não foi possível validar o token JWT.", req);
      }
      return;
    }

    if (!payload.sub) {
      sendProblem(res, 401, "Unauthorized", "Token não contém identificador de usuário (sub).", req);
      return;
    }

    req.jwtPayload = {
      sub: payload.sub,
    };
    next();
    return;
  }

  // ── Modo compatibilidade: decodificação base64 sem verificação ──────────
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
      sendProblem(res, 401, "Unauthorized", "Token não contém identificador de usuário (sub).", req);
      return;
    }

    req.jwtPayload = payload;
    next();
  } catch {
    sendProblem(res, 401, "Unauthorized", "Não foi possível decodificar o token JWT.", req);
  }
}
