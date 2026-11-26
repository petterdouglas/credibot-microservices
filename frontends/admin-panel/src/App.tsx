import { NavLink, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { RequireAuth, useAuth } from "./auth";
import Login from "./pages/Login";
import Loans from "./pages/Loans";
import LoanAuditPage from "./pages/LoanAudit";
import Customers from "./pages/Customers";

function Layout() {
  const { profile, logout } = useAuth();
  const link = ({ isActive }: { isActive: boolean }) =>
    `rounded-md px-3 py-1.5 text-sm ${isActive ? "bg-brand-50 font-semibold text-brand-700" : "text-slate-600 hover:bg-slate-100"}`;
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <span className="font-bold text-brand-700">CrediBot · Mesa de crédito</span>
          <nav className="flex items-center gap-1">
            <NavLink to="/emprestimos" className={link}>Empréstimos</NavLink>
            <NavLink to="/clientes" className={link}>Clientes</NavLink>
            <button onClick={logout} className="rounded-md px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100">
              Sair ({profile?.name})
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl space-y-4 px-4 py-6"><Outlet /></main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/entrar" element={<Login />} />
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route path="/emprestimos" element={<Loans />} />
        <Route path="/emprestimos/:id" element={<LoanAuditPage />} />
        <Route path="/clientes" element={<Customers />} />
      </Route>
      <Route path="*" element={<Navigate to="/emprestimos" replace />} />
    </Routes>
  );
}
