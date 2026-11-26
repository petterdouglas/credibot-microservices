import { delay, http, HttpResponse } from "msw";

const customers = [
  { id: "C-1122", name: "Maria Silva", email: "maria.silva@email.com", kycStatus: "VERIFIED", accountBlocked: false },
  { id: "C-2233", name: "João Pereira", email: "joao.pereira@email.com", kycStatus: "VERIFIED", accountBlocked: false },
  { id: "C-3344", name: "Ana Souza", email: "ana.souza@email.com", kycStatus: "PENDING", accountBlocked: false },
];
const loans = [
  { id: "L-9988", customerName: "Maria Silva", amount: 500, status: "APPROVED", createdAt: "2026-12-01T19:40:00Z" },
  { id: "L-9989", customerName: "João Pereira", amount: 1200, status: "PENDING", createdAt: "2026-12-02T10:15:00Z" },
  { id: "L-9990", customerName: "Ana Souza", amount: 800, status: "REJECTED", createdAt: "2026-12-02T11:00:00Z" },
  { id: "L-9991", customerName: "Maria Silva", amount: 300, status: "CANCELED_DUE_TO_ERROR", createdAt: "2026-12-03T09:20:00Z" },
];

const problem = (status: number, title: string, detail: string) =>
  HttpResponse.json({ type: "about:blank", title, status, detail }, { status });

export const handlers = [
  http.post("/admin/auth/login", async () => {
    await delay(300);
    return HttpResponse.json({ token: "mock.admin.jwt", name: "Carlos Analista", officerId: "EMP-007" });
  }),

  http.get("/admin/loans", async ({ request }) => {
    const u = new URL(request.url);
    const status = u.searchParams.get("status");
    const page = Number(u.searchParams.get("page") ?? 0), size = Number(u.searchParams.get("size") ?? 10);
    const all = loans.filter((l) => !status || l.status === status);
    await delay(200);
    return HttpResponse.json({
      content: all.slice(page * size, page * size + size), page, size,
      totalElements: all.length, totalPages: Math.max(1, Math.ceil(all.length / size)),
    });
  }),
  http.get("/admin/loans/:id", async ({ params }) => {
    const l = loans.find((x) => x.id === params.id);
    await delay(200);
    if (!l) return problem(404, "Not Found", "Empréstimo não encontrado.");
    const failed = l.status === "CANCELED_DUE_TO_ERROR";
    return HttpResponse.json({
      loanId: l.id,
      customer: { name: l.customerName, cpf: "123.456.789-00", monthlyIncome: 1800, kycStatus: "VERIFIED" },
      creditAnalysis: { riskScore: 88, modelVersion: "risk-v2.1", approvalReason: "Histórico pontual e compatibilidade de renda", decision: l.status === "REJECTED" ? "REJECTED" : "APPROVED" },
      financials: { requestedAmount: l.amount, appliedInterestRate: "2.5%", depositStatus: failed ? "FAILED" : l.status === "APPROVED" ? "COMPLETED" : "PENDING" },
    });
  }),
  http.patch("/admin/loans/:id/review", async ({ params, request }) => {
    const b = (await request.json()) as { officerId: string };
    const l = loans.find((x) => x.id === params.id);
    if (!l) return problem(404, "Not Found", "Empréstimo não encontrado.");
    if (l.status !== "PENDING") return problem(422, "Unprocessable Entity", "Só empréstimos pendentes aceitam revisão manual.");
    l.status = "APPROVED";
    await delay(300);
    return HttpResponse.json({ loanId: l.id, status: "APPROVED", reviewedBy: b.officerId });
  }),

  http.get("/admin/customers", async () => { await delay(200); return HttpResponse.json(customers); }),
  http.patch("/admin/customers/:id/block", async ({ params, request }) => {
    const { blocked } = (await request.json()) as { blocked: boolean };
    const c = customers.find((x) => x.id === params.id);
    if (!c) return problem(404, "Not Found", "Cliente não encontrado.");
    c.accountBlocked = blocked;
    await delay(200);
    return HttpResponse.json(c);
  }),
];
