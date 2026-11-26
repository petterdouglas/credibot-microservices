import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { Button, Card, ErrorBox, Field } from "../components/ui";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? "/emprestimos";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(undefined);
    try { await login(email, password); nav(from, { replace: true }); }
    catch (err) { setError(err); }
    finally { setBusy(false); }
  }

  return (
    <div className="mx-auto mt-16 max-w-sm px-4">
      <h1 className="mb-1 text-2xl font-bold text-brand-700">CrediBot · Mesa de crédito</h1>
      <p className="mb-6 text-sm text-slate-600">Acesso restrito a analistas.</p>
      <Card>
        <form onSubmit={submit} className="space-y-4">
          <Field label="E-mail corporativo" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Field label="Senha" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <ErrorBox error={error} />
          <Button type="submit" disabled={busy} className="w-full">{busy ? "Entrando…" : "Entrar"}</Button>
        </form>
      </Card>
    </div>
  );
}
