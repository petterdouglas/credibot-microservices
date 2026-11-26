import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { sendProblem } from "../errors.js";

const router = Router();

// POST /auth/login — rota pública, sem requireAdminAuth.
// Valida officerId/password contra variáveis de ambiente e devolve um JWT assinado.
router.post("/login", async (req: Request, res: Response) => {
  const { officerId, password } = req.body as {
    officerId?: unknown;
    password?: unknown;
  };

  if (typeof officerId !== "string" || officerId.trim().length === 0) {
    sendProblem(res, 400, "Bad Request", "O campo 'officerId' é obrigatório.", req);
    return;
  }

  if (typeof password !== "string" || password.length === 0) {
    sendProblem(res, 400, "Bad Request", "O campo 'password' é obrigatório.", req);
    return;
  }

  const secret = process.env.JWT_SECRET;
  const adminUser = process.env.ADMIN_USER;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!secret) {
    sendProblem(
      res,
      503,
      "Service Unavailable",
      "Serviço de autenticação indisponível: JWT_SECRET não configurado.",
      req
    );
    return;
  }

  if (!adminUser || !adminPassword) {
    sendProblem(
      res,
      503,
      "Service Unavailable",
      "Serviço de autenticação indisponível: credenciais administrativas não configuradas.",
      req
    );
    return;
  }

  if (officerId.trim() !== adminUser || password !== adminPassword) {
    sendProblem(res, 401, "Unauthorized", "Credenciais inválidas.", req);
    return;
  }

  const token = jwt.sign(
    { sub: officerId.trim(), role: "admin" },
    secret,
    { expiresIn: "8h" }
  );

  res.status(200).json({
    token,
    officerId: officerId.trim(),
    role: "admin",
  });
});

export default router;
