import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi, type CustomerRow } from "../api/admin";
import { Button, Card, ErrorBox, Spinner } from "../components/ui";

export default function Customers() {
  const qc = useQueryClient();
  const { data, error, isLoading } = useQuery({ queryKey: ["customers"], queryFn: adminApi.customers });
  const toggle = useMutation({
    mutationFn: (c: CustomerRow) => adminApi.setBlocked(c.id, !c.accountBlocked),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });

  return (
    <>
      <h1 className="text-xl font-semibold">Clientes</h1>
      <p className="text-sm text-slate-600">Com a conta bloqueada, o depósito do próximo empréstimo aprovado falha e a SAGA cancela o pedido (compensação).</p>
      <ErrorBox error={error ?? toggle.error} />
      <Card className="overflow-x-auto p-0">
        {isLoading ? <div className="p-5"><Spinner /></div> : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr><th className="px-4 py-2">Cliente</th><th className="px-4 py-2">E-mail</th><th className="px-4 py-2">KYC</th><th className="px-4 py-2">Conta</th><th className="px-4 py-2" /></tr>
            </thead>
            <tbody>
              {data?.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-2 font-medium">{c.name}</td>
                  <td className="px-4 py-2">{c.email}</td>
                  <td className="px-4 py-2">{c.kycStatus}</td>
                  <td className="px-4 py-2">{c.accountBlocked ? <span className="font-medium text-red-700">Bloqueada</span> : "Ativa"}</td>
                  <td className="px-4 py-2 text-right">
                    <Button variant={c.accountBlocked ? "ghost" : "danger"} disabled={toggle.isPending} onClick={() => toggle.mutate(c)}>
                      {c.accountBlocked ? "Desbloquear" : "Bloquear conta"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
