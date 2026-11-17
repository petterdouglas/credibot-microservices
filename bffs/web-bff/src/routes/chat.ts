// ============================================================================
// CrediBot Web BFF — Rota: POST /chat
// Encaminha mensagem do cliente ao AI Assistant Service.
//
// SEGURANÇA:
//   - customerId vem do JWT — cliente não pode injetar outro ID.
//   - contextSources e toolsInvoked (metadados internos do RAG/LangChain)
//     NÃO são repassados ao frontend: são dados de auditoria interna.
// ============================================================================
import { Router, Request, Response } from "express";
import { requireAuth } from "../auth.js";
import { callService } from "../httpClient.js";
import { handleUpstreamError, sendProblem } from "../errors.js";
import { AiChatUpstreamResponse, ChatPayload } from "../types.js";

const router = Router();

/** POST /chat */
router.post("/", requireAuth, async (req: Request, res: Response) => {
  const customerId = req.jwtPayload!.sub;

  const { message } = req.body as { message?: unknown };

  if (typeof message !== "string" || message.trim().length === 0) {
    sendProblem(
      res,
      400,
      "Bad Request",
      "O campo 'message' é obrigatório e não pode estar vazio.",
      req
    );
    return;
  }

  if (message.length > 1000) {
    sendProblem(
      res,
      400,
      "Bad Request",
      "A mensagem não pode exceder 1000 caracteres.",
      req
    );
    return;
  }

  const aiUrl = process.env.AI_ASSISTANT_URL!;

  try {
    const upstream = await callService<AiChatUpstreamResponse>(
      `${aiUrl}/api/v1/chat`,
      {
        method: "POST",
        // customerId injetado pelo BFF via JWT — nunca do body do cliente.
        body: { customerId, message: message.trim() },
        timeoutMs: 30_000, // LLM pode ser lento
      }
    );

    // ---------------------------------------------------------------------------
    // MASCARAMENTO: contextSources e toolsInvoked são metadados internos do
    // pipeline RAG/LangChain. São dados de observabilidade/auditoria e não
    // devem ser expostos ao cliente final.
    // ---------------------------------------------------------------------------
    const payload: ChatPayload = {
      reply: upstream.reply,
    };

    res.status(200).json(payload);
  } catch (err) {
    handleUpstreamError(res, req, err, "ai-assistant-service");
  }
});

export default router;
