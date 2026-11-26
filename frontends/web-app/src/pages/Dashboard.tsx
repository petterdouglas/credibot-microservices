import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { webApi } from "../api/web";
import { Card, ErrorBox, Spinner, StatusBadge, brl } from "../components/ui";

export default function Dashboard() {
  const { data, error, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: webApi.dashboard });
  if (isLoading) return <Spinner />;
  if (error || !data) return <ErrorBox error={error} />;
  const loan = data.activeLoan;

  return (
    <>
      <h1 className="text-xl font-semibold">Olá, {data.customerName.split(" ")[0]}</h1>
      <Card title="Saldo da carteira">
        <p className="text-3xl font-bold">{brl(data.walletBalance)}</p>
      </Card>
      <Card title="Empréstimo atual">
        {loan ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">{brl(loan.amount)} <span className="text-sm text-slate-500">· taxa {loan.rate} a.m.</span></p>
              <p className="text-xs text-slate-500">Código {loan.id}</p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={loan.status} />
              <Link to={`/emprestimos/${loan.id}`} className="text-sm font-medium text-brand-700 underline">Acompanhar</Link>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-600">
            Você não tem empréstimo em andamento.{" "}
            <Link to="/emprestimos/novo" className="font-medium text-brand-700 underline">Pedir agora</Link>
          </p>
        )}
      </Card>
    </>
  );
}
