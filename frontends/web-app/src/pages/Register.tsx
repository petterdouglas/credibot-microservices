import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { webApi } from "../api/web";
import { Button, Card, ErrorBox, Field } from "../components/ui";

export default function Register() {
  const nav = useNavigate();
  const [f, setF] = useState({ name: "", cpf: "", email: "", password: "", monthlyIncome: "" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const m = useMutation({
    mutationFn: () => webApi.register({ ...f, monthlyIncome: Number(f.monthlyIncome) }),
    onSuccess: () => nav("/entrar"),
  });

  return (
    <div className="mx-auto mt-10 max-w-sm px-4 pb-10">
      <h1 className="mb-1 text-2xl font-bold text-brand-700">Criar conta</h1>
      <p className="mb-6 text-sm text-slate-600">Usamos seus dados para verificar sua identidade (KYC).</p>
      <Card>
        <form onSubmit={(e: FormEvent) => { e.preventDefault(); m.mutate(); }} className="space-y-4">
          <Field label="Nome completo" required value={f.name} onChange={set("name")} />
          <Field label="CPF" required inputMode="numeric" placeholder="000.000.000-00" value={f.cpf} onChange={set("cpf")} />
          <Field label="E-mail" type="email" required value={f.email} onChange={set("email")} />
          <Field label="Senha" type="password" required minLength={6} value={f.password} onChange={set("password")} />
          <Field label="Renda mensal (R$)" type="number" required min={0} step="0.01" value={f.monthlyIncome} onChange={set("monthlyIncome")} />
          <ErrorBox error={m.error} />
          <Button type="submit" disabled={m.isPending} className="w-full">{m.isPending ? "Criando…" : "Criar conta"}</Button>
        </form>
      </Card>
      <p className="mt-4 text-center text-sm"><Link to="/entrar" className="font-medium text-brand-700 underline">Já tenho conta</Link></p>
    </div>
  );
}
