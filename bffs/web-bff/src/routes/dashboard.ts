// ============================================================================
// CrediBot Web BFF — Rota: GET /dashboard
// Agrega perfil do cliente + saldo da carteira + empréstimo ativo.
// Payload leve: sem CPF, sem score, sem dados internos administrativos.
// ============================================================================
import { Router, Request, Response } from "express";
import { requireAuth } from "../auth.js";
import { callService } from "../httpClient.js";
import { handleUpstreamError } from "../errors.js";
import {
  CustomerProfileResponse,
  WalletResponse,
  LoanListResponse,
  DashboardPayload,
  ActiveLoanSummary,
} from "../types.js";

const router = Router();

// Taxa de juros exibida ao cliente (definida pela plataforma).
// Quando o Loan Service passar a retornar esse dado, substituir por campo real.
const DISPLAY_RATE = "2.5%";

/** GET /dashboard */
router.get("/", requireAuth, async (req: Request, res: Response) => {
  const customerId = req.jwtPayload!.sub;

  const customerUrl = process.env.CUSTOMER_SERVICE_URL!;
  const loanUrl = process.env.LOAN_SERVICE_URL!;

  try {
    // Consultas paralelas: perfil + carteira são independentes entre si.
    const [profile, wallet] = await Promise.all([
      callService<CustomerProfileResponse>(
        `${customerUrl}/api/v1/customers/${customerId}`
      ),
      callService<WalletResponse>(
        `${customerUrl}/api/v1/customers/${customerId}/wallet`
      ),
    ]);

    // Busca empréstimos ativos do cliente (CQRS Read Model — paginação mínima).
    // Filtra por status PENDING e APPROVED para exibir o mais recente.
    const loans = await callService<LoanListResponse>(
      `${loanUrl}/api/v1/loans?customerId=${encodeURIComponent(customerId)}&page=0&size=5`
    );

    // Seleciona o empréstimo mais relevante (PENDING > APPROVED > último).
    const activeLoan = selectActiveLoan(loans);

    // ---------------------------------------------------------------------------
    // MASCARAMENTO: CPF, monthlyIncome, kycStatus, accountBlocked e campos
    // administrativos NÃO são incluídos no payload do Web BFF.
    // ---------------------------------------------------------------------------
    const payload: DashboardPayload = {
      customerName: profile.name,
      walletBalance: wallet.balance,
      activeLoan,
    };

    res.status(200).json(payload);
  } catch (err) {
    handleUpstreamError(res, req, err, "customer-service / loan-service");
  }
});

/**
 * Retorna um resumo do empréstimo mais relevante para o dashboard.
 * Preferência: PENDING → APPROVED. Nenhum empréstimo → null.
 * Campos omitidos: customerId, createdAt, _links (internos).
 */
function selectActiveLoan(loans: LoanListResponse): ActiveLoanSummary | null {
  if (!loans.content || loans.content.length === 0) return null;

  const priority = ["PENDING", "APPROVED"];
  const sorted = [...loans.content].sort((a, b) => {
    const pa = priority.indexOf(a.status);
    const pb = priority.indexOf(b.status);
    if (pa === -1 && pb === -1) return 0;
    if (pa === -1) return 1;
    if (pb === -1) return -1;
    return pa - pb;
  });

  const loan = sorted[0];
  return {
    id: loan.id,
    amount: loan.amount,
    status: translateStatus(loan.status),
    rate: DISPLAY_RATE,
  };
}

/** Traduz status interno para português amigável ao cliente final. */
function translateStatus(status: string): string {
  const map: Record<string, string> = {
    PENDING: "PROCESSANDO",
    APPROVED: "APROVADO",
    CANCELED: "CANCELADO",
    CANCELED_DUE_TO_ERROR: "CANCELADO",
  };
  return map[status] ?? status;
}

export default router;
