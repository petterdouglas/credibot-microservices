import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { webApi } from "../api/web";
import { Button, Card, ErrorBox, Field, brl } from "../components/ui";

const MONTHLY_RATE = 0.025; // estimativa local (2,5% a.m. conforme contrato); a taxa oficial vem do backend

function pmt(principal: number, n: number) {
  return (principal * MONTHLY_RATE) / (1 - Math.pow(1 + MONTHLY_RATE, -n));
}

export default function NewLoan() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [amount, setAmount] = useState("500");
  const [installments, setInstallments] = useState("6");
  const a = Number(amount), n = Number(installments);
  const valid = a > 0 && n > 0;

  const m = useMutation({
    mutationFn: () => webApi.createLoan({ amount: a, installments: n }),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ["dashboard"] }); nav(`/emprestimos/${r.loanId}`); },
  });

  return (
    <>
      <h1 className="text-xl font-semibold">Pedir empréstimo</h1>
      <Card>
        <form onSubmit={(e: FormEvent) => { e.preventDefault(); m.mutate(); }} className="space-y-4">
          <Field label="Quanto você precisa? (R$)" type="number" min={1} step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Em quantas parcelas?</span>
            <select value={installments} onChange={(e) => setInstallments(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2">
              {[3, 6, 9, 12, 18, 24].map((x) => <option key={x} value={x}>{x}x</option>)}
            </select>
          </label>
          {valid && (
            <p className="rounded-md bg-brand-50 px-3 py-2 text-sm text-brand-700">
              Estimativa: {n}x de <strong>{brl(pmt(a, n))}</strong> (taxa de 2,5% ao mês). O valor final é confirmado após a análise.
            </p>
          )}
          <ErrorBox error={m.error} />
          <Button type="submit" disabled={!valid || m.isPending}>{m.isPending ? "Enviando…" : "Solicitar empréstimo"}</Button>
        </form>
      </Card>
    </>
  );
}
