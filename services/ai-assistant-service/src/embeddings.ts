import { jsonRequest } from "./upstream";

export const provider = process.env.LLM_PROVIDER ?? "gemini";
const configuredKey = process.env.LLM_API_KEY?.trim();
export const apiKey = configuredKey && !configuredKey.startsWith("changeme") ? configuredKey : undefined;

export interface Embedder {
  model: string;
  encode(texts: string[], purpose: "document" | "query"): Promise<number[][]>;
}

const dimensions = 512;
const geminiModel = "gemini-embedding-001";
const openaiModel = "text-embedding-3-small";

export function providerEmbeddings(): Embedder | undefined {
  if (!apiKey) return;
  const key = apiKey;
  if (provider === "gemini") {
    return {
      model: geminiModel,
      async encode(texts, purpose) {
        const { embeddings } = await jsonRequest<{ embeddings: Array<{ values: number[] }> }>(
          "https://generativelanguage.googleapis.com/v1beta/models/" + geminiModel + ":batchEmbedContents",
          "Gemini Embeddings", { requests: texts.map((text) => ({
            model: "models/" + geminiModel,
            content: { parts: [{ text }] },
            taskType: purpose === "query" ? "RETRIEVAL_QUERY" : "RETRIEVAL_DOCUMENT",
            outputDimensionality: dimensions,
          })) }, 4000, { "x-goog-api-key": key });
        return embeddings.map(({ values }) => values);
      },
    };
  }
  if (provider === "openai") {
    return {
      model: openaiModel,
      async encode(texts) {
        const { data } = await jsonRequest<{ data: Array<{ index: number; embedding: number[] }> }>(
          "https://api.openai.com/v1/embeddings", "OpenAI Embeddings",
          { model: openaiModel, input: texts, dimensions, encoding_format: "float" },
          4000, { authorization: "Bearer " + key });
        return data.sort((a, b) => a.index - b.index).map(({ embedding }) => embedding);
      },
    };
  }
}
