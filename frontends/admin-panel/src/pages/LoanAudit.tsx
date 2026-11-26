import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../api/admin";
import { useAuth } from "../auth";
import { Button, Card, ErrorBox, Spinner, brl } from "../components/ui";

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return <><dt className="text-slate-500">{k}</dt><dd>{v}</dd></>;
}

export default function LoanAuditPage() {
  const { id = "" } = useParams();
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [justification, setJustification] = useState("");
  const { data, error, isLoading } = useQuery({ queryKey: ["audit", id], queryFn: () => adminApi.audit(id) });

  const review = useMutation({
    mutationFn: () => adminApi.review(id, { decision: "MANUALLY_APPROVED", officerId: profile?.officerId ?? "EMP-000", justification }),
    onSuccess: () => { setJustification(""); qc.invalidateQueries({ queryKey: ["audit", id] }); qc.invalidateQueries({ queryKey: ["loans"] }); },
  });

  if (isLoading) return <Spinner />;
  if (error || !data) return <ErrorBox error={error} />;
  const { customer: c, creditAnalysis: a, financials: f } = data;

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Auditoria · {data.loanId}</h1>
        <Link to="/emprestimos" className="text-sm font-medium text-brand-700 underline">Voltar à lista</Link>
      </div>
      <p className="text-sm text-slate-600">Dados sensíveis visíveis apenas nesta mesa. O app do cliente nunca recebe CPF, renda nem score.</p>
      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Cliente"><dl className="grid grid-cols-2 gap-y-2 text-sm">
          <Row k="Nome" v={c.name} /><Row k="CPF" v={c.cpf} /><Row k="Renda mensal" v={brl(c.monthlyIncome)} /><Row k="KYC" v={c.kycStatus} />
        </dl></Card>
        <Card title="Análise de crédito"><dl className="grid grid-cols-2 gap-y-2 text-sm">
          <Row k="Score de risco" v={<strong>{a.riskScore}</strong>} /><Row k="Modelo" v={a.modelVersion} /><Row k="Decisão" v={a.decision} /><Row k="Motivo" v={a.approvalReason} />
        </dl></Card>
        <Card title="Financeiro"><dl className="grid grid-cols-2 gap-y-2 text-sm">
          <Row k="Valor pedido" v={brl(f.requestedAmount)} /><Row k="Taxa aplicada" v={f.appliedInterestRate} /><Row k="Depósito" v={f.depositStatus} />
        </dl></Card>
      </div>
      <Card title="Decisão manual">
        <form onSubmit={(e: FormEvent) => { e.preventDefault(); review.mutate(); }} className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Justificativa</span>
            <textarea required rows={3} value={justification} onChange={(e) => setJustification(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/30" />
          </label>
          <ErrorBox error={review.error} />
          {review.isSuccess && <p role="status" className="text-sm text-emerald-700">Aprovação manual registrada por {review.data.reviewedBy}.</p>}
          <Button type="submit" disabled={review.isPending || !justification.trim()}>Aprovar manualmente</Button>
        </form>
      </Card>
    </>
  );
}
