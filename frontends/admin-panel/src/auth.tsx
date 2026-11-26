import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { http, session } from "./api/http";

// PROPOSTA: o contrato ainda nao define o login. Ajustar quando o grupo decidir.
export interface LoginResponse { token: string; name: string; officerId?: string }
export interface Profile { name: string; officerId?: string }

interface AuthCtx {
  profile: Profile | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}
const Ctx = createContext<AuthCtx>(null!);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(() => (session.token() ? session.profile<Profile>() : null));

  useEffect(() => {
    const onUnauthorized = () => setProfile(null);
    window.addEventListener("credibot:unauthorized", onUnauthorized);
    return () => window.removeEventListener("credibot:unauthorized", onUnauthorized);
  }, []);

  async function login(email: string, password: string) {
    const res = await http.post<LoginResponse>("/auth/login", { email, password });
    const p = { name: res.name, officerId: res.officerId };
    session.save(res.token, p);
    setProfile(p);
  }
  function logout() { session.clear(); setProfile(null); }

  return <Ctx.Provider value={{ profile, login, logout }}>{children}</Ctx.Provider>;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const location = useLocation();
  if (!profile) return <Navigate to="/entrar" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}
