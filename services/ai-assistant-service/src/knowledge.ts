import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { Embedder } from "./embeddings";
import { jsonRequest } from "./upstream";

interface Document {
  source: string;
  text: string;
}

interface VectorIndex {
  name: string;
  vectors: number[][];
  minScore: number;
}

function normalize(vector: number[]) {
  const norm = Math.hypot(...vector) || 1;
  return vector.map((value) => value / norm);
}
function localEmbedding(text: string): number[] {
  const terms = text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").match(/[a-z0-9]{3,}/g) ?? [];
  const vector: number[] = Array(512).fill(0);
  for (const term of new Set(terms)) {
    const hash = createHash("sha256").update(term).digest();
    vector[hash.readUInt16BE(0) % vector.length] += hash[2] % 2 === 0 ? 1 : -1;
  }
  return normalize(vector);
}

export async function loadKnowledge(): Promise<Document[]> {
  const directory = join(__dirname, "../knowledge-base");
  const files = (await readdir(directory)).filter((file) => file.endsWith(".md")).sort();
  const documents = await Promise.all(files.map(async (source) => ({
    source, text: (await readFile(join(directory, source), "utf8")).trim(),
  })));
  return documents.filter(({ text }) => text.length > 0);
}

export class Knowledge {
  private readonly version: string;
  private readonly localIndex: VectorIndex;
  private readonly collections = new Map<string, Promise<string>>();
  private semanticIndex?: Promise<VectorIndex>;
  private semanticRetryAt = 0;
  private chromaRetryAt = 0;

  constructor(private readonly documents: Document[], private readonly chromaUrl?: string,
              private readonly embedder?: Embedder) {
    this.version = createHash("sha256").update(JSON.stringify(documents)).digest("hex").slice(0, 16);
    this.localIndex = this.createIndex("local-v1", documents.map(({ text }) => localEmbedding(text)), 0.15);
  }

  private createIndex(model: string, vectors: number[][], minScore: number): VectorIndex {
    return { name: "credibot-" + model + "-" + this.version, vectors, minScore };
  }

  private async vectorize(message: string): Promise<{ index: VectorIndex; query: number[] }> {
    const embedder = this.embedder;
    if (embedder && Date.now() >= this.semanticRetryAt) {
      try {
        this.semanticIndex ??= embedder.encode(this.documents.map(({ text }) => text), "document")
          .then((vectors) => this.createIndex(embedder.model, vectors.map(normalize), 0.25));
        const [index, [query]] = await Promise.all([this.semanticIndex, embedder.encode([message], "query")]);
        if (!query?.length || index.vectors.length !== this.documents.length
            || index.vectors.some((vector) => vector.length !== query.length)) {
          throw new Error("Dimensões de embeddings inválidas");
        }
        return { index, query: normalize(query) };
      } catch {
        this.semanticIndex = undefined;
        this.semanticRetryAt = Date.now() + 30_000;
        console.warn("[embeddings] provedor indisponível, usando vetores locais");
      }
    }
    return { index: this.localIndex, query: localEmbedding(message) };
  }

  private async indexCollection(index: VectorIndex) {
    const { id } = await this.chroma<{ id: string }>("/collections", {
      name: index.name, get_or_create: true, metadata: { "hnsw:space": "cosine" },
    });
    await this.chroma("/collections/" + id + "/upsert", {
      ids: this.documents.map(({ source }) => source),
      embeddings: index.vectors,
      documents: this.documents.map(({ text }) => text),
    });
    return id;
  }

  private chroma<T>(path: string, body: object): Promise<T> {
    return jsonRequest(this.chromaUrl + "/api/v1" + path, "ChromaDB", body, 1800);
  }

  async retrieve(message: string) {
    if (!this.documents.length) return [];
    const { index, query } = await this.vectorize(message);
    const limit = Math.min(2, this.documents.length);
    if (this.chromaUrl && Date.now() >= this.chromaRetryAt) {
      try {
        const collection = this.collections.get(index.name) ?? this.indexCollection(index);
        this.collections.set(index.name, collection);
        const id = await collection;
        const result = await this.chroma<{ ids: string[][]; distances: number[][] }>("/collections/" + id + "/query", {
          query_embeddings: [query], n_results: limit, include: ["distances"],
        });
        return result.ids[0].flatMap((source, rank) =>
          result.distances[0][rank] <= 1 - index.minScore
            ? this.documents.filter((document) => document.source === source) : []);
      } catch {
        this.collections.delete(index.name);
        this.chromaRetryAt = Date.now() + 30_000;
        console.warn("[chroma] consulta indisponível, usando índice local");
      }
    }
    return this.documents.map((document, rank) => ({
      document, score: index.vectors[rank].reduce((sum, value, dimension) => sum + value * query[dimension], 0),
    })).filter(({ score }) => score >= index.minScore).sort((a, b) => b.score - a.score)
      .slice(0, limit).map(({ document }) => document);
  }
}
