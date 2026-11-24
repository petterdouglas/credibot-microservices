import { Router, Request, Response } from "express";
import { requireAuth } from "../auth.js";
import { callService } from "../httpClient.js";
import { handleUpstreamError, sendProblem } from "../errors.js";
import { LoanCreatedResponse, LoanRequestedPayload } from "../types.js";

const router = Router();

router.post("/", requireAuth, async (req: Request, res: Response) => {
  // customerId vem do JWT — nunca do body do cliente.
  const customerId = req.jwtPayload!.sub;

  const { amount, installments } = req.body as {
    amount?: unknown;
    installments?: unknown;
  };

  if (typeof amount !== "number" || amount <= 0) {
    sendProblem(
      res,
      400,
      "Bad Request",
      "O campo 'amount' é obrigatório e deve ser um número positivo.",
      req
    );
    return;
  }

  if (
    typeof installments !== "number" ||
    !Number.isInteger(installments) ||
    installments < 1
  ) {
    sendProblem(
      res,
      400,
      "Bad Request",
      "O campo 'installments' é obrigatório e deve ser um número inteiro positivo.",
      req
    );
    return;
  }

  const loanUrl = process.env.LOAN_SERVICE_URL!;

  try {
    const upstream = await callService<LoanCreatedResponse>(
      `${loanUrl}/api/v1/loans`,
      {
        method: "POST",
        body: { customerId, amount, installments },
      }
    );

    // customerId, installments, createdAt e _links não são repassados ao cliente.
    const payload: LoanRequestedPayload = {
      loanId: upstream.id,
      status: "PROCESSANDO",
      message: "Solicitação recebida com sucesso!",
    };

    res.status(201).json(payload);
  } catch (err) {
    handleUpstreamError(res, req, err, "loan-service");
  }
});

export default router;
