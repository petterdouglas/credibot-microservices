import { http } from "./http";

// O Admin BFF devolve o enum cru do Loan Service (diferenca de payload exigida na Parte 2, secao 4.4).
export type RawLoanStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELED" | "CANCELED_DUE_TO_ERROR";

export interface Page<T> { content: T[]; page: number; size: number; totalElements: number; totalPages: number }
// PROPOSTA: GET /admin/loans
export interface LoanRow { id: string; customerName: string; amount: number; status: RawLoanStatus; createdAt: string }
// Contrato: GET /admin/loans/{id}
export interface LoanAudit {
  loanId: string;
  customer: { name: string; cpf: string; monthlyIncome: number; kycStatus: string };
  creditAnalysis: { riskScore: number; modelVersion: string; approvalReason: string; decision: string };
  financials: { requestedAmount: number; appliedInterestRate: string; depositStatus: string };
}
// PROPOSTA: GET /admin/customers e PATCH /admin/customers/{id}/block
export interface CustomerRow { id: string; name: string; email: string; kycStatus: string; accountBlocked: boolean }

export const adminApi = {
  loans: (status: string, page: number) =>
    http.get<Page<LoanRow>>(`/loans?page=${page}&size=10${status ? `&status=${status}` : ""}`),
  audit: (id: string) => http.get<LoanAudit>(`/loans/${id}`),
  review: (id: string, b: { decision: "MANUALLY_APPROVED"; officerId: string; justification: string }) =>
    http.patch<{ loanId: string; status: string; reviewedBy: string }>(`/loans/${id}/review`, b),
  customers: () => http.get<CustomerRow[]>("/customers"),
  setBlocked: (id: string, blocked: boolean) => http.patch<CustomerRow>(`/customers/${id}/block`, { blocked }),
};
