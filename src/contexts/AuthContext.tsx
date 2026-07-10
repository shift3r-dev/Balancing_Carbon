import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { clearSession, ensureFreshSession, getStoredSession, safeFetchJson, saveSession } from '../services/apiClient.ts';

type Authorization = { organisationId: string; roles: string[]; permissions: string[] } | null;
type AuthContextValue = {
  session: any | null;
  user: any | null;
  authorization: Authorization;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  can: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<any | null>(() => getStoredSession());
  const [authorization, setAuthorization] = useState<Authorization>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const nextSession = await ensureFreshSession();
    setSession(nextSession);
    if (!nextSession) { setAuthorization(null); setLoading(false); return; }
    const me = await safeFetchJson('/api/auth/me', undefined, null);
    setAuthorization(me?.authorization ?? null);
    setLoading(false);
  };

  useEffect(() => { void refresh(); }, []);

  const logout = async () => {
    await safeFetchJson('/api/auth/logout', { method: 'POST' }, null);
    clearSession();
    setSession(null);
    setAuthorization(null);
  };

  const value = useMemo(() => ({ session, user: session?.user ?? null, authorization, loading, refresh, logout, can: (permission: string) => Boolean(authorization?.permissions.includes(permission)), hasRole: (role: string) => Boolean(authorization?.roles.includes(role)) }), [session, authorization, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
}

export const useCurrentUser = () => useAuth().user;
export const usePermissions = () => useAuth().authorization?.permissions ?? [];
export const useRole = (role: string) => useAuth().hasRole(role);
export const useOrganization = () => useAuth().authorization?.organisationId ?? useAuth().user?.organisationId ?? null;
export const useSession = () => useAuth().session;
export const useCan = (permission: string) => useAuth().can(permission);
