import { useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { webApi } from "../api/web";
import { Button, Card, ErrorBox, Spinner, StatusBadge, brl, dateTime } from "../components/ui";

const MAX_POLLS = 30; // 30 x 2s = 1 min; evita estourar o rate limit do gateway

const MESSAGES: Record<string, string> = {
  PROCESSANDO: "Estamos analisando seu pedido. Esta tela se atualiza sozinha.",
  APROVADO: "Pedido aprovado! O valor já está na sua carteira.",
  REJEITADO: "Não foi possível aprovar este pedido agora.",
  CANCELADO: "Este pedido foi cancelado.",
  CANCELADO_POR_ERRO: "Não conseguimos depositar o valor na sua conta. O pedido foi cancelado automaticamente.",
};

export default function LoanDetail() {
  const { id = "" } = useParams();
  const qc = useQueryClient();
  const polls = useRef(0);

  // Consistencia eventual (CQRS + SAGA): consulta de 2 em 2 s enquanto o status for PROCESSANDO
  const { data, error, isLoading } = useQuery({
    queryKey: ["loan", id],
    queryFn: () => { polls.current++; return webApi.getLoan(id); },
    refetchInterval: (q) => (q.state.data?.status === "PROCESSANDO" && polls.current < MAX_POLLS ? 2000 : false),
  });

  const cancel = useMutation({
    mutationFn: () => webApi.cancelLoan(id, "Cancelado pelo cliente"),
    onSuccess: (d) => { qc.setQueryData(["loan", id], d); qc.invalidateQueries({ queryKey: ["dashboard"] }); },
  });

  if (isLoading) return <Spinner />;
  if (error || !data) return <ErrorBox error={error} />;

  // HATEOAS: so mostra "Cancelar" se o servidor ofereceu o link; sem _links, cai na regra do status
  const canCancel = data._links ? !!data._links.cancel : data.status === "PROCESSANDO";
  const waiting = data.status === "PROCESSANDO";

  return (
    <>
      <h1 className="text-xl font-semibold">Pedido {data.loanId}</h1>
      <Card>
        <div className="mb-3 flex items-center gap-3">
          <StatusBadge status={data.status} />
          {waiting && polls.current < MAX_POLLS && <Spinner label="Atualizando…" />}
        </div>
        <p className="text-sm text-slate-700">{MESSAGES[data.status]}</p>
        {data.reason && !waiting && <p className="mt-2 text-sm text-slate-500">Motivo: {data.reason}</p>}
        {waiting && polls.current >= MAX_POLLS && (
          <Button variant="ghost" className="mt-3" onClick={() => { polls.current = 0; qc.invalidateQueries({ queryKey: ["loan", id] }); }}>
            Atualizar status
          </Button>
        )}
      </Card>
      <Card title="Detalhes">
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-slate-500">Valor</dt><dd>{brl(data.amount)}</dd>
          <dt className="text-slate-500">Parcelas</dt><dd>{data.installments}x</dd>
          <dt className="text-slate-500">Taxa</dt><dd>{data.rate} ao mês</dd>
          <dt className="text-slate-500">Solicitado em</dt><dd>{dateTime(data.createdAt)}</dd>
          <dt className="text-slate-500">Atualizado em</dt><dd>{dateTime(data.updatedAt)}</dd>
        </dl>
      </Card>
      <ErrorBox error={cancel.error} />
      <div className="flex gap-3">
        {canCancel && <Button variant="danger" disabled={cancel.isPending} onClick={() => cancel.mutate()}>Cancelar pedido</Button>}
        <Link to="/" className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-100">Voltar ao início</Link>
      </div>
    </>
  );
}
