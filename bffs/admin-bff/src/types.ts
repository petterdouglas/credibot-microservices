// ============================================================================
// CrediBot Admin BFF — Tipos compartilhados
// ============================================================================

/**
 * Payload decodificado do JWT (propagado pelo header Authorization).
 * No Admin BFF, o campo `role` é extraído para verificar privilégios.
 */
export interface JwtPayload {
  sub: string;       // officerId / employeeId (ex: "EMP-007")
  name?: string;
  email?: string;
  role?: string;     // ex: "admin", "analyst" — verificado pelo middleware
  iat?: number;
  exp?: number;
}

// ---------------------------------------------------------------------------
// Respostas dos microsserviços (contratos internos)
// ---------------------------------------------------------------------------

/** Loan Service — GET /api/v1/loans/{id} */
export interface LoanDetailResponse {
  id: string;
  customerId: string;
  amount: number;
  installments?: number;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  _links?: Record<string, { href: string; method: string }>;
}

/** Customer Service — GET /api/v1/customers/{id} */
export interface CustomerProfileResponse {
  id: string;
  name: string;
  email: string;
  cpf?: string;
  monthlyIncome?: number;
  kycStatus: string;
  accountBlocked: boolean;
}

/** Credit Analysis Service — GET /api/v1/credit/{id} */
export interface CreditAnalysisResponse {
  loanId: string;
  score: number;
  decision: string;
  modelVersion: string;
  factors: Array<{ factor: string; weight: string }>;
  evaluatedAt: string;
}

// ---------------------------------------------------------------------------
// Payloads do Admin BFF (respostas entregues ao painel administrativo)
// ---------------------------------------------------------------------------

/**
 * GET /loans/:id — Payload de auditoria completo.
 * Contém todos os dados sensíveis que o Web BFF suprime:
 * CPF, renda mensal, score de risco, versão do modelo, fatores de decisão.
 */
export interface LoanAuditPayload {
  loanId: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  customer: CustomerAuditSection;
  creditAnalysis: CreditAnalysisSection | null;
  financials: FinancialsSection;
}

export interface CustomerAuditSection {
  id: string;
  name: string;
  cpf: string | null;           // exposto ao analista — protegido do cliente web
  email: string;
  monthlyIncome: number | null; // exposto ao analista — protegido do cliente web
  kycStatus: string;
  accountBlocked: boolean;
}

export interface CreditAnalysisSection {
  riskScore: number;
  modelVersion: string;
  decision: string;
  approvalReason: string;
  factors: Array<{ factor: string; weight: string }>;
  evaluatedAt: string;
}

export interface FinancialsSection {
  requestedAmount: number;
  installments: number | null;
  appliedInterestRate: string;
}

/** PATCH /loans/:id/review — Resposta da revisão manual */
export interface LoanReviewPayload {
  loanId: string;
  status: string;
  reviewedBy: string;
}

// ---------------------------------------------------------------------------
// Erro RFC 7807 — Problem Details
// ---------------------------------------------------------------------------
export interface ProblemDetail {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  timestamp: string;
}
