import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { callService } from "../httpClient.js";
import { sendProblem } from "../errors.js";
import { CustomerProfileResponse } from "../types.js";

const router = Router();

// POST /auth/login — rota pública, sem requireAuth.
// Valida o cliente no customer-service e devolve um JWT assinado.
router.post("/login", async (req: Request, res: Response) => {
  const { customerId } = req.body as { customerId?: unknown };

  if (typeof customerId !== "string" || customerId.trim().length === 0) {
    sendProblem(res, 400, "Bad Request", "O campo 'customerId' é obrigatório.", req);
    return;
  }

  const customerUrl = process.env.CUSTOMER_SERVICE_URL!;
  const secret = process.env.JWT_SECRET;

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

  let customer: CustomerProfileResponse;
  try {
    customer = await callService<CustomerProfileResponse>(
      `${customerUrl}/api/v1/customers/${encodeURIComponent(customerId.trim())}`
    );
  } catch {
    sendProblem(res, 401, "Unauthorized", "Cliente não encontrado ou inválido.", req);
    return;
  }

  const token = jwt.sign(
    { sub: customer.id },
    secret,
    { expiresIn: "8h" }
  );

  res.status(200).json({
    token,
    customer: {
      id: customer.id,
      name: customer.name,
      email: customer.email,
    },
  });
});

export default router;
