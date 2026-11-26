import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";

const mode = process.argv[2] ?? "offline";
assert.ok(["offline", "live", "error"].includes(mode), "Use offline, live ou error.");
if (mode === "offline") delete process.env.LLM_API_KEY;
if (mode === "error") {
  process.env.LLM_PROVIDER = "gemini";
  process.env.LLM_API_KEY = "invalid-key-for-fallback-test";
}

const { createChatChain } = await import("../services/ai-assistant-service/dist/assistant.js");
const { apiKey, provider, providerEmbeddings } = await import("../services/ai-assistant-service/dist/embeddings.js");
const { Knowledge, loadKnowledge } = await import("../services/ai-assistant-service/dist/knowledge.js");
if (mode === "live") assert.ok(apiKey, "Configure uma LLM_API_KEY válida no ambiente local.");

const knowledge = new Knowledge(await loadKnowledge(), process.env.CHROMA_URL, providerEmbeddings());
const chains = {
  rag: createChatChain(knowledge),
  baseline: createChatChain(knowledge, "no-rag"),
};
const questions = [
  ["O que é o CET?", "juros.md", /encargos|taxas/i],
  ["Onde confiro a taxa efetiva de juros?", "juros.md", /oferta|contrato/i],
  ["Quais dados devo conferir nas parcelas?", "parcelas.md", /vencimento/i],
  ["O que o saldo da carteira mostra?", "carteira.md", /disponível/i],
  ["Como o depósito na carteira se relaciona com a aprovação?", "carteira.md", /aprovação|aprova/i],
  ["Qual a previsão meteorológica para Marte?", null, /não encontrei|não tenho|não há|insuficiente|fora/i],
];

async function measure(chain, message, expectedAnswer, repetitions) {
  const samples = [];
  let result;
  for (let i = 0; i < repetitions; i++) {
    const started = performance.now();
    result = await chain.invoke({ customerId: "C-AVALIACAO", message });
    samples.push(Number((performance.now() - started).toFixed(2)));
  }
  return { ...result, answerMatches: expectedAnswer.test(result.reply), samples };
}

if (mode === "error") {
  const result = await measure(chains.rag, questions[0][0], questions[0][2], 1);
  assert.equal(result.responseMode, "local");
  assert.ok(result.contextSources.includes("juros.md"));
  assert.ok(result.answerMatches);
  console.log("Fallback com chave inválida: modo local, resposta com fonte e sem erro técnico na saída.");
} else {
  if (mode === "offline") {
    for (const chain of Object.values(chains)) await chain.invoke({ customerId: "C-AVALIACAO", message: questions[0][0] });
  }
  const rows = [];
  for (const [message, expectedSource, expectedAnswer] of questions) {
    const repetitions = mode === "live" ? 1 : 20;
    const rag = await measure(chains.rag, message, expectedAnswer, repetitions);
    const baseline = await measure(chains.baseline, message, expectedAnswer, repetitions);
    assert.deepEqual(baseline.contextSources, []);
    if (mode === "live" && expectedSource) {
      assert.equal(rag.responseMode, "llm", "O caso RAG entrou em fallback: " + message);
      assert.equal(baseline.responseMode, "llm", "O controle entrou em fallback: " + message);
    }
    rows.push({ message, expectedSource, rag, baseline });
  }
  console.log(JSON.stringify({ mode, provider, model: process.env.LLM_MODEL || null, rows }, null, 2));
}
