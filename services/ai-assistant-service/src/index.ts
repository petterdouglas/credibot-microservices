import http, { IncomingMessage, ServerResponse } from "node:http";
import { chat } from "./assistant";
import { Knowledge, loadKnowledge } from "./knowledge";

class RequestError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

function send(response: ServerResponse, status: number, body: object) {
  response.writeHead(status, { "content-type": status >= 400 ? "application/problem+json" : "application/json" });
  response.end(JSON.stringify(body));
}

async function readBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  let length = 0;
  for await (const chunk of request.iterator({ destroyOnReturn: false })) {
    length += chunk.length;
    if (length > 8192) {
      request.resume();
      throw new RequestError(413, "Corpo da requisição acima de 8 KiB.");
    }
    chunks.push(chunk);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as { customerId?: unknown; message?: unknown } | null;
  } catch {
    throw new RequestError(400, "JSON inválido.");
  }
}

async function start() {
  const knowledge = new Knowledge(await loadKnowledge(), process.env.CHROMA_URL);
  const port = Number(process.env.PORT ?? 3003);
  const bind = process.env.SERVER_ADDRESS ?? "127.0.0.1";
  const server = http.createServer(async (req, res) => {
    try {
      if (req.method === "GET" && req.url === "/health") {
        send(res, 200, { status: "UP", service: "ai-assistant-service" });
        return;
      }
      if (req.url !== "/api/v1/chat") throw new RequestError(404, "Rota não encontrada.");
      if (req.method !== "POST") {
        res.setHeader("allow", "POST");
        throw new RequestError(405, "Use POST nesta rota.");
      }
      const body = await readBody(req);
      if (typeof body?.customerId !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(body.customerId)
          || typeof body?.message !== "string" || !body.message.trim() || body.message.length > 1000) {
        throw new RequestError(400, "Informe customerId e uma mensagem entre 1 e 1000 caracteres.");
      }
      send(res, 200, await chat(knowledge, body.customerId, body.message.trim()));
    } catch (error) {
      const status = error instanceof RequestError ? error.status : 500;
      const detail = error instanceof RequestError ? error.message : "Não consegui responder agora.";
      if (status === 500) console.error("[chat] erro interno");
      send(res, status, {
        type: "about:blank", title: http.STATUS_CODES[status], status, detail,
        instance: req.url, timestamp: new Date().toISOString(),
      });
    }
  });
  server.listen(port, bind, () => console.log("ai-assistant-service listening on " + bind + ":" + port));
}

start().catch((error) => {
  console.error("[startup]", error);
  process.exitCode = 1;
});
