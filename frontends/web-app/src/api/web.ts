import { http } from "./http";

// Vocabulario do Web BFF (contrato: PROCESSANDO/APROVADO). Os demais valores sao PROPOSTA.
export type LoanStatus = "PROCESSANDO" | "APROVADO" | "REJEITADO" | "CANCELADO" | "CANCELADO_POR_ERRO";

export interface Link { href: string; method: string }
export interface Dashboard {
  customerName: string;
  walletBalance: number;
  activeLoan?: { id: string; amount: number; status: LoanStatus; rate: string };
}
export interface CreateLoanResponse { loanId: string; status: LoanStatus; message: string }
// PROPOSTA: GET /web/loans/{id}
export interface LoanDetail {
  loanId: string; status: LoanStatus; amount: number; installments: number;
  rate: string; reason?: string; createdAt: string; updatedAt: string;
  _links?: Record<string, Link>;
}
export interface RegisterInput { name: string; cpf: string; email: string; password: string; monthlyIncome: number }

export const webApi = {
  register: (b: RegisterInput) => http.post<{ id: string; name: string }>("/customers", b), // PROPOSTA
  dashboard: () => http.get<Dashboard>("/dashboard"),
  createLoan: (b: { amount: number; installments: number }) => http.post<CreateLoanResponse>("/loans", b),
  getLoan: (id: string) => http.get<LoanDetail>(`/loans/${id}`), // PROPOSTA
  cancelLoan: (id: string, reason: string) => http.patch<LoanDetail>(`/loans/${id}/cancel`, { reason }), // PROPOSTA
  chat: (message: string) => http.post<{ reply: string }>("/chat", { message }),
};
