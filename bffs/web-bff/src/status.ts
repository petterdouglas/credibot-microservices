export function translateStatus(status: string): string {
  const map: Record<string, string> = {
    PENDING: "PROCESSANDO",
    APPROVED: "APROVADO",
    REJECTED: "REJEITADO",
    CANCELED: "CANCELADO",
    CANCELED_DUE_TO_ERROR: "CANCELADO (FALHA NO DEPÓSITO)",
  };
  return map[status] ?? status;
}