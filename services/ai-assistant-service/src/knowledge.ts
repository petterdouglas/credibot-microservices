import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { jsonRequest } from "./upstream";

interface Entry {
  source: string;
  text: string;
  vector: number[];
}

function embed(text: string): number[] {
  const terms = text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").match(/[a-z0-9]{3,}/g) ?? [];
  const vector: number[] = Array(512).fill(0);
  for (const term of new Set(terms)) {
    const hash = createHash("sha256").update(term).digest();
    vector[hash.readUInt16BE(0) % vector.length] += hash[2] % 2 === 0 ? 1 : -1;
  }
  const norm = Math.hypot(...vector) || 1;
  return vector.map((value) => value / norm);
}

export async function loadKnowledge() {
  const directory = join(__dirname, "../knowledge-base");
  const files = (await readdir(directory)).filter((file) => file.endsWith(".md")).sort();
  return Promise.all(files.map(async (source) => {
    const text = (await readFile(join(directory, source), "utf8")).trim();
    return { source, text, vector: embed(text) };
  }));
}

export class Knowledge {
  private index?: Promise<string>;
  private retryAt = 0;

  constructor(private readonly entries: Entry[], private readonly chromaUrl?: string) {}

  private async indexCollection() {
    const version = createHash("sha256").update(JSON.stringify(this.entries)).digest("hex").slice(0, 16);
    const { id } = await this.chroma<{ id: string }>("/collections", {
      name: "credibot-knowledge-" + version, get_or_create: true, metadata: { "hnsw:space": "cosine" },
    });
    await this.chroma("/collections/" + id + "/upsert", {
      ids: this.entries.map((entry) => entry.source),
      embeddings: this.entries.map((entry) => entry.vector),
      documents: this.entries.map((entry) => entry.text),
    });
    return id;
  }

  private chroma<T>(path: string, body: object): Promise<T> {
    return jsonRequest(this.chromaUrl + "/api/v1" + path, "ChromaDB", body, 1800);
  }

  async retrieve(message: string) {
    const vector = embed(message);
    if (this.chromaUrl && this.entries.length && Date.now() >= this.retryAt) {
      try {
        this.index ??= this.indexCollection();
        const id = await this.index;
        const result = await this.chroma<{ ids: string[][]; distances: number[][] }>("/collections/" + id + "/query", {
          query_embeddings: [vector], n_results: Math.min(2, this.entries.length), include: ["distances"],
        });
        return result.ids[0].flatMap((source, rank) =>
          result.distances[0][rank] <= 0.85 ? this.entries.filter((entry) => entry.source === source) : []);
      } catch {
        this.index = undefined;
        this.retryAt = Date.now() + 30_000;
        console.warn("[chroma] consulta indisponível, usando índice local");
      }
    }
    return this.entries.map((entry) => ({
      entry, score: entry.vector.reduce((sum, value, index) => sum + value * vector[index], 0),
    })).filter(({ score }) => score >= 0.15).sort((a, b) => b.score - a.score)
      .slice(0, 2).map(({ entry }) => entry);
  }
}
