// ============================================================================
// CrediBot Web BFF — Rota: POST /loans
// Permite ao cliente solicitar um empréstimo.
//
// SEGURANÇA:
//   - customerId vem SEMPRE do JWT (req.jwtPayload.sub).
//   - O body do cliente NUNCA fornece o customerId.
//   - Campos internos da resposta do Loan Service (_links, customerId) são
//     omitidos do payload retornado ao frontend.
// ============================================================================
import { Router, Request, Response } from "express";
import { requireAuth } from "../auth.js";
import { callService } from "../httpClient.js";
import { handleUpstreamError, sendProblem } from "../errors.js";
import { LoanCreatedResponse, LoanRequestedPayload } from "../types.js";

const router = Router();

/** POST /loans */
router.post("/", requireAuth, async (req: Request, res: Response) => {
  const customerId = req.jwtPayload!.sub;

  // Validação dos parâmetros do cliente
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
    // customerId injetado pelo BFF — nunca confiando no body do cliente.
    const upstream = await callService<LoanCreatedResponse>(
      `${loanUrl}/api/v1/loans`,
      {
        method: "POST",
        body: { customerId, amount, installments },
      }
    );

    // ---------------------------------------------------------------------------
    // MASCARAMENTO: customerId, installments, createdAt e _links (HATEOAS
    // internos) são omitidos do payload do cliente web.
    // O cliente recebe apenas o ID do empréstimo, o status e uma mensagem.
    // ---------------------------------------------------------------------------
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
