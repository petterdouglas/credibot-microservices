import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

export const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const dateTime = (iso?: string) => (iso ? new Date(iso).toLocaleString("pt-BR") : "—");

export function Button({ variant = "primary", className = "", ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  const styles = {
    primary: "bg-brand-600 text-white hover:bg-brand-700",
    ghost: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100",
    danger: "bg-red-600 text-white hover:bg-red-700",
  }[variant];
  return (
    <button
      {...p}
      className={`rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
    />
  );
}

export function Field({ label, ...p }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      <input {...p} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/30" />
    </label>
  );
}

export function Card({ title, children, className = "" }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-slate-200 bg-white p-5 ${className}`}>
      {title && <h2 className="mb-3 text-base font-semibold">{title}</h2>}
      {children}
    </section>
  );
}

export function ErrorBox({ error }: { error: unknown }) {
  if (!error) return null;
  const msg = error instanceof Error ? error.message : "Erro inesperado.";
  return <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{msg}</p>;
}

export function Spinner({ label = "Carregando…" }: { label?: string }) {
  return (
    <p role="status" className="flex items-center gap-2 text-sm text-slate-500">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
      {label}
    </p>
  );
}

const STATUS: Record<string, { label: string; cls: string }> = {
  PROCESSANDO: { label: "Em análise", cls: "bg-amber-100 text-amber-800" },
  APROVADO: { label: "Aprovado", cls: "bg-emerald-100 text-emerald-800" },
  REJEITADO: { label: "Rejeitado", cls: "bg-red-100 text-red-800" },
  CANCELADO: { label: "Cancelado", cls: "bg-slate-200 text-slate-700" },
  CANCELADO_POR_ERRO: { label: "Cancelado por erro", cls: "bg-orange-100 text-orange-800" },
};
const RAW_TO_BFF: Record<string, string> = {
  PENDING: "PROCESSANDO", APPROVED: "APROVADO", REJECTED: "REJEITADO",
  CANCELED: "CANCELADO", CANCELED_DUE_TO_ERROR: "CANCELADO_POR_ERRO",
};
// raw=true mostra o enum do servico (Admin); sem raw, o texto amigavel do Web BFF
export function StatusBadge({ status, raw = false }: { status: string; raw?: boolean }) {
  const s = STATUS[RAW_TO_BFF[status] ?? status] ?? { label: status, cls: "bg-slate-100 text-slate-700" };
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>{raw ? status : s.label}</span>;
}
