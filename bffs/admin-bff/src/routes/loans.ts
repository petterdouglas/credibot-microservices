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

// GET /loans/:id — Visão de auditoria completa do empréstimo para analistas.
// Agrega loan-service, customer-service e credit-analysis-service.
router.get("/:id", requireAdminAuth, async (req: Request, res: Response) => {
  const loanId = req.params.id;

  const loanUrl = process.env.LOAN_SERVICE_URL!;
  const customerUrl = process.env.CUSTOMER_SERVICE_URL!;
  const creditUrl = process.env.CREDIT_ANALYSIS_URL!;

  let loan: LoanDetailResponse;
  try {
    loan = await callService<LoanDetailResponse>(
      `${loanUrl}/api/v1/loans/${loanId}`
    );
  } catch (err) {
    handleUpstreamError(res, req, err, "loan-service");
    return;
  }

  // Busca customer e análise de crédito em paralelo.
  // A análise pode não existir (empréstimo ainda PENDING) — retorna null, não falha.
  const [customerResult, creditResult] = await Promise.allSettled([
    callService<CustomerProfileResponse>(
      `${customerUrl}/api/v1/customers/${loan.customerId}`
    ),
    callService<CreditAnalysisResponse>(
      `${creditUrl}/api/v1/credit/${loanId}`
    ),
  ]);

  if (customerResult.status === "rejected") {
    handleUpstreamError(res, req, customerResult.reason, "customer-service");
    return;
  }
  const customer = customerResult.value;

  let creditAnalysis: CreditAnalysisSection | null = null;
  if (creditResult.status === "fulfilled") {
    const ca = creditResult.value;
    creditAnalysis = {
      riskScore: ca.score,
      modelVersion: ca.modelVersion,
      decision: ca.decision,
      approvalReason:
        ca.factors.length > 0
          ? ca.factors.map((f) => f.factor).join("; ")
          : "Decisão automatizada pelo motor de risco",
      factors: ca.factors,
      evaluatedAt: ca.evaluatedAt,
    };
  } else {
    const reason = creditResult.reason;
    if (!(reason instanceof UpstreamError) || reason.status !== 404) {
      console.warn(
        `[admin-bff] credit-analysis-service indisponível para loan ${loanId}:`,
        reason
      );
    }
  }

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

// PATCH /loans/:id/review — Decisão manual da mesa de crédito.
router.patch(
  "/:id/review",
  requireAdminAuth,
  async (req: Request, res: Response) => {
    const loanId = req.params.id;
    // officerId vem do token — o analista não pode se impersonar via body.
    const officerId = req.jwtPayload!.sub;

    const { decision, justification } = req.body as {
      decision?: unknown;
      justification?: unknown;
    };

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
      const upstream = await callService<{ id?: string; loanId?: string; status: string }>(
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
        loanId: upstream.loanId ?? upstream.id ?? loanId,
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
