import { useState } from 'react';
import { Eye, Search, Users, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useImpersonation, type ImpersonatedUser } from '@/contexts/ImpersonationContext';
import { useAuth } from '@/contexts/AuthContext';
import { useDebounce } from '@/hooks/useDebounce';

interface ProfileRow {
  id: string;
  email: string | null;
  full_name: string | null;
  company_id: string | null;
}

export function ImpersonationSelector() {
  const { isSuperAdmin } = useAuth();
  const { startImpersonation, isImpersonating } = useImpersonation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  // Fetch profiles with their roles
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['impersonation_users', debouncedSearch],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('id, email, full_name, company_id')
        .order('full_name');

      if (debouncedSearch) {
        query = query.or(`full_name.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%`);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;

      // Get roles for these users
      const userIds = (data ?? []).map(u => u.id);
      if (userIds.length === 0) return [];

      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);

      const roleMap = new Map((roles ?? []).map(r => [r.user_id, r.role]));

      // Get company names
      const companyIds = [...new Set((data ?? []).map(u => u.company_id).filter(Boolean))];
      let companyMap = new Map<string, string>();
      if (companyIds.length > 0) {
        const { data: companies } = await supabase
          .from('companies')
          .select('id, name')
          .in('id', companyIds);
        companyMap = new Map((companies ?? []).map(c => [c.id, c.name]));
      }

      return (data ?? []).map(u => ({
        ...u,
        role: roleMap.get(u.id) || 'employee',
        companyName: u.company_id ? companyMap.get(u.company_id) : undefined,
      }));
    },
    enabled: open && isSuperAdmin,
  });

  if (!isSuperAdmin) return null;

  const handleSelect = (user: typeof users[0]) => {
    startImpersonation({
      id: user.id,
      name: user.full_name || user.email || 'Unknown',
      email: user.email || '',
      role: user.role as ImpersonatedUser['role'],
      companyId: user.company_id,
      companyName: user.companyName,
    });
    setOpen(false);
    setSearch('');
  };

  const clientAdmins = users.filter(u => u.role === 'client_admin');
  const employees = users.filter(u => u.role === 'employee');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={isImpersonating ? 'secondary' : 'ghost'}
          size="sm"
          className="gap-1.5 text-xs text-muted-foreground"
        >
          <Eye className="h-3.5 w-3.5" />
          View As
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            View As Another User
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>

        <Tabs defaultValue="admins" className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="admins" className="gap-1.5 flex-1">
              <Building2 className="h-3.5 w-3.5" />
              Client Admins ({clientAdmins.length})
            </TabsTrigger>
            <TabsTrigger value="employees" className="gap-1.5 flex-1">
              <Users className="h-3.5 w-3.5" />
              Employees ({employees.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="admins" className="max-h-72 overflow-y-auto space-y-1 mt-2">
            {clientAdmins.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                {isLoading ? 'Loading...' : 'No client admins found'}
              </p>
            )}
            {clientAdmins.map(user => (
              <UserRow key={user.id} user={user} onSelect={handleSelect} />
            ))}
          </TabsContent>

          <TabsContent value="employees" className="max-h-72 overflow-y-auto space-y-1 mt-2">
            {employees.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                {isLoading ? 'Loading...' : 'No employees found'}
              </p>
            )}
            {employees.map(user => (
              <UserRow key={user.id} user={user} onSelect={handleSelect} />
            ))}
          </TabsContent>
        </Tabs>

        <p className="text-xs text-muted-foreground mt-2">
          This simulates the selected user's view. Your admin access is preserved — no actual sign-in occurs.
        </p>
      </DialogContent>
    </Dialog>
  );
}

function UserRow({ user, onSelect }: { user: any; onSelect: (u: any) => void }) {
  const roleLabel = user.role === 'client_admin' ? 'Client Admin' : user.role === 'super_admin' ? 'Super Admin' : 'Employee';
  return (
    <button
      className="w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-left hover:bg-muted/60 transition-colors"
      onClick={() => onSelect(user)}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary shrink-0">
        {(user.full_name || user.email || '??').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{user.full_name || user.email}</p>
        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <Badge variant="secondary" className="text-[10px]">{roleLabel}</Badge>
        {user.companyName && (
          <span className="text-[10px] text-muted-foreground">{user.companyName}</span>
        )}
      </div>
    </button>
  );
}
