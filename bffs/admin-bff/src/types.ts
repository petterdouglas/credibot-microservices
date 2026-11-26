export interface JwtPayload {
  sub: string;
  name?: string;
  email?: string;
  role?: string;
  iat?: number;
  exp?: number;
}

// Respostas dos microsserviços

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

/** Loan Service — GET /api/v1/loans */
export interface LoanListResponse {
  content: Array<{ id: string; customerId: string; amount: number; status: string; createdAt: string }>;
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
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

// Payloads entregues ao painel administrativo

/**
 * GET /loans/:id — Payload de auditoria completo.
 * Inclui CPF, renda mensal, score de risco, versão do modelo e fatores de decisão.
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
  cpf: string | null;
  email: string;
  monthlyIncome: number | null;
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

/** PATCH /loans/:id/review */
export interface LoanReviewPayload {
  loanId: string;
  status: string;
  reviewedBy: string;
}

// RFC 7807 Problem Details
export interface ProblemDetail {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  timestamp: string;
}
