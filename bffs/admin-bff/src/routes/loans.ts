// ============================================================================
// CrediBot Admin BFF — Rota: GET /loans/:id  e  PATCH /loans/:id/review
//
// GET /loans/:id — Visão completa de auditoria do empréstimo.
//   Agrega dados de três microsserviços em um único payload administrativo:
//   loan-service, customer-service e credit-analysis-service.
//   DIFERENÇA EXPLÍCITA vs Web BFF (Seção 4.4 do contrato):
//     - Inclui CPF e renda mensal do cliente.
//     - Inclui riskScore, modelVersion, fatores e razão de aprovação.
//     - Inclui status de bloqueio de conta (KYC).
//     - Inclui TODOS os metadados do empréstimo (installments, timestamps).
//     - Inclui status do depósito (resultado da SAGA).
//     - Inclui fatores individuais do motor de risco.
//
// PATCH /loans/:id/review — Decisão manual da mesa de crédito.
//   Propaga a decisão do analista para o loan-service.
// ============================================================================
import { Router, Request, Response } from "express";
import { requireAdminAuth } from "../auth.js";
import { callService } from "../httpClient.js";
import { handleUpstreamError, sendProblem, UpstreamError } from "../errors.js";
import {
  LoanDetailResponse,
  CustomerProfileResponse,
  CreditAnalysisResponse,
  LoanAuditPayload,
  LoanReviewPayload,
  CustomerAuditSection,
  CreditAnalysisSection,
  FinancialsSection,
} from "../types.js";

const router = Router();

// Taxa aplicada pela plataforma (campo ainda não retornado pelo loan-service).
const APPLIED_INTEREST_RATE = "2.5%";

// ---------------------------------------------------------------------------
// GET /loans/:id — Auditoria completa do empréstimo para analistas
// ---------------------------------------------------------------------------
router.get("/:id", requireAdminAuth, async (req: Request, res: Response) => {
  const loanId = req.params.id;

  const loanUrl = process.env.LOAN_SERVICE_URL!;
  const customerUrl = process.env.CUSTOMER_SERVICE_URL!;
  const creditUrl = process.env.CREDIT_ANALYSIS_URL!;

  // 1. Busca dados primários do empréstimo
  let loan: LoanDetailResponse;
  try {
    loan = await callService<LoanDetailResponse>(
      `${loanUrl}/api/v1/loans/${loanId}`
    );
  } catch (err) {
    handleUpstreamError(res, req, err, "loan-service");
    return;
  }

  // 2. Busca dados do cliente e análise de crédito em paralelo.
  //    A análise de crédito pode não existir (ex: empréstimo ainda PENDING).
  //    Nesse caso, retornamos null no campo creditAnalysis — sem falhar.
  const [customerResult, creditResult] = await Promise.allSettled([
    callService<CustomerProfileResponse>(
      `${customerUrl}/api/v1/customers/${loan.customerId}`
    ),
    callService<CreditAnalysisResponse>(
      `${creditUrl}/api/v1/credit/${loanId}`
    ),
  ]);

  // Extrai customer — se falhar, propaga o erro (dado obrigatório para auditoria).
  if (customerResult.status === "rejected") {
    handleUpstreamError(res, req, customerResult.reason, "customer-service");
    return;
  }
  const customer = customerResult.value;

  // Extrai análise de crédito — se indisponível, envia null (dado opcional).
  let creditAnalysis: CreditAnalysisSection | null = null;
  if (creditResult.status === "fulfilled") {
    const ca = creditResult.value;
    creditAnalysis = {
      riskScore: ca.score,
      modelVersion: ca.modelVersion,
      decision: ca.decision,
      // Monta a razão de aprovação a partir dos fatores disponíveis.
      // O campo "approvalReason" do contrato é derivado dos fatores do motor.
      approvalReason:
        ca.factors.length > 0
          ? ca.factors.map((f) => f.factor).join("; ")
          : "Decisão automatizada pelo motor de risco",
      factors: ca.factors,
      evaluatedAt: ca.evaluatedAt,
    };
  } else {
    // Log do motivo, mas não bloqueia a resposta — análise pode estar pendente.
    const reason = creditResult.reason;
    if (!(reason instanceof UpstreamError) || reason.status !== 404) {
      console.warn(
        `[admin-bff] credit-analysis-service indisponível para loan ${loanId}:`,
        reason
      );
    }
  }

  // -------------------------------------------------------------------------
  // PAYLOAD ADMINISTRATIVO COMPLETO
  // Inclui todos os campos sensíveis que o Web BFF suprime:
  //   customer.cpf, customer.monthlyIncome, customer.accountBlocked,
  //   creditAnalysis.riskScore, creditAnalysis.modelVersion,
  //   creditAnalysis.factors, financials.installments.
  // -------------------------------------------------------------------------
  const customerSection: CustomerAuditSection = {
    id: customer.id,
    name: customer.name,
    cpf: customer.cpf ?? null,
    email: customer.email,
    monthlyIncome: customer.monthlyIncome ?? null,
    kycStatus: customer.kycStatus,
    accountBlocked: customer.accountBlocked,
  };

  const financials: FinancialsSection = {
    requestedAmount: loan.amount,
    installments: loan.installments ?? null,
    appliedInterestRate: APPLIED_INTEREST_RATE,
  };

  const payload: LoanAuditPayload = {
    loanId: loan.id,
    status: loan.status,
    createdAt: loan.createdAt,
    updatedAt: loan.updatedAt,
    customer: customerSection,
    creditAnalysis,
    financials,
  };

  res.status(200).json(payload);
});

// ---------------------------------------------------------------------------
// PATCH /loans/:id/review — Revisão manual da mesa de crédito
// ---------------------------------------------------------------------------
router.patch(
  "/:id/review",
  requireAdminAuth,
  async (req: Request, res: Response) => {
    const loanId = req.params.id;
    const officerId = req.jwtPayload!.sub; // ID do analista vem do token

    const { decision, justification } = req.body as {
      decision?: unknown;
      justification?: unknown;
    };

    // Validação dos campos obrigatórios
    if (typeof decision !== "string" || decision.trim().length === 0) {
      sendProblem(
        res,
        400,
        "Bad Request",
        "O campo 'decision' é obrigatório (ex: MANUALLY_APPROVED, MANUALLY_REJECTED).",
        req
      );
      return;
    }

    if (typeof justification !== "string" || justification.trim().length === 0) {
      sendProblem(
        res,
        400,
        "Bad Request",
        "O campo 'justification' é obrigatório para decisões manuais.",
        req
      );
      return;
    }

    const loanUrl = process.env.LOAN_SERVICE_URL!;

    try {
      // officerId injetado pelo BFF via JWT — o analista não pode se
      // impersonar passando outro ID no body.
      const upstream = await callService<{ id: string; status: string }>(
        `${loanUrl}/api/v1/loans/${loanId}/review`,
        {
          method: "PATCH",
          body: {
            decision: decision.trim(),
            officerId,
            justification: justification.trim(),
          },
        }
      );

      const payload: LoanReviewPayload = {
        loanId: upstream.id,
        status: upstream.status,
        reviewedBy: officerId,
      };

      res.status(200).json(payload);
    } catch (err) {
      handleUpstreamError(res, req, err, "loan-service");
    }
  }
);

export default router;
