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

// Taxa de juros exibida ao cliente. Substituir quando loan-service retornar esse dado.
const DISPLAY_RATE = "2.5%";

router.get("/", requireAuth, async (req: Request, res: Response) => {
  const customerId = req.jwtPayload!.sub;

  const customerUrl = process.env.CUSTOMER_SERVICE_URL!;
  const loanUrl = process.env.LOAN_SERVICE_URL!;

  try {
    const [profile, wallet] = await Promise.all([
      callService<CustomerProfileResponse>(
        `${customerUrl}/api/v1/customers/${customerId}`
      ),
      callService<WalletResponse>(
        `${customerUrl}/api/v1/customers/${customerId}/wallet`
      ),
    ]);

    const loans = await callService<LoanListResponse>(
      `${loanUrl}/api/v1/loans?customerId=${encodeURIComponent(customerId)}&page=0&size=5`
    );

    const activeLoan = selectActiveLoan(loans);

    // CPF, monthlyIncome, kycStatus e campos administrativos não são incluídos no payload.
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

// Preferência: PENDING > APPROVED. Retorna null se não houver empréstimos.
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

function translateStatus(status: string): string {
  const map: Record<string, string> = {
    PENDING: "PROCESSANDO",
    APPROVED: "APROVADO",
    REJECTED: "REJEITADO",
    CANCELED: "CANCELADO",
    CANCELED_DUE_TO_ERROR: "CANCELADO",
  };
  return map[status] ?? status;
}

export default router;
