import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "../api/admin";
import { Button, Card, ErrorBox, Spinner, StatusBadge, brl, dateTime } from "../components/ui";

const FILTERS = ["", "PENDING", "APPROVED", "REJECTED", "CANCELED", "CANCELED_DUE_TO_ERROR"];

export default function Loans() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  // Le o read model (CQRS). Atualiza a cada 5 s para a demo mostrar a escrita refletida.
  const { data, error, isLoading } = useQuery({
    queryKey: ["loans", status, page],
    queryFn: () => adminApi.loans(status, page),
    refetchInterval: 5000,
  });

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Empréstimos</h1>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" aria-label="Filtrar por status">
          {FILTERS.map((f) => <option key={f} value={f}>{f || "Todos os status"}</option>)}
        </select>
      </div>
      <ErrorBox error={error} />
      <Card className="overflow-x-auto p-0">
        {isLoading ? <div className="p-5"><Spinner /></div> : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr><th className="px-4 py-2">Código</th><th className="px-4 py-2">Cliente</th><th className="px-4 py-2">Valor</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">Criado em</th></tr>
            </thead>
            <tbody>
              {data?.content.map((l) => (
                <tr key={l.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2"><Link className="font-medium text-brand-700 underline" to={`/emprestimos/${l.id}`}>{l.id}</Link></td>
                  <td className="px-4 py-2">{l.customerName}</td>
                  <td className="px-4 py-2">{brl(l.amount)}</td>
                  <td className="px-4 py-2"><StatusBadge status={l.status} raw /></td>
                  <td className="px-4 py-2">{dateTime(l.createdAt)}</td>
                </tr>
              ))}
              {data?.content.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500">Nenhum empréstimo para este filtro.</td></tr>}
            </tbody>
          </table>
        )}
      </Card>
      {data && data.totalPages > 1 && (
        <div className="flex items-center gap-3 text-sm">
          <Button variant="ghost" disabled={page === 0} onClick={() => setPage(page - 1)}>Anterior</Button>
          <span>Página {data.page + 1} de {data.totalPages}</span>
          <Button variant="ghost" disabled={page + 1 >= data.totalPages} onClick={() => setPage(page + 1)}>Próxima</Button>
        </div>
      )}
    </>
  );
}
