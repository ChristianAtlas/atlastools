import { createContext, useContext, useState, ReactNode } from 'react';
import type { AppRole } from '@/contexts/AuthContext';

export interface ImpersonatedUser {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  companyId: string | null;
  companyName?: string;
}

interface ImpersonationContextType {
  impersonating: ImpersonatedUser | null;
  startImpersonation: (user: ImpersonatedUser) => void;
  stopImpersonation: () => void;
  /** The effective role — impersonated role or real role */
  effectiveRole: AppRole | null;
  /** The effective company_id for data filtering */
  effectiveCompanyId: string | null;
  isImpersonating: boolean;
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

export function ImpersonationProvider({ children, realRole }: { children: ReactNode; realRole: AppRole | null }) {
  const [impersonating, setImpersonating] = useState<ImpersonatedUser | null>(null);

  const startImpersonation = (user: ImpersonatedUser) => {
    setImpersonating(user);
  };

  const stopImpersonation = () => {
    setImpersonating(null);
  };

  return (
    <ImpersonationContext.Provider
      value={{
        impersonating,
        startImpersonation,
        stopImpersonation,
        effectiveRole: impersonating ? impersonating.role : realRole,
        effectiveCompanyId: impersonating ? impersonating.companyId : null,
        isImpersonating: !!impersonating,
      }}
    >
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  const ctx = useContext(ImpersonationContext);
  if (!ctx) throw new Error('useImpersonation must be used within ImpersonationProvider');
  return ctx;
}
