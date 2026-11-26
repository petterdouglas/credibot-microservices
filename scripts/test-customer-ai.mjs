import assert from "node:assert/strict";
import { randomInt, randomUUID, createHmac } from "node:crypto";
import { setTimeout as wait } from "node:timers/promises";

const customer = process.env.CUSTOMER_SERVICE_URL ?? "http://customer-service:8082";
const loan = process.env.LOAN_SERVICE_URL ?? "http://loan-service:8081";
const assistant = process.env.AI_ASSISTANT_URL ?? "http://ai-assistant-service:3003";
const web = "http://127.0.0.1:" + (process.env.PORT ?? "3001");

async function request(url, expected, body, headers = {}) {
  const response = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: { ...(body ? { "content-type": "application/json" } : {}), ...headers },
    body: body && JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  const result = await response.json();
  assert.ok([expected].flat().includes(response.status), url + ": " + JSON.stringify(result));
  return result;
}

async function waitForLoan(id) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const result = await request(loan + "/api/v1/loans/" + id, [200, 404]);
    if (result.status !== "PENDING" && result.status !== 404) return result;
    await wait(750);
  }
  throw new Error("Empréstimo não saiu de PENDING: " + id);
}

async function register() {
  return request(customer + "/api/v1/customers", 201, {
    name: "Cliente de teste", email: randomUUID() + "@example.test",
    cpf: String(randomInt(10 ** 10, 10 ** 11)), monthlyIncome: 1800,
  });
}

let created = await register();
// O motor de crédito do projeto classifica IDs terminados em 99 como alto risco.
while (created.id.endsWith("99")) created = await register();

const profile = customer + "/api/v1/customers/" + created.id;
assert.equal((await request(profile, 200)).kycStatus, "PENDING");
assert.equal((await request(profile + "/wallet", 200)).balance, 0);

const amount = 500;
const issued = await request(loan + "/api/v1/loans", 201, {
  customerId: created.id, amount, installments: 6,
});
assert.equal((await waitForLoan(issued.id)).status, "APPROVED");
assert.equal((await request(profile + "/wallet", 200)).balance, amount);

const deposits = await Promise.all([1, 2].map(() =>
  request(profile + "/deposit", 200, { loanId: issued.id, amount })));
assert.equal(deposits[0].transactionId, deposits[1].transactionId);
assert.equal((await request(profile + "/wallet", 200)).balance, amount);
await request(profile + "/deposit", 409, { loanId: issued.id, amount: amount + 1 });
console.log("OK cadastro, perfil, carteira, SAGA aprovada e depósito idempotente");

const missingId = "C-MISSING-" + randomUUID() + "-0";
const missing = await request(loan + "/api/v1/loans", 201, {
  customerId: missingId, amount, installments: 6,
});
assert.equal((await waitForLoan(missing.id)).status, "CANCELED_DUE_TO_ERROR");
console.log("OK SAGA compensada para cliente inexistente");

const chat = assistant + "/api/v1/chat";
await request(chat, 400, { customerId: created.id, message: "" });
const faq = await request(chat, 200, { customerId: created.id, message: "O que é o CET e como funcionam os juros?" });
assert.ok(faq.contextSources.includes("juros.md"));
assert.ok(faq.reply.length > 0);

const message = "Qual o status do empréstimo " + issued.id + "?";
const status = await request(chat, 200, { customerId: created.id, message });
assert.deepEqual(status.toolsInvoked, ["get_loan_status"]);
assert.ok(status.reply.includes(issued.id));
assert.match(status.reply, /aprovado/);
const other = await request(chat, 200, { customerId: missingId, message });
assert.match(other.reply, /Não encontrei/);
assert.ok(!other.reply.includes(issued.id));
console.log("OK chat, base de conhecimento, consulta de status e titularidade (" + faq.responseMode + ")");

assert.ok(process.env.JWT_SECRET, "Configure JWT_SECRET no Web BFF para o teste autenticado.");
const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
const unsigned = encode({ alg: "HS256", typ: "JWT" }) + "." +
  encode({ sub: created.id, exp: Math.floor(Date.now() / 1000) + 120 });
const signature = createHmac("sha256", process.env.JWT_SECRET).update(unsigned).digest("base64url");
const auth = { authorization: "Bearer " + unsigned + "." + signature };
await request(web + "/chat", 401, { message });
const result = await request(web + "/chat", 200, { customerId: missingId, message }, auth);
assert.deepEqual(Object.keys(result), ["reply"]);
assert.ok(result.reply.includes(issued.id));
console.log("OK chat autenticado via Web BFF");
