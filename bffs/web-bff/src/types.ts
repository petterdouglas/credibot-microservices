// ============================================================================
// CrediBot Web BFF — Tipos compartilhados
// ============================================================================

/** Payload decodificado do JWT (propagado pelo header Authorization). */
export interface JwtPayload {
  sub: string;       // customerId (ex: "C-1122")
  name?: string;
  email?: string;
  iat?: number;
  exp?: number;
}

// ---------------------------------------------------------------------------
// Respostas dos microsserviços (contratos internos)
// ---------------------------------------------------------------------------

/** Loan Service — POST /api/v1/loans (201) */
export interface LoanCreatedResponse {
  id: string;
  customerId: string;
  amount: number;
  installments: number;
  status: string;
  createdAt: string;
  _links?: Record<string, { href: string; method: string }>;
}

/** Loan Service — GET /api/v1/loans?customerId=&status=&page=&size= */
export interface LoanListResponse {
  content: Array<{
    id: string;
    customerId: string;
    amount: number;
    status: string;
    createdAt: string;
  }>;
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
  cpf?: string;           // campo sensível — nunca repassar ao cliente web
  monthlyIncome?: number; // campo sensível — nunca repassar ao cliente web
  kycStatus: string;
  accountBlocked: boolean;
}

/** Customer Service — GET /api/v1/customers/{id}/wallet */
export interface WalletResponse {
  customerId: string;
  balance: number;
  currency: string;
}

/** AI Assistant — POST /api/v1/chat */
export interface AiChatUpstreamResponse {
  reply: string;
  contextSources?: string[];
  toolsInvoked?: string[];
}

// ---------------------------------------------------------------------------
// Payloads do Web BFF (respostas entregues ao frontend)
// ---------------------------------------------------------------------------

/** GET /dashboard */
export interface DashboardPayload {
  customerName: string;
  walletBalance: number;
  activeLoan: ActiveLoanSummary | null;
}

export interface ActiveLoanSummary {
  id: string;
  amount: number;
  status: string;
  rate: string;
}

/** POST /loans — 201 Created */
export interface LoanRequestedPayload {
  loanId: string;
  status: string;
  message: string;
}

/** POST /chat — 200 OK */
export interface ChatPayload {
  reply: string;
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
