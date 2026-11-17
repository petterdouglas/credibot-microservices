// ============================================================================
// CrediBot Admin BFF — Entrada da aplicação
// Backend for Frontend do painel administrativo (analistas de crédito).
// Escuta na porta configurada via env PORT (padrão: 3002).
// ============================================================================
import express, { Request, Response, NextFunction } from "express";
import loansRouter from "./routes/loans.js";

const app = express();
const port = Number(process.env.PORT ?? 3002);

// ---------------------------------------------------------------------------
// Middlewares globais
// ---------------------------------------------------------------------------
app.use(express.json({ limit: "1mb" }));
app.disable("x-powered-by");

// ---------------------------------------------------------------------------
// Health check — sem autenticação, sem dependência de upstream
// ---------------------------------------------------------------------------
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "UP", service: "admin-bff" });
});

// ---------------------------------------------------------------------------
// Rotas administrativas (contratos seção 6.2 de contratos_rotas.pdf)
//
// O Nginx remove o prefixo /admin antes de encaminhar para cá, portanto
// as rotas são registradas SEM o prefixo /admin.
// ---------------------------------------------------------------------------
app.use("/loans", loansRouter);

// ---------------------------------------------------------------------------
// 404 — rota não encontrada
// ---------------------------------------------------------------------------
app.use((req: Request, res: Response) => {
  res.status(404).json({
    type: "https://credibot.com.br/errors/not-found",
    title: "Not Found",
    status: 404,
    detail: `Rota '${req.method} ${req.path}' não existe neste serviço administrativo.`,
    instance: req.path,
    timestamp: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------------------
// Handler global de erros não tratados
// ---------------------------------------------------------------------------
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error("[admin-bff] unhandled error:", err);
  res.status(500).json({
    type: "https://credibot.com.br/errors/internal-server-error",
    title: "Internal Server Error",
    status: 500,
    detail: "Ocorreu um erro inesperado. Tente novamente em instantes.",
    instance: req.path,
    timestamp: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
app.listen(port, "0.0.0.0", () => {
  console.log(`[admin-bff] listening on 0.0.0.0:${port}`);
  console.log(`[admin-bff] LOAN_SERVICE_URL      = ${process.env.LOAN_SERVICE_URL ?? "(not set)"}`);
  console.log(`[admin-bff] CUSTOMER_SERVICE_URL  = ${process.env.CUSTOMER_SERVICE_URL ?? "(not set)"}`);
  console.log(`[admin-bff] CREDIT_ANALYSIS_URL   = ${process.env.CREDIT_ANALYSIS_URL ?? "(not set)"}`);
});
