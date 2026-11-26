#!/usr/bin/env bash
set -euo pipefail

# Executar na raiz do Compose de desenvolvimento.
customer_id=$(docker compose exec -T web-bff node --input-type=module <<'NODE'
import { randomInt, randomUUID } from "node:crypto";
const url = process.env.CUSTOMER_SERVICE_URL ?? "http://customer-service:8082";
for (let attempt = 0; attempt < 5; attempt++) {
  const response = await fetch(url + "/api/v1/customers", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "Cliente fictício para demo SAGA",
      email: randomUUID() + "@example.test",
      cpf: String(randomInt(10 ** 10, 10 ** 11)),
      monthlyIncome: 1800
    }),
    signal: AbortSignal.timeout(10000)
  });
  if (response.status === 409) continue;
  if (response.status !== 201) throw Error("Cadastro retornou HTTP " + response.status);
  const { id } = await response.json();
  if (!id.endsWith("99")) {
    console.log(id);
    process.exit(0);
  }
}
throw Error("Não foi possível criar o cliente de demonstração.");
NODE
)
[[ "$customer_id" =~ ^C-[0-9a-f-]{36}$ ]]

docker compose exec -T mysql sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" exec mysql --batch "$MYSQL_DATABASE" -u "$MYSQL_USER"' <<SQL
UPDATE customers SET account_blocked = TRUE
WHERE id = '$customer_id' AND email LIKE '%@example.test';
SQL

docker compose exec -T -e SAGA_CUSTOMER_ID="$customer_id" web-bff node --input-type=module <<'NODE'
import assert from "node:assert/strict";
import { setTimeout as wait } from "node:timers/promises";
const customer = process.env.CUSTOMER_SERVICE_URL ?? "http://customer-service:8082";
const loans = (process.env.LOAN_SERVICE_URL ?? "http://loan-service:8081") + "/api/v1/loans";
const profile = customer + "/api/v1/customers/" + process.env.SAGA_CUSTOMER_ID;
async function request(url, status, body) {
  const response = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: body ? { "content-type": "application/json" } : {},
    body: body && JSON.stringify(body),
    signal: AbortSignal.timeout(10000)
  });
  assert.equal(response.status, status);
  return response.json();
}
assert.equal((await request(profile, 200)).accountBlocked, true);
const before = await request(profile + "/wallet", 200);
console.log("Conta bloqueada para a demo. Saldo inicial:", before.balance);
const loan = await request(loans, 201, { customerId: before.customerId, amount: 500, installments: 6 });
console.log("Solicitação criada:", loan.id, loan.status);
for (let i = 0; i < 40; i++) {
  const current = await request(loans + "/" + loan.id, 200);
  if (current.status === "CANCELED_DUE_TO_ERROR") {
    const after = await request(profile + "/wallet", 200);
    assert.equal(after.balance, before.balance);
    console.log("Compensação confirmada:", current.status, "| Saldo final:", after.balance);
    process.exit(0);
  }
  if (current.status !== "PENDING") throw Error("Status inesperado: " + current.status);
  await wait(750);
}
throw Error("A compensação não foi concluída no prazo do teste.");
NODE
