import { delay, http, HttpResponse } from "msw";

// Simula a SAGA: o pedido nasce PROCESSANDO e, apos SAGA_MS, vira APROVADO.
// Para simular a FALHA (compensacao), entre com um e-mail que contenha "bloqueado"
// (ex.: bloqueado@teste.com) -> o pedido termina em CANCELADO_POR_ERRO.
const SAGA_MS = 4000;
const RATE = "2.5%";

interface MockLoan { id: string; amount: number; installments: number; createdAt: number; canceled?: boolean; settled?: boolean }
const db = {
  name: "Maria Silva",
  balance: 520.5,
  blocked: false,
  loans: new Map<string, MockLoan>(),
};

function view(l: MockLoan) {
  let status = "PROCESSANDO";
  let reason: string | undefined;
  if (l.canceled) { status = "CANCELADO"; reason = "Cancelado pelo cliente"; }
  else if (Date.now() - l.createdAt >= SAGA_MS) {
    if (db.blocked) { status = "CANCELADO_POR_ERRO"; reason = "Conta bloqueada por suspeita de fraude."; }
    else {
      status = "APROVADO";
      if (!l.settled) { l.settled = true; db.balance += l.amount; }
    }
  }
  const links: Record<string, { href: string; method: string }> = { self: { href: `/web/loans/${l.id}`, method: "GET" } };
  if (status === "PROCESSANDO") links.cancel = { href: `/web/loans/${l.id}/cancel`, method: "PATCH" };
  return {
    loanId: l.id, status, amount: l.amount, installments: l.installments, rate: RATE, reason,
    createdAt: new Date(l.createdAt).toISOString(), updatedAt: new Date().toISOString(), _links: links,
  };
}

const problem = (status: number, title: string, detail: string) =>
  HttpResponse.json({ type: "about:blank", title, status, detail }, { status });

export const handlers = [
  http.post("/web/auth/login", async ({ request }) => {
    const { email } = (await request.json()) as { email: string };
    db.blocked = email.toLowerCase().includes("bloqueado");
    await delay(300);
    return HttpResponse.json({ token: "mock.jwt.token", name: db.name });
  }),
  http.post("/web/customers", async () => { await delay(300); return HttpResponse.json({ id: "C-1122", name: db.name }, { status: 201 }); }),

  http.get("/web/dashboard", async () => {
    await delay(200);
    const last = [...db.loans.values()].pop();
    const v = last && view(last);
    return HttpResponse.json({
      customerName: db.name, walletBalance: db.balance,
      activeLoan: v ? { id: v.loanId, amount: v.amount, status: v.status, rate: RATE } : undefined,
    });
  }),

  http.post("/web/loans", async ({ request }) => {
    const b = (await request.json()) as { amount: number; installments: number };
    const id = "L-" + Math.random().toString(36).slice(2, 6).toUpperCase();
    db.loans.set(id, { id, amount: b.amount, installments: b.installments, createdAt: Date.now() });
    await delay(400);
    return HttpResponse.json({ loanId: id, status: "PROCESSANDO", message: "Solicitação recebida com sucesso!" }, { status: 201 });
  }),
  http.get("/web/loans/:id", async ({ params }) => {
    const l = db.loans.get(params.id as string);
    await delay(150);
    return l ? HttpResponse.json(view(l)) : problem(404, "Not Found", "Empréstimo não encontrado.");
  }),
  http.patch("/web/loans/:id/cancel", async ({ params }) => {
    const l = db.loans.get(params.id as string);
    if (!l) return problem(404, "Not Found", "Empréstimo não encontrado.");
    if (view(l).status !== "PROCESSANDO") return problem(422, "Unprocessable Entity", "Só é possível cancelar pedidos em análise.");
    l.canceled = true;
    return HttpResponse.json(view(l));
  }),

  http.post("/web/chat", async ({ request }) => {
    const { message } = (await request.json()) as { message: string };
    await delay(900);
    const last = [...db.loans.values()].pop();
    if (message.toLowerCase().includes("empréstimo") && last) {
      return HttpResponse.json({ reply: `Seu pedido ${last.id} está com status ${view(last).status}.` });
    }
    return HttpResponse.json({ reply: "Nossa taxa é de 2,5% ao mês para valores de até R$ 2.000." });
  }),
];
