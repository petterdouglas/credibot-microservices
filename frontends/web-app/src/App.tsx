import { NavLink, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { RequireAuth, useAuth } from "./auth";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import NewLoan from "./pages/NewLoan";
import LoanDetail from "./pages/LoanDetail";
import Assistant from "./pages/Assistant";

function Layout() {
  const { profile, logout } = useAuth();
  const link = ({ isActive }: { isActive: boolean }) =>
    `rounded-md px-3 py-1.5 text-sm ${isActive ? "bg-brand-50 font-semibold text-brand-700" : "text-slate-600 hover:bg-slate-100"}`;
  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 pb-10">
      <header className="flex flex-wrap items-center justify-between gap-2 py-4">
        <span className="text-lg font-bold text-brand-700">CrediBot</span>
        <nav className="flex flex-wrap items-center gap-1">
          <NavLink to="/" end className={link}>Início</NavLink>
          <NavLink to="/emprestimos/novo" className={link}>Pedir empréstimo</NavLink>
          <NavLink to="/assistente" className={link}>Assistente</NavLink>
          <button onClick={logout} className="rounded-md px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100">
            Sair ({profile?.name.split(" ")[0]})
          </button>
        </nav>
      </header>
      <main className="space-y-4"><Outlet /></main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/entrar" element={<Login />} />
      <Route path="/cadastro" element={<Register />} />
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/emprestimos/novo" element={<NewLoan />} />
        <Route path="/emprestimos/:id" element={<LoanDetail />} />
        <Route path="/assistente" element={<Assistant />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
